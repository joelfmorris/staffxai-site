// app/api/test/send-brief/route.ts
//
// GET — test trigger for the patient-brief email.
//
// Loads a lead by ID and runs sendPatientBrief() directly — the same function
// the Stripe webhook calls. Does NOT check brief_sent_at, so re-runs are safe.
// Updates brief_sent_at on success (same as production path).
//
// Auth: Authorization: Bearer <CRON_SECRET>  OR  ?secret=<CRON_SECRET>
//
// Required query param:
//   lead_id=<uuid>
//
// Example:
//   GET /api/test/send-brief?lead_id=abc-123&secret=XXXX
//
// Returns:
//   { lead_id, lead_name, provider, recipient, sent, error? }

import { NextRequest, NextResponse } from 'next/server';
import { makeSupabase } from '@/lib/dental-outbound';
import { sendPatientBrief, type LeadBrief } from '@/lib/patient-brief';

// ── Provider detection ────────────────────────────────────────
// Mirrors the same three-condition check inside patient-brief.ts sendEmail(),
// so the reported provider matches what the library actually used.

type Provider = 'sendgrid' | 'smtp' | 'dry-run';

function detectProvider(): Provider {
  const sgKey = process.env.SENDGRID_API_KEY;
  if (sgKey && sgKey !== 'placeholder') return 'sendgrid';

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (host && host !== 'placeholder' && user && pass) return 'smtp';

  return 'dry-run';
}

// ── Handler ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Auth — bearer header or ?secret= query param
  const secret      = process.env.CRON_SECRET;
  const auth        = req.headers.get('authorization') ?? '';
  const bearerToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const queryToken  = req.nextUrl.searchParams.get('secret') ?? '';
  const token       = bearerToken || queryToken;

  if (!secret || token !== secret) {
    console.log('[test/send-brief] auth failed');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Required param
  const leadId = req.nextUrl.searchParams.get('lead_id')?.trim();
  if (!leadId) {
    return NextResponse.json({ error: 'Missing required param: lead_id' }, { status: 400 });
  }

  // Pre-flight: PRACTICE_BRIEF_EMAIL must be set or nothing will send
  const recipient = process.env.PRACTICE_BRIEF_EMAIL ?? '';
  if (!recipient) {
    return NextResponse.json({
      error:     'PRACTICE_BRIEF_EMAIL env var is not set — brief cannot be sent',
      lead_id:   leadId,
      provider:  detectProvider(),
      recipient: null,
      sent:      false,
    }, { status: 500 });
  }

  // Load lead
  const db = makeSupabase();
  const { data: lead, error: fetchErr } = await db
    .from('dental_enquiries')
    .select('*')
    .eq('id', leadId)
    .maybeSingle();

  if (fetchErr) {
    console.error('[test/send-brief] DB error:', fetchErr.message);
    return NextResponse.json({ error: fetchErr.message, lead_id: leadId }, { status: 500 });
  }

  if (!lead) {
    return NextResponse.json({ error: `Lead ${leadId} not found`, lead_id: leadId }, { status: 404 });
  }

  const provider  = detectProvider();
  const leadName  = (lead.first_name as string | null) ?? 'unknown';

  console.log(
    `[test/send-brief] starting — lead=${leadId} name=${leadName} ` +
    `provider=${provider} recipient=${recipient}`,
  );

  // Run sendPatientBrief — same function as the Stripe webhook, no guard on brief_sent_at.
  // sendPatientBrief catches all errors internally and returns false on failure.
  const sent = await sendPatientBrief(lead as unknown as LeadBrief, db);

  // Infer error: if a real provider is configured but sent=false, something went wrong.
  // The detail is in Vercel logs under [patient-brief].
  const errorMsg = (!sent && provider !== 'dry-run')
    ? 'Delivery failed — check Vercel logs for [patient-brief] error'
    : null;

  const result = {
    lead_id:   leadId,
    lead_name: leadName,
    provider,
    recipient,
    sent,
    dry_run:   provider === 'dry-run',
    error:     errorMsg,
  };

  console.log(
    `[test/send-brief] done — provider=${provider} sent=${sent}` +
    (errorMsg ? ` error="${errorMsg}"` : ''),
  );

  return NextResponse.json(result, { status: errorMsg ? 500 : 200 });
}
