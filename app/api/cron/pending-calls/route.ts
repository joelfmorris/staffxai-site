// app/api/cron/pending-calls/route.ts
//
// Two jobs in one daily run (Hobby plan = once per day at 22:00 UTC / 9am AEST):
//
//   1. Call sweep — find pending leads with next_call_at <= now, fire Retell calls
//   2. Brief sweep — find booked leads with appointment_at in next 18–30h, send patient brief email
//
// Auth: Authorization: Bearer <CRON_SECRET>

import { NextRequest, NextResponse } from 'next/server';
import { makeSupabase, triggerOutboundCall } from '@/lib/dental-outbound';
import { sendPatientBrief, type LeadBrief } from '@/lib/patient-brief';

const BATCH_SIZE       = 10;
const BETWEEN_CALLS_MS = 3_000;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth   = req.headers.get('authorization') ?? '';

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db  = makeSupabase();
  const now = new Date();

  // ── 1. Call sweep ──────────────────────────────────────────
  const { data: pendingRows, error: callErr } = await db
    .from('dental_enquiries')
    .select('id, mobile, first_name, treatment_interest, timeline, email, call_attempts')
    .eq('sequence_status', 'pending')
    .lte('next_call_at', now.toISOString())
    .order('next_call_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (callErr) {
    console.error('[cron/pending-calls] call-sweep query failed:', callErr.message);
    return NextResponse.json({ error: callErr.message }, { status: 500 });
  }

  const batch = pendingRows ?? [];
  console.log(`[cron/pending-calls] call sweep — ${batch.length} lead(s)`);

  const callResults: Array<{ lead_id: string; outcome: string; notes: string }> = [];

  for (let i = 0; i < batch.length; i++) {
    const row = batch[i];

    const result = await triggerOutboundCall(db, {
      id:                 row.id as string,
      mobile:             row.mobile as string,
      first_name:         row.first_name as string,
      treatment_interest: row.treatment_interest as string | null,
      timeline:           row.timeline as string | null,
      email:              row.email as string | null,
      call_attempts:      (row.call_attempts as number | null) ?? 0,
    }, { forceHours: true });

    callResults.push({ lead_id: row.id as string, ...result });

    if (i < batch.length - 1) {
      await new Promise(r => setTimeout(r, BETWEEN_CALLS_MS));
    }
  }

  // ── 2. Brief sweep ─────────────────────────────────────────
  // Find booked leads with appointment_at in the next 18–30 hours and no brief sent yet.
  // Window is wide enough to catch any appointment time tomorrow given a once-daily cron.
  const briefFrom = new Date(now.getTime() + 18 * 3_600_000).toISOString();
  const briefTo   = new Date(now.getTime() + 30 * 3_600_000).toISOString();

  const { data: briefRows, error: briefErr } = await db
    .from('dental_enquiries')
    .select('*')
    .eq('sequence_status', 'booked')
    .gte('appointment_at', briefFrom)
    .lte('appointment_at', briefTo)
    .is('brief_sent_at', null);

  if (briefErr) {
    console.error('[cron/pending-calls] brief-sweep query failed:', briefErr.message);
  }

  const briefLeads = (briefRows ?? []) as unknown as LeadBrief[];
  console.log(`[cron/pending-calls] brief sweep — ${briefLeads.length} lead(s)`);

  const briefResults: Array<{ lead_id: string; sent: boolean }> = [];

  for (const lead of briefLeads) {
    const sent = await sendPatientBrief(lead, db);
    briefResults.push({ lead_id: lead.id, sent });
  }

  return NextResponse.json({
    calls:  { processed: callResults.length, results: callResults },
    briefs: { processed: briefResults.length, results: briefResults },
  });
}
