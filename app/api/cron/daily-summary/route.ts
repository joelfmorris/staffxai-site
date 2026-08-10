// app/api/cron/daily-summary/route.ts
//
// GET — daily SMS summary of the last 24 h sent to PRACTICE_ALERT_MOBILE.
//
// Schedule externally at 7:30am Melbourne:
//   AEST (UTC+10, Apr–Oct): 30 21 * * *   (21:30 UTC = 7:30am next day AEST)
//   AEDT (UTC+11, Oct–Apr): 30 20 * * *   (20:30 UTC = 7:30am next day AEDT)
//   Recommended: 30 21 * * * — fires at 7:30am AEST, 8:30am AEDT (still morning)
//
// Auth: Authorization: Bearer <CRON_SECRET>
//
// SMS format (≤ 320 chars):
//   "StaffxAI daily: 3 enquiries, 3 called, 1 booked, 1 deposit paid,
//    0 still pending, 0 failed. Stuck >12h: Sarah, James."

import { NextRequest, NextResponse } from 'next/server';
import { makeSupabase, sendSMS } from '@/lib/dental-outbound';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth   = req.headers.get('authorization') ?? '';
  if (!secret || auth !== `Bearer ${secret}`) {
    const tokenLen = auth.startsWith('Bearer ') ? auth.length - 7 : auth.length;
    console.log(
      `[cron/daily-summary] auth failed — ` +
      `secret_defined=${!!secret} secret_len=${secret?.length ?? 0} token_len=${tokenLen}`,
    );
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db      = makeSupabase();
  const now     = new Date();
  const since24 = new Date(now.getTime() - 24 * 3_600_000).toISOString();
  const since12 = new Date(now.getTime() - 12 * 3_600_000).toISOString();

  // ── Run all queries concurrently ──────────────────────────
  const [
    newResult,
    calledResult,
    bookedResult,
    depositsResult,
    pendingResult,
    failedResult,
    stuckResult,
  ] = await Promise.all([

    // New enquiries submitted in last 24h
    db.from('dental_enquiries')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since24),

    // Of those, how many got at least one call attempt
    db.from('dental_enquiries')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since24)
      .gte('call_attempts', 1),

    // Leads that moved to 'booked' in last 24h (any cohort)
    db.from('dental_enquiries')
      .select('id', { count: 'exact', head: true })
      .eq('sequence_status', 'booked')
      .gte('updated_at', since24),

    // Deposits paid in last 24h
    db.from('dental_enquiries')
      .select('id', { count: 'exact', head: true })
      .gte('deposit_paid_at', since24),

    // Still pending from today's cohort
    db.from('dental_enquiries')
      .select('id', { count: 'exact', head: true })
      .eq('sequence_status', 'pending')
      .gte('created_at', since24),

    // Exhausted (gave up) in last 24h
    db.from('dental_enquiries')
      .select('id', { count: 'exact', head: true })
      .eq('sequence_status', 'exhausted')
      .gte('updated_at', since24),

    // Stuck: pending with next_call_at overdue by > 12h (cron missed, env misconfigured, etc.)
    db.from('dental_enquiries')
      .select('first_name')
      .eq('sequence_status', 'pending')
      .lt('next_call_at', since12)
      .order('next_call_at', { ascending: true })
      .limit(4),

  ]);

  const n = (r: { count: number | null }) => r.count ?? 0;

  const stats = {
    new:      n(newResult),
    called:   n(calledResult),
    booked:   n(bookedResult),
    deposits: n(depositsResult),
    pending:  n(pendingResult),
    failed:   n(failedResult),
    stuck:    (stuckResult.data ?? []).length,
  };

  // ── Build message ─────────────────────────────────────────
  // Base line — fixed text ~120 chars for max realistic numbers
  let msg =
    `StaffxAI daily: ${stats.new} enquir${stats.new === 1 ? 'y' : 'ies'}, ` +
    `${stats.called} called, ${stats.booked} booked, ` +
    `${stats.deposits} deposit${stats.deposits === 1 ? '' : 's'} paid, ` +
    `${stats.pending} still pending, ${stats.failed} failed.`;

  // Append stuck-lead names if any (first names only, comma-separated)
  const stuckNames = (stuckResult.data ?? []).map(r => r.first_name as string).filter(Boolean);
  if (stuckNames.length > 0) {
    const nameList = stuckNames.join(', ');
    const suffix   = ` Stuck >12h: ${nameList}.`;
    // Only append if it fits in the 320-char budget
    if (msg.length + suffix.length <= 320) {
      msg += suffix;
    } else {
      // Truncate name list to fit
      const budget  = 320 - msg.length - ' Stuck >12h: …'.length - 1;
      const trimmed = nameList.slice(0, Math.max(budget, 0));
      msg += ` Stuck >12h: ${trimmed}…`;
    }
  }

  // Hard cap — should never trigger given the format above
  if (msg.length > 320) msg = msg.slice(0, 317) + '...';

  // ── Send ──────────────────────────────────────────────────
  const to = process.env.PRACTICE_ALERT_MOBILE;
  if (!to || to === 'placeholder') {
    console.log(`[daily-summary] dry-run (no PRACTICE_ALERT_MOBILE)\n  ${msg}`);
    return NextResponse.json({ message: msg, stats, dry_run: true });
  }

  await sendSMS(to, msg).catch((e: unknown) =>
    console.error('[daily-summary] SMS failed:', e instanceof Error ? e.message : e),
  );

  console.log(`[daily-summary] sent — ${msg.length} chars`);
  return NextResponse.json({ message: msg, stats });
}
