import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import {
  makeSupabase,
  normaliseAU,
  isAUMobile,
  isMelbourneBusinessHours,
  clampToMelbourneWindow,
  triggerOutboundCall,
  sendSMS,
} from '@/lib/dental-outbound';
import { refreshCache } from '@/lib/calendly-cache';

export async function POST(req: NextRequest) {
  const { firstName, mobile, email, treatmentInterest, timeline, priorConsult, consentAt } = await req.json();

  if (!firstName || !mobile || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const normMobile = normaliseAU(mobile);
  if (!isAUMobile(mobile)) {
    return NextResponse.json(
      { error: 'Please enter a valid Australian mobile number (e.g. 0412 345 678)' },
      { status: 400 },
    );
  }

  const supabase      = makeSupabase();
  const insideHours   = isMelbourneBusinessHours();
  const scheduledNext = insideHours ? null : clampToMelbourneWindow(new Date()).toISOString();

  const { data: lead, error } = await supabase
    .from('dental_enquiries')
    .insert({
      client_id:          'cranbourne-demo',
      source:             'web',
      status:             'new',
      first_name:         firstName,
      mobile:             normMobile,
      email,
      treatment_interest: treatmentInterest,
      timeline,
      prior_consult:      typeof priorConsult === 'boolean' ? priorConsult : null,
      consent_at:         consentAt ?? null,
      call_attempts:      0,
      sequence_status:    'pending',
      next_call_at:       scheduledNext,
    })
    .select('id')
    .single();

  if (error || !lead) {
    console.error('[dental-enquiry]', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  const leadId = (lead as { id: string }).id;

  waitUntil((async () => {
    // Confirmation SMS — always send regardless of hours
    const smsBody = insideHours
      ? `Hi ${firstName}, thanks for your enquiry with Cranbourne Dental Studio! Someone will give you a call shortly. — Cranbourne Dental`
      : `Hi ${firstName}, thanks for your enquiry with Cranbourne Dental Studio! We'll give you a call tomorrow morning. — Cranbourne Dental`;

    // SMS and slot-cache warm-up fire in parallel — cache is ready before Maya asks for availability
    const [smsResult, cacheResult] = await Promise.allSettled([
      sendSMS(normMobile, smsBody),
      refreshCache(supabase),
    ]);

    if (smsResult.status === 'rejected') {
      console.error('[dental-enquiry] confirmation SMS failed:', smsResult.reason instanceof Error ? smsResult.reason.message : smsResult.reason);
    }
    if (cacheResult.status === 'rejected') {
      console.warn('[dental-enquiry] slot cache warm-up failed:', cacheResult.reason instanceof Error ? cacheResult.reason.message : cacheResult.reason);
    }

    // Outbound call — only if inside calling hours; otherwise cron picks it up at next_call_at
    if (insideHours) {
      await triggerOutboundCall(supabase, {
        id:                 leadId,
        mobile:             normMobile,
        first_name:         firstName,
        treatment_interest: treatmentInterest,
        timeline,
        email,
        call_attempts:      0,
      }, { forceHours: true }).catch((e: unknown) =>
        console.error('[dental-enquiry] triggerOutboundCall threw:', e instanceof Error ? e.message : e),
      );
    }
  })());

  return NextResponse.json({ success: true });
}
