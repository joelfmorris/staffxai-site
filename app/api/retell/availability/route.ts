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

  const match = signature.match(/^v=(\d+),d=(.*)$/);
  if (!match) return false;

  const [, timestamp, digest] = match;

  // Replay protection — reject signatures older or newer than 5 minutes
  if (Math.abs(Date.now() - Number(timestamp)) > 5 * 60 * 1000) return false;

  const expected = createHmac('sha256', apiKey)
    .update(rawBody + timestamp)
    .digest('hex');

  try {
    const eBuf = Buffer.from(expected, 'hex');
    const dBuf = Buffer.from(digest, 'hex');
    if (eBuf.length !== dBuf.length) return false;
    return timingSafeEqual(eBuf, dBuf);
  } catch {
    return false;
  }
}

// ── Calendly ──────────────────────────────────────────────────

interface CalendlySlot {
  start_time: string;
  label: string;
}

const TZ = 'Australia/Melbourne';

// "2026-07-27" key in Melbourne time (en-CA locale gives YYYY-MM-DD)
function melbourneDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
}

function melbourneHour(iso: string): number {
  return parseInt(
    new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', hour12: false, timeZone: TZ }),
    10,
  );
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function formatSlotHuman(iso: string): string {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString('en-AU', { weekday: 'long', timeZone: TZ });
  const day = parseInt(d.toLocaleDateString('en-AU', { day: 'numeric', timeZone: TZ }), 10);
  // "10:00 am" → "10am";  "2:30 pm" → "2:30pm"
  const rawTime = d.toLocaleTimeString('en-AU', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ,
  });
  const time = rawTime.toLowerCase().replace(':00 ', ' ').replace(' ', '');
  return `${weekday} the ${ordinal(day)} at ${time}`;
}

function slotsToHuman(slots: CalendlySlot[]): string {
  const parts = slots.map(s => formatSlotHuman(s.start_time));
  if (parts.length === 0) return 'no times available right now';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} or ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, or ${parts[parts.length - 1]}`;
}

// Pick `count` slots spread across different days, alternating morning/afternoon preference.
// Falls back to the widest spread available if fewer than `count` distinct days exist.
function pickSpreadSlots(
  raw: Array<{ start_time: string; invitees_remaining: number }>,
  count: number,
): string[] {
  // Group available slots by Melbourne calendar date, capturing first morning + first afternoon
  const byDay = new Map<string, { morning: string | null; afternoon: string | null }>();
  for (const s of raw) {
    if (s.invitees_remaining <= 0) continue;
    const key = melbourneDateKey(s.start_time);
    if (!byDay.has(key)) byDay.set(key, { morning: null, afternoon: null });
    const day = byDay.get(key)!;
    const hour = melbourneHour(s.start_time);
    if (hour < 12  && !day.morning)   day.morning   = s.start_time;
    if (hour >= 12 && !day.afternoon) day.afternoon = s.start_time;
  }

  // Chronological order
  const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));

  const picked: string[] = [];
  let preferMorning = true;

  for (const [, day] of days) {
    if (picked.length >= count) break;
    const chosen = preferMorning
      ? (day.morning ?? day.afternoon)
      : (day.afternoon ?? day.morning);
    if (chosen) {
      picked.push(chosen);
      preferMorning = !preferMorning;
    }
  }

  return picked;
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

  // Fetch all slots in the next 14 days — Calendly returns every available time
  // in the window, so we get a full pool to pick from rather than slicing the first N.
  const startTime = new Date(Date.now() + 60_000).toISOString();
  const endTime   = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const url = new URL('https://api.calendly.com/event_type_available_times');
  url.searchParams.set('event_type', eventTypeUri);
  url.searchParams.set('start_time', startTime);
  url.searchParams.set('end_time', endTime);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendly API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as {
    collection?: Array<{ start_time: string; invitees_remaining: number }>;
  };

  const spread = pickSpreadSlots(data.collection ?? [], count);

  return spread.map(iso => ({
    start_time: iso,
    label: new Date(iso).toLocaleString('en-AU', {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: 'numeric', minute: '2-digit', hour12: true,
      timeZone: TZ,
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
