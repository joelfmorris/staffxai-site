// app/api/retell/availability/route.ts
//
// GET — returns next available Calendly consultation slots for Retell AI to speak aloud.
// Called mid-call as a custom function. Retell reads slots_human verbatim.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';

// ── Supabase ──────────────────────────────────────────────────

function makeSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ── Retell signature verification ─────────────────────────────
// retell-sdk v5 does not expose a static verify() — we use HMAC-SHA256 directly.
// Retell signs the raw request body with the account API key.
// For GET requests there is no body, so we sign the empty string.

function verifyRetellSignature(rawBody: string, signature: string): boolean {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    console.warn('[retell/availability] RETELL_API_KEY not set — skipping signature verification');
    return true;
  }
  if (!signature) return false;
  try {
    const expected = createHmac('sha256', apiKey).update(rawBody).digest('hex');
    const eBuf = Buffer.from(expected, 'hex');
    const sBuf = Buffer.from(signature, 'hex');
    if (eBuf.length !== sBuf.length) return false;
    return timingSafeEqual(eBuf, sBuf);
  } catch {
    return false;
  }
}

// ── Calendly ──────────────────────────────────────────────────

interface CalendlySlot {
  start_time: string;
  label: string;
}

function formatSlotHuman(isoString: string): string {
  const d = new Date(isoString);
  const weekday = d.toLocaleDateString('en-AU', {
    weekday: 'long',
    timeZone: 'Australia/Melbourne',
  });
  // "10:00 am" → "10am"; "2:30 pm" → "2:30pm"
  const rawTime = d.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Australia/Melbourne',
  });
  const time = rawTime
    .toLowerCase()
    .replace(':00 ', ' ')
    .replace(' ', '');
  return `${weekday} at ${time}`;
}

function slotsToHuman(slots: CalendlySlot[]): string {
  const parts = slots.map(s => formatSlotHuman(s.start_time));
  if (parts.length === 0) return 'no times available right now';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} or ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, or ${parts[parts.length - 1]}`;
}

async function getCalendlySlots(count: number): Promise<CalendlySlot[]> {
  const eventTypeUri = process.env.CALENDLY_EVENT_TYPE_URI;
  const token = process.env.CALENDLY_API_TOKEN;

  if (!eventTypeUri || eventTypeUri === 'placeholder') {
    throw new Error('CALENDLY_EVENT_TYPE_URI not configured');
  }
  if (!token || token === 'placeholder') {
    throw new Error('CALENDLY_API_TOKEN not configured');
  }

  // Search 14 days ahead; start must be strictly in the future per Calendly API
  const startTime = new Date(Date.now() + 60_000).toISOString();
  const endTime = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const url = new URL('https://api.calendly.com/event_type_available_times');
  url.searchParams.set('event_type', eventTypeUri);
  url.searchParams.set('start_time', startTime);
  url.searchParams.set('end_time', endTime);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendly API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as {
    collection?: Array<{ start_time: string; invitees_remaining: number }>;
  };

  return (data.collection ?? [])
    .filter(s => s.invitees_remaining > 0)
    .slice(0, count)
    .map(s => ({
      start_time: s.start_time,
      label: new Date(s.start_time).toLocaleString('en-AU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Australia/Melbourne',
      }),
    }));
}

// ── agent_runs logger ─────────────────────────────────────────

async function logRun(
  db: ReturnType<typeof makeSupabase>,
  input: object,
  output: object,
) {
  const ts = new Date().toISOString();
  const { error } = await db.from('agent_runs').insert({
    agent_name:   'retell',
    status:       'success',
    input:        { source: 'retell', action: 'availability', ...input },
    output,
    duration_ms:  0,
    started_at:   ts,
    completed_at: ts,
  });
  if (error) console.warn('[retell/availability] agent_runs log failed:', error.message);
}

// ── Handler ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const signature = req.headers.get('x-retell-signature') ?? '';

  // GET has no body — sign the empty string as rawBody
  if (!verifyRetellSignature('', signature)) {
    return NextResponse.json({ error: 'Invalid Retell signature' }, { status: 401 });
  }

  const count = Math.min(
    parseInt(req.nextUrl.searchParams.get('count') ?? '3', 10),
    5,
  );

  const db = makeSupabase();
  const t0 = Date.now();

  try {
    const slots = await getCalendlySlots(count);
    const slots_human = slotsToHuman(slots);

    await logRun(db, { count }, { slots, slots_human, duration_ms: Date.now() - t0 });

    return NextResponse.json({ slots_human, slots });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[retell/availability]', message);
    // Don't log failed runs to avoid noisy agent_runs; caller gets error details
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
