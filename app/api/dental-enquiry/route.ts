import { NextRequest, NextResponse } from 'next/server';
import { makeSupabase, triggerOutboundCall } from '@/lib/dental-outbound';

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
  triggerOutboundCall(supabase, {
    id:                 (lead as { id: string }).id,
    mobile,
    first_name:         firstName,
    treatment_interest: treatmentInterest,
    timeline,
    email,
  }).catch((e: unknown) =>
    console.error('[dental-enquiry] triggerOutboundCall threw:', e instanceof Error ? e.message : e),
  );

  return NextResponse.json({ success: true });
}
