// app/api/retell/webhook/route.ts
//
// POST — receives Retell post-call webhook events.
// Only processes 'call_ended'. All other events → 204.
//
// Outcome logic:
//   deposit_sent_at set              → 'deposit_chasing': SMS at promise_time / +2h, requeue at +24h
//   duration >= 30s, not booked      → 'human_engaged', flag for review, stop retrying
//   voicemail / machine / short call → failed attempt, schedule next per retry ladder
//   attempts >= 4 after failure      → 'exhausted', send final booking SMS
//
// Post-call field extraction:
//   Runs in background (waitUntil) after call_ended on any real conversation.
//   Uses Claude Haiku to extract emotional/clinical fields from call.transcript.
//   Requires ANTHROPIC_API_KEY env var. Skipped for voicemails / no-answer calls.

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { waitUntil } from '@vercel/functions';
import { makeSupabase, nextCallAt, sendSMS, clampToMelbourneWindow } from '@/lib/dental-outbound';
import type { Supabase } from '@/lib/dental-outbound';

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

// ── Post-call field extraction ────────────────────────────────
//
// Calls Claude Haiku with the call transcript and writes extracted fields
// back to dental_enquiries. Only called when a real conversation happened.
// Runs via waitUntil so the webhook returns 204 immediately.

// Fields the LLM is allowed to write — mirrors LOG_CAPTURE_ALLOWED in action route
const EXTRACTION_ALLOWED = new Set([
  'tooth_rating', 'readiness_rating',
  'treatment_scope', 'dental_situation', 'missing_teeth_count', 'missing_teeth_locations', 'gum_disease_noted',
  'emotional_impact', 'lifestyle_impact',
  'verbatim_quotes', 'call_notes',
  'milestone_event', 'vacation_goal', 'trigger_event',
  'investment_comfort', 'funding_pathway', 'payment_plan_eligible', 'deposit_promise_time',
  'who_involved', 'decision_maker', 'partner_name', 'partner_attending',
  'previous_dentist', 'previous_treatment_stopped_reason',
  'preferred_slot_label',
]);

async function extractCallFields(
  db: Supabase,
  leadId: string,
  transcript: string,
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn(`[retell/webhook] ANTHROPIC_API_KEY not set — skipping extraction for lead ${leadId}`);
    return;
  }

  if (!transcript.trim()) {
    console.log(`[retell/webhook] empty transcript — skipping extraction for lead ${leadId}`);
    return;
  }

  const prompt = `You are extracting structured data from a dental practice sales call. Maya is the AI assistant; the other speaker is the patient.

Extract the fields below from the transcript. Return valid JSON only — no markdown fences, no explanation, no keys with null values. Omit any field you cannot confidently extract.

Fields:
- tooth_rating (integer 1–10): patient's self-rating of their dental situation
- readiness_rating (integer 1–10): patient's readiness to proceed with treatment
- treatment_scope (string): what treatment they want, e.g. "full arch implants", "6 veneers"
- dental_situation (string): current dental condition in their words
- missing_teeth_count (integer): number of missing teeth if stated
- missing_teeth_locations (string): where missing teeth are
- gum_disease_noted (boolean): was gum disease mentioned
- emotional_impact (string): how their teeth make them feel, affect confidence, etc.
- lifestyle_impact (string): how their teeth affect social life, eating, work, etc.
- verbatim_quotes (string): the single most compelling thing they said, in their exact words
- call_notes (string): 2–3 sentence clinical summary for the dentist
- milestone_event (string): upcoming event driving urgency, e.g. "daughter's wedding in March"
- vacation_goal (string): holiday or trip they mentioned
- trigger_event (string): what prompted them to enquire now
- investment_comfort (string): budget range or price comfort level they mentioned
- funding_pathway (string): how they plan to pay — savings, finance, super, etc.
- payment_plan_eligible (boolean): did they ask about or agree to a payment plan
- deposit_promise_time (string ISO 8601): if they said they would pay at a specific time, e.g. "2026-08-13T14:00:00+10:00"
- who_involved (string): others involved in the decision, e.g. "husband", "both partners"
- decision_maker (string): who makes the final call if not the patient
- partner_name (string): partner's name if mentioned
- partner_attending (boolean): is the partner attending the consultation
- previous_dentist (string): name or practice of previous dentist
- previous_treatment_stopped_reason (string): why they stopped previous treatment
- preferred_slot_label (string): appointment slot they accepted, e.g. "Fri 14 Aug, 10am"

TRANSCRIPT:
${transcript}`;

  let fields: Record<string, unknown>;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[retell/webhook] extraction API ${res.status}: ${text.slice(0, 200)}`);
      return;
    }

    const data = await res.json() as { content: Array<{ type: string; text: string }> };
    const raw  = data.content.find(b => b.type === 'text')?.text ?? '';

    // Strip markdown fences if the model wrapped the JSON
    const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    try {
      fields = JSON.parse(jsonText) as Record<string, unknown>;
    } catch {
      console.error('[retell/webhook] extraction: failed to parse JSON:', raw.slice(0, 300));
      return;
    }
  } catch (e: unknown) {
    console.error('[retell/webhook] extraction fetch threw:', e instanceof Error ? e.message : e);
    return;
  }

  // Apply whitelist — never let the LLM write arbitrary columns
  const toWrite: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (EXTRACTION_ALLOWED.has(k) && v !== null && v !== undefined && v !== '') {
      toWrite[k] = v;
    }
  }

  if (Object.keys(toWrite).length === 0) {
    console.log(`[retell/webhook] extraction: no usable fields for lead ${leadId}`);
    return;
  }

  const { error } = await db
    .from('dental_enquiries')
    .update({ ...toWrite, updated_at: new Date().toISOString() })
    .eq('id', leadId);

  if (error) {
    console.error('[retell/webhook] extraction DB write failed:', error.message);
  } else {
    console.log(`[retell/webhook] extraction: wrote ${Object.keys(toWrite).length} field(s) for lead ${leadId} — ${Object.keys(toWrite).join(', ')}`);
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
  const callId           = call.call_id as string | undefined;
  const startTs          = call.start_timestamp as number | undefined;
  const endTs            = call.end_timestamp   as number | undefined;
  const disconnectReason = (call.disconnection_reason as string | undefined) ?? '';
  const recordingUrl     = (call.recording_url as string | undefined) ?? null;
  const dynVars          = (call.retell_llm_dynamic_variables ?? {}) as Record<string, unknown>;
  const leadIdFromVars   = dynVars.lead_id as string | undefined;

  // Retell sends transcript as a formatted string; transcript_object is the turn array.
  // We prefer the string — it's already formatted for the LLM.
  const transcript = (call.transcript as string | undefined) ?? '';

  const durationMs     = (startTs && endTs) ? endTs - startTs : 0;
  const isNoAnswer     = NO_ANSWER_REASONS.has(disconnectReason) || durationMs < HUMAN_THRESHOLD_MS;
  const isHumanEngaged = !isNoAnswer;

  console.log(`[retell/webhook] call_ended — call_id=${callId} duration=${durationMs}ms reason=${disconnectReason} transcript_len=${transcript.length}`);

  const db = makeSupabase();

  // Resolve lead: by retell_call_id first, fall back to dynamic var lead_id
  let lead: Record<string, unknown> | null = null;

  if (callId) {
    const { data } = await db
      .from('dental_enquiries')
      .select('id, mobile, first_name, call_attempts, deposit_sent_at, deposit_promise_time, sequence_status')
      .eq('retell_call_id', callId)
      .maybeSingle();
    lead = data;
  }

  if (!lead && leadIdFromVars) {
    const { data } = await db
      .from('dental_enquiries')
      .select('id, mobile, first_name, call_attempts, deposit_sent_at, deposit_promise_time, sequence_status')
      .eq('id', leadIdFromVars)
      .maybeSingle();
    lead = data;
  }

  if (!lead) {
    console.warn(`[retell/webhook] no lead — call_id=${callId} lead_id_var=${leadIdFromVars}`);
    return new NextResponse(null, { status: 204 });
  }

  const leadId         = lead.id as string;
  const mobile         = lead.mobile as string;
  const firstName      = lead.first_name as string;
  const attempts       = (lead.call_attempts as number | null) ?? 1;
  const depositSentAt  = lead.deposit_sent_at as string | null;
  const depositPromise = lead.deposit_promise_time as string | null;
  const ts             = new Date().toISOString();

  // Include recording URL in every outcome update if Retell provided one
  const transcriptFields = recordingUrl ? { call_transcript_url: recordingUrl } : {};

  async function updateLead(fields: Record<string, unknown>) {
    const { error } = await db
      .from('dental_enquiries')
      .update({ ...fields, updated_at: ts })
      .eq('id', leadId);
    if (error) console.error('[retell/webhook] lead update failed:', error.message);
  }

  // ── Deposit sent: start chase sequence ───────────────────
  // Deposit link was sent during the call but payment isn't confirmed until
  // the Stripe webhook fires. Schedule a reminder SMS and a requeue check.
  // A real conversation happened → extract fields in background.
  if (depositSentAt) {
    const twoHoursOut  = new Date(Date.now() + 2 * 3_600_000);
    const firstCheckAt = depositPromise
      ? clampToMelbourneWindow(new Date(depositPromise))
      : clampToMelbourneWindow(twoHoursOut);

    console.log(`[retell/webhook] ${leadId} — deposit sent, chasing; first check ${firstCheckAt.toISOString()}`);
    await updateLead({
      sequence_status:       'deposit_chasing',
      last_call_outcome:     'deposit_sent',
      next_deposit_check_at: firstCheckAt.toISOString(),
      ...transcriptFields,
    });

    // Extract emotional/clinical fields from transcript in background
    if (transcript) {
      waitUntil(
        extractCallFields(db, leadId, transcript).catch((e: unknown) =>
          console.error('[retell/webhook] extraction threw (deposit branch):', e instanceof Error ? e.message : e),
        ),
      );
    }

    return new NextResponse(null, { status: 204 });
  }

  // ── Human engaged but no deposit: flag for review ─────────
  // A real conversation happened → extract fields in background.
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

    // Extract emotional/clinical fields from transcript in background
    if (transcript) {
      waitUntil(
        extractCallFields(db, leadId, transcript).catch((e: unknown) =>
          console.error('[retell/webhook] extraction threw (human branch):', e instanceof Error ? e.message : e),
        ),
      );
    }

    return new NextResponse(null, { status: 204 });
  }

  // ── No answer / voicemail: schedule next attempt ──────────
  // No real conversation — skip field extraction.
  console.log(`[retell/webhook] ${leadId} — no answer (reason=${disconnectReason}) attempts=${attempts}`);
  const next = nextCallAt(attempts);

  if (!next) {
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
