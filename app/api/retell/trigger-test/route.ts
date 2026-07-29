// app/api/retell/trigger-test/route.ts
//
// Manual trigger for testing the outbound call flow without submitting the form.
//
// Auth: Authorization: Bearer <RETELL_API_KEY>  (reuses the existing key — no new env var)
//
// Usage (with lead_id — fetches real lead from DB):
//   POST /api/retell/trigger-test
//   { "lead_id": "uuid", "force_hours": true }
//
// Usage (without lead_id — synthetic lead, DB updates no-op):
//   POST /api/retell/trigger-test
//   {
//     "first_name": "Joel",
//     "mobile": "0499123456",
//     "email": "test@example.com",
//     "treatment_interest": "dental implants",
//     "timeline": "as soon as possible",
//     "force_hours": true
//   }

import { NextRequest, NextResponse } from 'next/server';
import { makeSupabase, normaliseAU, triggerOutboundCall, LeadRef } from '@/lib/dental-outbound';

export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────
  const apiKey = process.env.RETELL_API_KEY;
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!apiKey || token !== apiKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const forceHours = body.force_hours === true;
  const supabase   = makeSupabase();

  let lead: LeadRef;

  // ── Lead resolution ──────────────────────────────────────────
  const leadId = typeof body.lead_id === 'string' ? body.lead_id.trim() : '';

  if (leadId) {
    const { data, error } = await supabase
      .from('dental_enquiries')
      .select('id, mobile, first_name, treatment_interest, timeline, email')
      .eq('id', leadId)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: `Lead not found: ${leadId}` }, { status: 404 });
    }

    lead = data as LeadRef;
  } else {
    // Synthetic lead — must supply at least first_name and mobile
    const mobile     = typeof body.mobile     === 'string' ? body.mobile     : '';
    const first_name = typeof body.first_name === 'string' ? body.first_name : '';

    if (!mobile || !first_name) {
      return NextResponse.json(
        { error: 'Provide either lead_id or both first_name and mobile' },
        { status: 400 },
      );
    }

    lead = {
      id:                 `test-${normaliseAU(mobile)}`,
      mobile,
      first_name,
      treatment_interest: typeof body.treatment_interest === 'string' ? body.treatment_interest : 'dental implants',
      timeline:           typeof body.timeline           === 'string' ? body.timeline           : 'not specified',
      email:              typeof body.email              === 'string' ? body.email              : '',
    };

    console.log('[trigger-test] using synthetic lead — DB updates will no-op');
  }

  // ── Fire call ────────────────────────────────────────────────
  const result = await triggerOutboundCall(supabase, lead, { forceHours }).catch((e: unknown) => ({
    outcome: 'error',
    notes: e instanceof Error ? e.message : String(e),
  }));

  return NextResponse.json({ lead_id: lead.id, ...result });
}
