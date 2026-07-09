import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const { firstName, mobile, email, treatmentInterest, timeline, priorConsult, consentAt } = await req.json();

  if (!firstName || !mobile || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error } = await supabase.from('dental_enquiries').insert({
    client_id: 'cranbourne-demo',
    source: 'web',
    status: 'new',
    first_name: firstName,
    mobile,
    email,
    treatment_interest: treatmentInterest,
    timeline,
    prior_consult: typeof priorConsult === 'boolean' ? priorConsult : null,
    consent_at:    consentAt ?? null,
  });

  if (error) {
    console.error('[dental-enquiry]', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
