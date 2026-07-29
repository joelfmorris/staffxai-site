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

// Uses Intl so AEST/AEDT is handled correctly by the system's timezone data
function melbourneHour(): number {
  return parseInt(
    new Intl.DateTimeFormat('en-AU', { hour: 'numeric', hour12: false, timeZone: 'Australia/Melbourne' })
      .formatToParts(new Date())
      .find(p => p.type === 'hour')?.value ?? '0',
    10,
  );
}

export interface LeadRef {
  id:                 string;
  mobile:             string;
  first_name:         string;
  treatment_interest: string | null | undefined;
  timeline:           string | null | undefined;
  email:              string | null | undefined;
}

export interface OutboundOpts {
  forceHours?: boolean;  // bypass 9am–7pm gate (test/backfill use only)
}

const CALL_HOUR_START = 9;
const CALL_HOUR_END   = 19;

export async function triggerOutboundCall(
  supabase: Supabase,
  lead: LeadRef,
  opts: OutboundOpts = {},
): Promise<{ outcome: string; notes: string }> {
  const norm = normaliseAU(lead.mobile);
  const ts   = new Date().toISOString();

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
  try {
    const { data: dnc } = await supabase
      .from('do_not_contact')
      .select('reason')
      .eq('mobile', norm)
      .maybeSingle();

    if (dnc) {
      const reason = (dnc as { reason: string }).reason;
      console.log(`[dental-outbound] call skipped — DNC (${reason})`);
      await updateLead({ status: 'suppressed' });
      await logRun('skipped', `DNC: ${reason}`);
      return { outcome: 'suppressed', notes: `DNC: ${reason}` };
    }
  } catch (e: unknown) {
    // Fail open — a DNC lookup error should not block the call
    console.warn('[dental-outbound] DNC check failed — defaulting to allow:', e instanceof Error ? e.message : e);
  }

  // ── Calling hours check ────────────────────────────────────
  if (!opts.forceHours) {
    const hour = melbourneHour();
    if (hour < CALL_HOUR_START || hour >= CALL_HOUR_END) {
      console.log(`[dental-outbound] call deferred — outside hours (Melbourne hour: ${hour})`);
      await updateLead({ status: 'call_pending' });
      await logRun('skipped', `Outside calling hours (hour=${hour} Melbourne)`);
      return { outcome: 'call_pending', notes: `Outside hours (hour=${hour})` };
    }
  }

  // ── Retell outbound call ───────────────────────────────────
  const apiKey  = process.env.RETELL_API_KEY;
  const fromNum = process.env.RETELL_FROM_NUMBER;
  const agentId = process.env.RETELL_AGENT_ID;

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

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const notes = `Retell ${res.status}: ${text.slice(0, 200)}`;
      console.error(`[dental-outbound] ${notes}`);
      await logRun('failed', notes);
      return { outcome: 'failed', notes };
    }

    const result = await res.json().catch(() => ({})) as { call_id?: string };
    const callId = result.call_id ?? '';
    console.log(`[dental-outbound] call initiated — call_id: ${callId || 'unknown'}`);

    // Store call_id and advance status on the lead
    await updateLead({ status: 'calling', retell_call_id: callId || null });
    await logRun('success', `call_id=${callId || 'unknown'}`);
    return { outcome: 'calling', notes: `call_id=${callId}` };

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[dental-outbound] fetch threw:', msg);
    await logRun('failed', `fetch error: ${msg}`);
    return { outcome: 'failed', notes: msg };
  }
}
