// lib/dental-outbound.ts
//
// Shared outbound-call logic used by:
//   app/api/dental-enquiry/route.ts   — fires on every new web enquiry
//   app/api/retell/trigger-test/route.ts — manual test trigger

import { createClient } from '@supabase/supabase-js';

export function makeSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
export type Supabase = ReturnType<typeof makeSupabase>;

export function normaliseAU(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  if (digits.startsWith('61')) return '+' + digits;
  if (digits.startsWith('0'))  return '+61' + digits.slice(1);
  return '+61' + digits;
}

// Validates an Australian mobile — must normalise to +614xxxxxxxx (9 digits after +614)
export function isAUMobile(mobile: string): boolean {
  return /^\+614\d{8}$/.test(normaliseAU(mobile));
}

// ── Calling-hours window (single source of truth) ────────────
//
// Change only here — isMelbourneBusinessHours, clampToMelbourneWindow,
// and triggerOutboundCall all derive from these four values.

export const CALL_WINDOW = {
  open:  { hour: 8,  minute: 0  },   // 8:00am Melbourne
  close: { hour: 18, minute: 30 },   // 6:30pm Melbourne
} as const;

// ── Melbourne time helpers ────────────────────────────────────

// Single Intl call returns both hour and minute — avoids two round-trips.
// Uses Intl so AEST/AEDT is handled correctly by the IANA tz database.
function melbourneHM(dt: Date = new Date()): { h: number; m: number } {
  const parts = new Intl.DateTimeFormat('en-AU', {
    hour: 'numeric', minute: '2-digit', hour12: false,
    timeZone: 'Australia/Melbourne',
  }).formatToParts(dt);
  return {
    h: parseInt(parts.find(p => p.type === 'hour')?.value   ?? '0', 10),
    m: parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10),
  };
}

function isInWindow(h: number, m: number): boolean {
  const totalMins = h * 60 + m;
  const openMins  = CALL_WINDOW.open.hour  * 60 + CALL_WINDOW.open.minute;
  const closeMins = CALL_WINDOW.close.hour * 60 + CALL_WINDOW.close.minute;
  return totalMins >= openMins && totalMins < closeMins;
}

export function isMelbourneBusinessHours(): boolean {
  const { h, m } = melbourneHM();
  return isInWindow(h, m);
}

// Constructs the UTC Date for the window-open time (CALL_WINDOW.open) on the
// given YYYY-MM-DD key. Tries AEDT (+11) then AEST (+10) and keeps whichever
// actually lands on the correct Melbourne hour:minute.
function windowOpenMelbourne(dateKey: string): Date {
  const hh = String(CALL_WINDOW.open.hour).padStart(2, '0');
  const mm  = String(CALL_WINDOW.open.minute).padStart(2, '0');
  for (const offset of ['+11:00', '+10:00']) {
    const candidate = new Date(`${dateKey}T${hh}:${mm}:00${offset}`);
    const { h, m } = melbourneHM(candidate);
    if (h === CALL_WINDOW.open.hour && m === CALL_WINDOW.open.minute) return candidate;
  }
  return new Date(`${dateKey}T${hh}:${mm}:00+10:00`);
}

// Clamps dt into the calling-hours window.
// Before open → same-day window open. After close → next-day window open.
export function clampToMelbourneWindow(dt: Date): Date {
  const { h, m } = melbourneHM(dt);
  if (isInWindow(h, m)) return dt;
  const dateKey   = dt.toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' });
  const totalMins = h * 60 + m;
  const closeMins = CALL_WINDOW.close.hour * 60 + CALL_WINDOW.close.minute;
  if (totalMins >= closeMins) {
    // After closing → advance to next-day opening
    const base = new Date(`${dateKey}T12:00:00Z`);
    base.setUTCDate(base.getUTCDate() + 1);
    return windowOpenMelbourne(base.toISOString().slice(0, 10));
  }
  // Before opening → same-day opening
  return windowOpenMelbourne(dateKey);
}

// Retry ladder: given the number of calls made so far, returns when to schedule the next.
// 1 attempt → +8h | 2 → +24h | 3 → +72h | ≥4 → null (exhausted).
// All times clamped to the calling-hours window.
export function nextCallAt(attempts: number, from: Date = new Date()): Date | null {
  const hoursMap: Record<number, number> = { 1: 8, 2: 24, 3: 72 };
  const hours = hoursMap[attempts];
  if (hours === undefined) return null;
  return clampToMelbourneWindow(new Date(from.getTime() + hours * 3_600_000));
}

// ── SMS via Twilio ────────────────────────────────────────────

export async function sendSMS(to: string, body: string): Promise<boolean> {
  const sid  = process.env.TWILIO_SID;
  const auth = process.env.TWILIO_AUTH;
  const from = process.env.TWILIO_FROM;
  const missing = !sid || sid === 'placeholder' || !auth || auth === 'placeholder' || !from || from === 'placeholder';
  if (missing) {
    const masked = normaliseAU(to).replace(/(\+\d{4})\d+(\d{3})$/, '$1 *** $2');
    console.log(`[dental-outbound] SMS dry-run → ${masked}\n  "${body}"`);
    return false;
  }
  const twilio = (await import('twilio')).default;
  const client = twilio(sid!, auth!);
  await client.messages.create({ from: from!, to: normaliseAU(to), body });
  return true;
}

export interface LeadRef {
  id:                 string;
  mobile:             string;
  first_name:         string;
  treatment_interest: string | null | undefined;
  timeline:           string | null | undefined;
  email:              string | null | undefined;
  call_attempts?:     number;
}

export interface OutboundOpts {
  forceHours?: boolean;  // bypass calling-hours gate (test/backfill use only)
}

export async function triggerOutboundCall(
  supabase: Supabase,
  lead: LeadRef,
  opts: OutboundOpts = {},
): Promise<{ outcome: string; notes: string }> {
  const norm = normaliseAU(lead.mobile);
  const ts   = new Date().toISOString();

  console.log(`[dental-outbound] start — lead_id=${lead.id} mobile=${norm}`);

  async function logRun(status: 'success' | 'failed' | 'skipped', notes: string) {
    try {
      const { error } = await supabase.from('agent_runs').insert({
        agent_name:   'retell',
        status,
        input: {
          source:    'retell',
          action:    'outbound_trigger',
          lead_id:   lead.id,
          client_id: 'cranbourne-demo',
        },
        output:       { notes },
        duration_ms:  0,
        started_at:   ts,
        completed_at: ts,
      });
      if (error) console.warn('[dental-outbound] agent_runs log failed:', error.message);
    } catch (e: unknown) {
      console.warn('[dental-outbound] agent_runs log threw:', e instanceof Error ? e.message : e);
    }
  }

  async function updateLead(fields: Record<string, unknown>) {
    try {
      const { error } = await supabase
        .from('dental_enquiries')
        .update({ ...fields, updated_at: ts })
        .eq('id', lead.id);
      if (error) console.warn('[dental-outbound] lead update failed:', error.message);
    } catch (e: unknown) {
      console.warn('[dental-outbound] lead update threw:', e instanceof Error ? e.message : e);
    }
  }

  // ── DNC check ──────────────────────────────────────────────
  console.log(`[dental-outbound] checking DNC for ${norm}`);
  try {
    const { data: dnc, error: dncErr } = await supabase
      .from('do_not_contact')
      .select('reason')
      .eq('mobile', norm)
      .maybeSingle();

    if (dncErr) console.warn('[dental-outbound] DNC query error:', dncErr.message);

    if (dnc) {
      const reason = (dnc as { reason: string }).reason;
      console.log(`[dental-outbound] call skipped — DNC (${reason})`);
      await updateLead({ status: 'suppressed', sequence_status: 'suppressed' });
      await logRun('skipped', `DNC: ${reason}`);
      return { outcome: 'suppressed', notes: `DNC: ${reason}` };
    }

    console.log('[dental-outbound] DNC clear');
  } catch (e: unknown) {
    // Fail open — a DNC lookup error should not block the call
    console.warn('[dental-outbound] DNC check threw — defaulting to allow:', e instanceof Error ? e.message : e);
  }

  // ── Calling hours check ────────────────────────────────────
  const { h: hour, m: minute } = melbourneHM();
  const windowStr = `${CALL_WINDOW.open.hour}:${String(CALL_WINDOW.open.minute).padStart(2, '0')}–${CALL_WINDOW.close.hour}:${String(CALL_WINDOW.close.minute).padStart(2, '0')}`;
  console.log(`[dental-outbound] Melbourne ${hour}:${String(minute).padStart(2, '0')} forceHours=${!!opts.forceHours} window=${windowStr}`);
  if (!opts.forceHours && !isInWindow(hour, minute)) {
    const timeStr = `${hour}:${String(minute).padStart(2, '0')}`;
    console.log(`[dental-outbound] call deferred — outside hours (${timeStr} Melbourne)`);
    await updateLead({ status: 'call_pending' });
    await logRun('skipped', `Outside calling hours (${timeStr} Melbourne)`);
    return { outcome: 'call_pending', notes: `Outside hours (${timeStr})` };
  }

  // ── Retell outbound call ───────────────────────────────────
  const apiKey  = process.env.RETELL_API_KEY;
  const fromNum = process.env.RETELL_FROM_NUMBER;
  const agentId = process.env.RETELL_AGENT_ID;

  console.log(`[dental-outbound] env check — RETELL_API_KEY=${!!apiKey} RETELL_FROM_NUMBER=${!!fromNum} RETELL_AGENT_ID=${!!agentId}`);
  if (!apiKey || !fromNum || !agentId) {
    const notes = 'RETELL_API_KEY / RETELL_FROM_NUMBER / RETELL_AGENT_ID not configured';
    console.warn(`[dental-outbound] ${notes}`);
    await logRun('skipped', notes);
    return { outcome: 'skipped', notes };
  }

  // All dynamic variable values must be strings — Retell rejects nulls
  const dynVars = {
    lead_id:            lead.id,
    first_name:         lead.first_name || 'there',
    treatment_interest: lead.treatment_interest || 'not specified',
    timeline:           lead.timeline           || 'not specified',
    email:              lead.email              || '',
    hours_ago:          'just now',
  };

  try {
    console.log(`[dental-outbound] → Retell create-phone-call from=${fromNum} to=${norm} agent=${agentId}`);
    const res = await fetch('https://api.retellai.com/v2/create-phone-call', {
      method:  'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_number:                  fromNum,
        to_number:                    norm,
        override_agent_id:            agentId,
        retell_llm_dynamic_variables: dynVars,
      }),
    });

    console.log(`[dental-outbound] ← Retell response status=${res.status}`);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const notes = `Retell ${res.status}: ${text.slice(0, 200)}`;
      console.error(`[dental-outbound] Retell error — ${notes}`);
      await logRun('failed', notes);
      return { outcome: 'failed', notes };
    }

    const result = await res.json().catch(() => ({})) as { call_id?: string };
    const callId = result.call_id ?? '';
    console.log(`[dental-outbound] call initiated — call_id=${callId || 'unknown'}`);

    // Store call_id and advance status on the lead
    await updateLead({
      status:          'calling',
      sequence_status: 'calling',
      retell_call_id:  callId || null,
      call_attempts:   (lead.call_attempts ?? 0) + 1,
    });
    await logRun('success', `call_id=${callId || 'unknown'}`);
    return { outcome: 'calling', notes: `call_id=${callId}` };

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[dental-outbound] fetch threw:', msg);
    await logRun('failed', `fetch error: ${msg}`);
    return { outcome: 'failed', notes: msg };
  }
}
