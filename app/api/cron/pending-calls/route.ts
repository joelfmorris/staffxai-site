// app/api/cron/pending-calls/route.ts
//
// Processes dental_enquiries with sequence_status='pending' and next_call_at <= now.
// Triggered every 15 minutes via Vercel Cron (vercel.json).
//
// Auth: Authorization: Bearer <CRON_SECRET>
// Vercel also sends x-vercel-cron-signature but we use a simple bearer token
// to keep the route testable with curl.

import { NextRequest, NextResponse } from 'next/server';
import { makeSupabase, triggerOutboundCall } from '@/lib/dental-outbound';

const BATCH_SIZE       = 10;
const BETWEEN_CALLS_MS = 3_000;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth   = req.headers.get('authorization') ?? '';

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = makeSupabase();

  const { data: rows, error } = await db
    .from('dental_enquiries')
    .select('id, mobile, first_name, treatment_interest, timeline, email, call_attempts')
    .eq('sequence_status', 'pending')
    .lte('next_call_at', new Date().toISOString())
    .order('next_call_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error('[cron/pending-calls] query failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const batch = rows ?? [];
  console.log(`[cron/pending-calls] processing ${batch.length} lead(s)`);

  const results: Array<{ lead_id: string; outcome: string; notes: string }> = [];

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

    results.push({ lead_id: row.id as string, ...result });

    if (i < batch.length - 1) {
      await new Promise(r => setTimeout(r, BETWEEN_CALLS_MS));
    }
  }

  return NextResponse.json({ processed: batch.length, results });
}
