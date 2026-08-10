// app/api/cron/pending-calls/route.ts
//
// Three jobs in one daily run (Hobby plan = once per day at 22:00 UTC / 9am AEST):
//
//   1. Call sweep    — pending leads with next_call_at <= now → fire Retell calls
//   2. Brief sweep   — booked leads with appointment_at in next 18–30h → patient brief email
//   3. Deposit chase — deposit_chasing leads with next_deposit_check_at <= now:
//                        reminder_count=0 → send reminder SMS, schedule requeue check
//                        reminder_count≥1 → 24h elapsed, requeue for call ladder
//
// Auth: Authorization: Bearer <CRON_SECRET>
//
// NOTE: On the Hobby plan this fires once daily so "2h" and "24h" are approximate —
// the cron fires when next_deposit_check_at <= now, which may be up to ~16h late.
// On Vercel Pro with */15 * * * * the timing is accurate to ±15 min.

import { NextRequest, NextResponse } from 'next/server';
import { makeSupabase, triggerOutboundCall, clampToMelbourneWindow, sendSMS } from '@/lib/dental-outbound';
import { sendPatientBrief, type LeadBrief } from '@/lib/patient-brief';

// ── Slot time formatter ───────────────────────────────────────

function fmtAppt(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit',
    hour12: true, timeZone: 'Australia/Melbourne',
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  const h   = parseInt(get('hour'), 10);
  const m   = parseInt(get('minute'), 10);
  const per = get('dayPeriod').toLowerCase().replace(/\s/g, '');
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const time = m === 0 ? `${h12}${per}` : `${h12}:${String(m).padStart(2, '0')}${per}`;
  return `${get('weekday')} ${get('day')} ${get('month')}, ${time}`;
}

const BATCH_SIZE       = 10;
const BETWEEN_CALLS_MS = 3_000;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth   = req.headers.get('authorization') ?? '';

  if (!secret || auth !== `Bearer ${secret}`) {
    const tokenLen = auth.startsWith('Bearer ') ? auth.length - 7 : auth.length;
    console.log(
      `[cron/pending-calls] auth failed — ` +
      `secret_defined=${!!secret} secret_len=${secret?.length ?? 0} token_len=${tokenLen}`,
    );
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

  // ── 3. Deposit chase sweep ─────────────────────────────────
  // Leads with deposit link sent but not yet paid.
  //   reminder_count = 0 → send reminder SMS, schedule the 24h requeue check
  //   reminder_count ≥ 1 → enough waiting, requeue for call ladder
  // Max 2 reminders total (cap guards against double-fires on cron overlap).
  const { data: chaseRows, error: chaseErr } = await db
    .from('dental_enquiries')
    .select('id, mobile, first_name, appointment_at, preferred_slot_label, deposit_reminder_count')
    .eq('sequence_status', 'deposit_chasing')
    .lte('next_deposit_check_at', now.toISOString())
    .is('deposit_paid_at', null)
    .order('next_deposit_check_at', { ascending: true })
    .limit(20);

  if (chaseErr) {
    console.error('[cron/pending-calls] deposit-chase query failed:', chaseErr.message);
  }

  const chaseLeads = chaseRows ?? [];
  console.log(`[cron/pending-calls] deposit chase — ${chaseLeads.length} lead(s)`);

  const depositBase = process.env.STRIPE_DEPOSIT_LINK ?? '';
  const chaseResults: Array<{ lead_id: string; action: string }> = [];
  const chaseTs = now.toISOString();

  for (const row of chaseLeads) {
    const rowId         = row.id as string;
    const firstName     = row.first_name as string;
    const mobile        = row.mobile as string;
    const reminderCount = (row.deposit_reminder_count as number) ?? 0;
    const apptAt        = row.appointment_at as string | null;
    const slotLabel     = row.preferred_slot_label as string | null;

    if (reminderCount < 2) {
      // ── Send reminder SMS ────────────────────────────────
      // Append client_reference_id so a late payment still resolves the lead
      let depositLink = depositBase;
      try {
        const url = new URL(depositBase);
        url.searchParams.set('client_reference_id', rowId);
        depositLink = url.toString();
      } catch { /* not a full URL, use as-is */ }

      const slotText = slotLabel ?? (apptAt ? fmtAppt(apptAt) : null);
      const smsBody  = slotText
        ? `Hi ${firstName}, just the link again for your consult with Dr Ana on ${slotText} — ${depositLink}`
        : `Hi ${firstName}, just the link again for your consult with Dr Ana — ${depositLink}`;

      await sendSMS(mobile, smsBody).catch((e: unknown) =>
        console.error('[cron/deposit-chase] SMS failed:', e instanceof Error ? e.message : e),
      );

      // Next check: ~22h from now (≈24h total from original call)
      const requeueAt = clampToMelbourneWindow(new Date(Date.now() + 22 * 3_600_000));
      await db.from('dental_enquiries').update({
        deposit_reminder_count: reminderCount + 1,
        next_deposit_check_at:  requeueAt.toISOString(),
        updated_at:             chaseTs,
      }).eq('id', rowId);

      chaseResults.push({ lead_id: rowId, action: 'sms_sent' });
    } else {
      // ── Max reminders / 24h elapsed — requeue for call ladder ──
      const nextCall = clampToMelbourneWindow(new Date());
      await db.from('dental_enquiries').update({
        sequence_status:       'pending',
        next_call_at:          nextCall.toISOString(),
        next_deposit_check_at: null,
        updated_at:            chaseTs,
      }).eq('id', rowId);

      console.log(`[cron/deposit-chase] ${rowId} — requeued for call ladder`);
      chaseResults.push({ lead_id: rowId, action: 'requeued' });
    }
  }

  return NextResponse.json({
    calls:  { processed: callResults.length, results: callResults },
    briefs: { processed: briefResults.length, results: briefResults },
    chase:  { processed: chaseResults.length, results: chaseResults },
  });
}
