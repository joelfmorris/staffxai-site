// app/api/retell/webhook/route.ts
//
// POST — receives Retell post-call webhook events.
// Only processes 'call_ended'. All other events → 204.
//
// Outcome logic:
//   deposit_sent_at set              → 'booked', stop sequence
//   duration >= 30s, not booked      → 'human_engaged', flag for review, stop retrying
//   voicemail / machine / short call → failed attempt, schedule next per retry ladder
//   attempts >= 4 after failure      → 'exhausted', send final booking SMS

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { makeSupabase, nextCallAt, sendSMS } from '@/lib/dental-outbound';

const HUMAN_THRESHOLD_MS = 30_000;
const NO_ANSWER_REASONS  = new Set([
  'voicemail_reached', 'machine_detected', 'inactivity', 'max_duration_reached',
]);

// ── Signature verification ────────────────────────────────────

function verifyRetellSignature(rawBody: string, signature: string): boolean {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    console.warn('[retell/webhook] RETELL_API_KEY not set — skipping verification');
    return true;
  }
  const match = signature.match(/^v=(\d+),d=(.*)$/);
  if (!match) return false;
  const [, timestamp, digest] = match;
  if (Math.abs(Date.now() - Number(timestamp)) > 5 * 60 * 1000) return false;
  const expected = createHmac('sha256', apiKey).update(rawBody + timestamp).digest('hex');
  try {
    const eBuf = Buffer.from(expected, 'hex');
    const dBuf = Buffer.from(digest, 'hex');
    if (eBuf.length !== dBuf.length) return false;
    return timingSafeEqual(eBuf, dBuf);
  } catch {
    return false;
  }
}

// ── Handler ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody   = await req.text();
  const signature = req.headers.get('x-retell-signature') ?? '';

  if (!verifyRetellSignature(rawBody, signature)) {
    return new NextResponse(null, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  // Only process call_ended; acknowledge everything else silently
  if (payload.event !== 'call_ended') {
    return new NextResponse(null, { status: 204 });
  }

  const call = (payload.call ?? {}) as Record<string, unknown>;
  const callId             = call.call_id as string | undefined;
  const startTs            = call.start_timestamp as number | undefined;
  const endTs              = call.end_timestamp   as number | undefined;
  const disconnectReason   = (call.disconnection_reason as string | undefined) ?? '';
  const recordingUrl       = (call.recording_url as string | undefined) ?? null;
  const dynVars            = (call.retell_llm_dynamic_variables ?? {}) as Record<string, unknown>;
  const leadIdFromVars     = dynVars.lead_id as string | undefined;

  const durationMs     = (startTs && endTs) ? endTs - startTs : 0;
  const isNoAnswer     = NO_ANSWER_REASONS.has(disconnectReason) || durationMs < HUMAN_THRESHOLD_MS;
  const isHumanEngaged = !isNoAnswer;

  console.log(`[retell/webhook] call_ended — call_id=${callId} duration=${durationMs}ms reason=${disconnectReason}`);

  const db = makeSupabase();

  // Resolve lead: by retell_call_id first, fall back to dynamic var lead_id
  let lead: Record<string, unknown> | null = null;

  if (callId) {
    const { data } = await db
      .from('dental_enquiries')
      .select('id, mobile, first_name, call_attempts, deposit_sent_at, sequence_status')
      .eq('retell_call_id', callId)
      .maybeSingle();
    lead = data;
  }

  if (!lead && leadIdFromVars) {
    const { data } = await db
      .from('dental_enquiries')
      .select('id, mobile, first_name, call_attempts, deposit_sent_at, sequence_status')
      .eq('id', leadIdFromVars)
      .maybeSingle();
    lead = data;
  }

  if (!lead) {
    console.warn(`[retell/webhook] no lead — call_id=${callId} lead_id_var=${leadIdFromVars}`);
    return new NextResponse(null, { status: 204 });
  }

  const leadId        = lead.id as string;
  const mobile        = lead.mobile as string;
  const firstName     = lead.first_name as string;
  const attempts      = (lead.call_attempts as number | null) ?? 1;
  const depositSentAt = lead.deposit_sent_at as string | null;
  const ts            = new Date().toISOString();

  // Include recording URL in every outcome update if Retell provided one
  const transcriptFields = recordingUrl ? { call_transcript_url: recordingUrl } : {};

  async function updateLead(fields: Record<string, unknown>) {
    const { error } = await db
      .from('dental_enquiries')
      .update({ ...fields, updated_at: ts })
      .eq('id', leadId);
    if (error) console.error('[retell/webhook] lead update failed:', error.message);
  }

  // ── Booked: deposit was sent during the call ──────────────
  if (depositSentAt) {
    console.log(`[retell/webhook] ${leadId} — BOOKED`);
    await updateLead({ sequence_status: 'booked', last_call_outcome: 'booked', ...transcriptFields });
    return new NextResponse(null, { status: 204 });
  }

  // ── Human engaged but no deposit: flag for review ─────────
  if (isHumanEngaged) {
    const secs = Math.round(durationMs / 1000);
    console.log(`[retell/webhook] ${leadId} — human engaged ${secs}s, not booked → flag`);

    await updateLead({
      sequence_status:   'pending',
      last_call_outcome: 'human_engaged',
      needs_human:       true,
      human_flag_reason: `Call lasted ${secs}s without deposit — manual follow-up needed`,
      ...transcriptFields,
    });

    const alertMobile = process.env.PRACTICE_ALERT_MOBILE;
    if (alertMobile) {
      await sendSMS(
        alertMobile,
        `Follow-up needed: ${firstName} (${mobile}) spoke with Maya for ${secs}s but didn't pay the deposit. Call them back. — Maya`,
      ).catch((e: unknown) =>
        console.error('[retell/webhook] alert SMS failed:', e instanceof Error ? e.message : e),
      );
    }

    return new NextResponse(null, { status: 204 });
  }

  // ── No answer / voicemail: schedule next attempt ──────────
  console.log(`[retell/webhook] ${leadId} — no answer (reason=${disconnectReason}) attempts=${attempts}`);
  const next = nextCallAt(attempts);

  if (!next) {
    // Sequence exhausted
    console.log(`[retell/webhook] ${leadId} — exhausted after ${attempts} attempt(s)`);
    await updateLead({ sequence_status: 'exhausted', last_call_outcome: 'exhausted', ...transcriptFields });

    const bookingLink = process.env.BOOKING_LINK;
    if (bookingLink) {
      await sendSMS(
        mobile,
        `Hi ${firstName}, we tried reaching you a few times but couldn't connect. You're welcome to book a consultation directly at ${bookingLink}. — Cranbourne Dental`,
      ).catch((e: unknown) =>
        console.error('[retell/webhook] exhausted SMS failed:', e instanceof Error ? e.message : e),
      );
    }
  } else {
    console.log(`[retell/webhook] ${leadId} — scheduling attempt ${attempts + 1} at ${next.toISOString()}`);
    await updateLead({
      sequence_status:   'pending',
      last_call_outcome: disconnectReason || 'no_answer',
      next_call_at:      next.toISOString(),
      ...transcriptFields,
    });
  }

  return new NextResponse(null, { status: 204 });
}
