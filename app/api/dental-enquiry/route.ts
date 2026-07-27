import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const TZ = 'Australia/Melbourne';
const CALL_HOUR_START = 9;   // 9 am Melbourne
const CALL_HOUR_END   = 19;  // 7 pm Melbourne

// Type alias avoids the SupabaseClient<unknown> vs SupabaseClient<any> mismatch
// that occurs when passing createClient() results across function boundaries.
function makeSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
type Supabase = ReturnType<typeof makeSupabase>;

function normaliseAU(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  if (digits.startsWith('61')) return '+' + digits;
  if (digits.startsWith('0'))  return '+61' + digits.slice(1);
  return '+61' + digits;
}

function melbourneHour(): number {
  return parseInt(
    new Intl.DateTimeFormat('en-AU', { hour: 'numeric', hour12: false, timeZone: TZ })
      .formatToParts(new Date())
      .find(p => p.type === 'hour')?.value ?? '0',
    10,
  );
}

interface LeadRef {
  id:                 string;
  mobile:             string;
  first_name:         string;
  treatment_interest: string;
  timeline:           string;
  email:              string;
}

async function triggerOutboundCall(supabase: Supabase, lead: LeadRef) {
  const norm = normaliseAU(lead.mobile);
  const ts   = new Date().toISOString();

  async function logRun(status: 'success' | 'failed' | 'skipped', notes: string) {
    try {
      const { error } = await supabase.from('agent_runs').insert({
        agent_name:   'retell',
        status,
        input:        { source: 'web-enquiry', action: 'outbound_call', lead_id: lead.id, client_id: 'cranbourne-demo' },
        output:       { notes },
        duration_ms:  0,
        started_at:   ts,
        completed_at: ts,
      });
      if (error) console.warn('[dental-enquiry] agent_runs log failed:', error.message);
    } catch (e: unknown) {
      console.warn('[dental-enquiry] agent_runs log threw:', e instanceof Error ? e.message : e);
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
      console.log(`[dental-enquiry] outbound call skipped — DNC (${reason})`);
      await logRun('skipped', `DNC: ${reason}`);
      return;
    }
  } catch (e: unknown) {
    console.warn('[dental-enquiry] DNC check failed — defaulting to allow:', e instanceof Error ? e.message : e);
  }

  // ── Calling hours check ────────────────────────────────────
  const hour = melbourneHour();
  if (hour < CALL_HOUR_START || hour >= CALL_HOUR_END) {
    console.log(`[dental-enquiry] outbound call deferred — outside hours (Melbourne hour: ${hour})`);
    try {
      const { error } = await supabase
        .from('dental_enquiries')
        .update({ status: 'call_pending', updated_at: ts })
        .eq('id', lead.id);
      if (error) console.warn('[dental-enquiry] call_pending update failed:', error.message);
    } catch (e: unknown) {
      console.warn('[dental-enquiry] call_pending update threw:', e instanceof Error ? e.message : e);
    }
    await logRun('skipped', `Outside calling hours (hour=${hour} Melbourne)`);
    return;
  }

  // ── Retell outbound call ───────────────────────────────────
  const apiKey  = process.env.RETELL_API_KEY;
  const fromNum = process.env.RETELL_FROM_NUMBER;
  const agentId = process.env.RETELL_AGENT_ID;

  if (!apiKey || !fromNum || !agentId) {
    console.warn('[dental-enquiry] Retell env vars not set — skipping outbound call');
    await logRun('skipped', 'RETELL_API_KEY / RETELL_FROM_NUMBER / RETELL_AGENT_ID not configured');
    return;
  }

  try {
    const res = await fetch('https://api.retellai.com/v2/create-phone-call', {
      method:  'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_number:       fromNum,
        to_number:         norm,
        override_agent_id: agentId,
        retell_llm_dynamic_variables: {
          lead_id:            lead.id,
          first_name:         lead.first_name,
          treatment_interest: lead.treatment_interest,
          timeline:           lead.timeline,
          email:              lead.email,
          hours_ago:          'just now',
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[dental-enquiry] Retell call failed ${res.status}: ${text.slice(0, 200)}`);
      await logRun('failed', `Retell ${res.status}: ${text.slice(0, 200)}`);
      return;
    }

    const result = await res.json().catch(() => ({})) as { call_id?: string };
    console.log(`[dental-enquiry] Retell call initiated — call_id: ${result.call_id ?? 'unknown'}`);
    await logRun('success', `call_id=${result.call_id ?? 'unknown'}`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[dental-enquiry] Retell fetch threw:', msg);
    await logRun('failed', `fetch error: ${msg}`);
  }
}

export async function POST(req: NextRequest) {
  const { firstName, mobile, email, treatmentInterest, timeline, priorConsult, consentAt } = await req.json();

  if (!firstName || !mobile || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = makeSupabase();

  const { data: lead, error } = await supabase
    .from('dental_enquiries')
    .insert({
      client_id:          'cranbourne-demo',
      source:             'web',
      status:             'new',
      first_name:         firstName,
      mobile,
      email,
      treatment_interest: treatmentInterest,
      timeline,
      prior_consult:      typeof priorConsult === 'boolean' ? priorConsult : null,
      consent_at:         consentAt ?? null,
    })
    .select('id')
    .single();

  if (error || !lead) {
    console.error('[dental-enquiry]', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // Trigger outbound call — never blocks or fails the form submission
  await triggerOutboundCall(supabase, {
    id:                 (lead as { id: string }).id,
    mobile,
    first_name:         firstName,
    treatment_interest: treatmentInterest ?? '',
    timeline:           timeline ?? '',
    email,
  }).catch((e: unknown) =>
    console.error('[dental-enquiry] triggerOutboundCall threw:', e instanceof Error ? e.message : e),
  );

  return NextResponse.json({ success: true });
}
