// lib/dental-outbound.ts
//
// Shared outbound-call logic used by:
//   app/api/dental-enquiry/route.ts       — fires on every new web enquiry
//   app/api/cron/pending-calls/route.ts   — daily cron sweep
//   app/api/retell/trigger-test/route.ts  — manual test trigger
//
// ── Safety rails (all checked inside triggerOutboundCall) ──────────────────
//
//   CALLS_ENABLED env var   — must be exactly 'true'; otherwise all calls are
//                             suppressed. This is the master kill switch.
//   MAX_CALL_ATTEMPTS = 4   — checked against call_attempts BEFORE dialling.
//                             If the webhook ever misses a delivery, the cron
//                             picks the lead back up and this gate fires first.
//   Lifetime mobile cap     — verified against agent_runs (not the lead row),
//                             so a corrupted call_attempts field can't bypass it.
//   12h cooldown per mobile — verified against agent_runs; blocks re-calls
//                             within COOLDOWN_HOURS regardless of lead state.
//   Daily cap (default 20)  — rolling 24h window; halts + alerts on first hit.
//                             Override with DAILY_CALL_CAP env var.

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

// ── Safety rail constants ─────────────────────────────────────

export const MAX_CALL_ATTEMPTS = 4;   // Lifetime cap per mobile
export const COOLDOWN_HOURS    = 12;  // Minimum gap between calls to the same mobile

// ── Melbourne time helpers ────────────────────────────────────

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

export function clampToMelbourneWindow(dt: Date): Date {
  const { h, m } = melbourneHM(dt);
  if (isInWindow(h, m)) return dt;
  const dateKey   = dt.toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' });
  const totalMins = h * 60 + m;
  const closeMins = CALL_WINDOW.close.hour * 60 + CALL_WINDOW.close.minute;
  if (totalMins >= closeMins) {
    const base = new Date(`${dateKey}T12:00:00Z`);
    base.setUTCDate(base.getUTCDate() + 1);
    return windowOpenMelbourne(base.toISOString().slice(0, 10));
  }
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
  forceHours?: boolean;  // bypass calling-hours gate (cron/test use only)
}

// ── triggerOutboundCall ───────────────────────────────────────

export async function triggerOutboundCall(
  supabase: Supabase,
  lead: LeadRef,
  opts: OutboundOpts = {},
): Promise<{ outcome: string; notes: string }> {
  const norm    = normaliseAU(lead.mobile);
  const ts      = new Date().toISOString();
  const attempts = lead.call_attempts ?? 0;

  console.log(`[dental-outbound] start — lead_id=${lead.id} mobile=${norm} call_attempts=${attempts}`);

  // logRun: every exit path calls this so the audit trail is complete.
  // mobile is stored in input so we can query per-mobile caps from agent_runs.
  async function logRun(status: 'success' | 'failed' | 'skipped', notes: string) {
    try {
      const { error } = await supabase.from('agent_runs').insert({
        agent_name:   'retell',
        status,
        input: {
          source:    'retell',
          action:    'outbound_trigger',
          lead_id:   lead.id,
          mobile:    norm,            // required for per-mobile cap queries
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

  // ── 1. CALLS_ENABLED kill switch ──────────────────────────
  // Set CALLS_ENABLED=true in Vercel to enable. Any other value (including
  // missing / 'false' / anything else) suppresses all outbound calls.
  // This check runs before everything else and does NOT write to agent_runs
  // so it has zero side effects.
  if (process.env.CALLS_ENABLED !== 'true') {
    console.log('[dental-outbound] CALLS_ENABLED != true — kill switch active, call suppressed');
    return { outcome: 'disabled', notes: 'CALLS_ENABLED is not set to true' };
  }

  // ── 2. DNC check ──────────────────────────────────────────
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
    console.warn('[dental-outbound] DNC check threw — defaulting to allow:', e instanceof Error ? e.message : e);
  }

  // ── 3. Pre-call exhaustion check ─────────────────────────
  // This fires BEFORE dialling — not after the webhook — so a missed webhook
  // delivery cannot cause a runaway loop. If call_attempts is already at the
  // max, exhaust the lead immediately and return without calling.
  if (attempts >= MAX_CALL_ATTEMPTS) {
    console.warn(
      `[dental-outbound] ${lead.id} already at ${attempts} attempts (max ${MAX_CALL_ATTEMPTS}) — ` +
      `exhausting now without calling`,
    );
    await updateLead({ sequence_status: 'exhausted', last_call_outcome: 'pre_exhausted', next_call_at: null });
    await logRun('skipped', `pre_exhausted: call_attempts=${attempts}`);
    return { outcome: 'exhausted', notes: `Max attempts (${MAX_CALL_ATTEMPTS}) already reached` };
  }

  // ── 4. Calling hours check ────────────────────────────────
  // Defer (not block) if outside the window. Safety rails in step 5 don't
  // fire for deferred calls — deferral doesn't consume any cap.
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

  // ── 5. Agent-runs safety rails ───────────────────────────
  // These query the audit log rather than the lead row, so they catch bugs
  // that corrupt call_attempts or sequence_status on the lead.
  // All three queries run in parallel to minimise latency.
  const since12h = new Date(Date.now() - COOLDOWN_HOURS * 3_600_000).toISOString();
  const since24h = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const dailyCap = parseInt(process.env.DAILY_CALL_CAP ?? '20', 10);

  const [lifetimeRes, recentRes, dailyRes] = await Promise.all([
    // Lifetime successful calls to this mobile number in agent_runs
    supabase.from('agent_runs')
      .select('id', { count: 'exact', head: true })
      .eq('agent_name', 'retell')
      .eq('status', 'success')
      .filter('input->>action', 'eq', 'outbound_trigger')
      .filter('input->>mobile', 'eq', norm),

    // Calls to this mobile in the last COOLDOWN_HOURS
    supabase.from('agent_runs')
      .select('id', { count: 'exact', head: true })
      .eq('agent_name', 'retell')
      .eq('status', 'success')
      .filter('input->>action', 'eq', 'outbound_trigger')
      .filter('input->>mobile', 'eq', norm)
      .gte('started_at', since12h),

    // All successful outbound calls in the last 24h (rolling daily cap)
    supabase.from('agent_runs')
      .select('id', { count: 'exact', head: true })
      .eq('agent_name', 'retell')
      .eq('status', 'success')
      .filter('input->>action', 'eq', 'outbound_trigger')
      .gte('started_at', since24h),
  ]);

  const lifetimeCalls = lifetimeRes.count ?? 0;
  const recentCalls   = recentRes.count   ?? 0;
  const dailyCalls    = dailyRes.count    ?? 0;

  console.log(
    `[dental-outbound] rails — lifetime=${lifetimeCalls} recent12h=${recentCalls} ` +
    `daily=${dailyCalls}/${dailyCap} for ${norm}`,
  );

  // Rail A: lifetime mobile cap (agent_runs — immune to call_attempts corruption)
  if (lifetimeCalls >= MAX_CALL_ATTEMPTS) {
    console.warn(`[dental-outbound] ${norm} lifetime cap: ${lifetimeCalls} calls in agent_runs — exhausting`);
    await updateLead({ sequence_status: 'exhausted', last_call_outcome: 'lifetime_cap', next_call_at: null });
    await logRun('skipped', `lifetime_cap: ${lifetimeCalls} calls to this mobile in agent_runs`);
    return { outcome: 'exhausted', notes: `Lifetime cap (${MAX_CALL_ATTEMPTS}) reached for this mobile` };
  }

  // Rail B: 12h cooldown per mobile
  if (recentCalls > 0) {
    console.warn(`[dental-outbound] ${norm} cooldown: called ${recentCalls}x in last ${COOLDOWN_HOURS}h — skipping`);
    await logRun('skipped', `cooldown: ${recentCalls} call(s) in last ${COOLDOWN_HOURS}h`);
    return { outcome: 'cooldown', notes: `Called within last ${COOLDOWN_HOURS}h` };
  }

  // Rail C: global daily cap (rolling 24h window)
  if (dailyCalls >= dailyCap) {
    console.warn(`[dental-outbound] daily cap: ${dailyCalls}/${dailyCap} calls in last 24h — halting`);
    // Alert only on the FIRST blocked call so you get one SMS per cap hit, not one per blocked lead
    if (dailyCalls === dailyCap) {
      const alertMobile = process.env.PRACTICE_ALERT_MOBILE;
      if (alertMobile) {
        sendSMS(
          alertMobile,
          `StaffxAI: Daily call cap of ${dailyCap} reached. No more calls today. Check Vercel logs.`,
        ).catch((e: unknown) =>
          console.error('[dental-outbound] daily-cap alert SMS failed:', e instanceof Error ? e.message : e),
        );
      }
    }
    await logRun('skipped', `daily_cap: ${dailyCalls}/${dailyCap}`);
    return { outcome: 'halted', notes: `Daily cap (${dailyCap}) reached — ${dailyCalls} calls in last 24h` };
  }

  // ── 6. Retell outbound call ───────────────────────────────
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

    // Increment call_attempts and set status in the SAME write as setting sequence_status.
    // This is critical: if they were separate writes, a crash between them could corrupt state.
    await updateLead({
      status:          'calling',
      sequence_status: 'calling',
      retell_call_id:  callId || null,
      call_attempts:   attempts + 1,  // single atomic write
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
