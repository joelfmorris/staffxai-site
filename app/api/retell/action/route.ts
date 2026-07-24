// app/api/retell/action/route.ts
//
// POST — single action-dispatch endpoint for Retell AI mid-call custom functions.
// Retell sends a flat JSON body: { "action": "...", "lead_id": "...", ...fields }
//
// Supported actions:
//   send_deposit  — send $50 deposit SMS via Twilio; 10-min idempotency guard
//   log_capture   — write profile fields to dental_enquiries (whitelist enforced)
//   flag_human    — set needs_human flag, email/SMS alert to practice
//
// IMPORTANT: rawBody is read before JSON.parse so Retell signature verification
// runs against the original bytes, not re-serialised JSON.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';
import twilio from 'twilio';

// ── Supabase ──────────────────────────────────────────────────

function makeSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

type SupabaseClient = ReturnType<typeof makeSupabase>;

// ── Retell signature verification ─────────────────────────────

function verifyRetellSignature(rawBody: string, signature: string): boolean {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    console.warn('[retell/action] RETELL_API_KEY not set — skipping signature verification');
    return true;
  }

  const match = signature.match(/^v=(\d+),d=(.*)$/);
  if (!match) return false;

  const [, timestamp, digest] = match;

  // Replay protection — reject signatures older or newer than 5 minutes
  if (Math.abs(Date.now() - Number(timestamp)) > 5 * 60 * 1000) return false;

  const expected = createHmac('sha256', apiKey)
    .update(rawBody + timestamp)
    .digest('hex');

  try {
    const eBuf = Buffer.from(expected, 'hex');
    const dBuf = Buffer.from(digest, 'hex');
    if (eBuf.length !== dBuf.length) return false;
    return timingSafeEqual(eBuf, dBuf);
  } catch {
    return false;
  }
}

// ── Utils ─────────────────────────────────────────────────────

function isMissing(val: string | undefined): boolean {
  return !val || val.toLowerCase() === 'placeholder';
}

function normaliseAU(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  if (digits.startsWith('61')) return '+' + digits;
  if (digits.startsWith('0'))  return '+61' + digits.slice(1);
  return '+61' + digits;
}

function now(): string {
  return new Date().toISOString();
}

// ── SMS via Twilio ────────────────────────────────────────────

async function sendSMS(to: string, body: string): Promise<boolean> {
  if (
    isMissing(process.env.TWILIO_SID) ||
    isMissing(process.env.TWILIO_AUTH) ||
    isMissing(process.env.TWILIO_FROM)
  ) {
    const masked = normaliseAU(to).replace(/(\+\d{4})\d+(\d{3})$/, '$1 *** $2');
    console.log(`[retell/action] SMS dry-run → ${masked}\n  "${body}"`);
    return false;
  }

  const client = twilio(process.env.TWILIO_SID!, process.env.TWILIO_AUTH!);
  await client.messages.create({
    from: process.env.TWILIO_FROM!,
    to:   normaliseAU(to),
    body,
  });
  return true;
}

// ── DNC check ─────────────────────────────────────────────────

async function checkDNC(db: SupabaseClient, mobile: string): Promise<string | null> {
  const norm = normaliseAU(mobile);
  const { data, error } = await db
    .from('do_not_contact')
    .select('reason')
    .eq('mobile', norm)
    .maybeSingle();

  if (error) {
    console.warn('[retell/action] DNC check error — defaulting to allow:', error.message);
    return null;
  }
  return data?.reason ?? null;
}

// ── Lead types & helpers ──────────────────────────────────────

interface Lead {
  id: string;
  client_id: string;
  first_name: string;
  mobile: string;
  email?: string | null;
  status: string;
  deposit_sent_at?: string | null;
}

async function fetchLeadById(db: SupabaseClient, id: string): Promise<Lead | null> {
  const { data } = await db
    .from('dental_enquiries')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data ?? null;
}

async function fetchLeadByMobile(db: SupabaseClient, mobile: string): Promise<Lead | null> {
  const norm = normaliseAU(mobile);
  const { data } = await db
    .from('dental_enquiries')
    .select('*')
    .eq('mobile', norm)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function resolveLead(
  db: SupabaseClient,
  leadId?: string,
  mobile?: string,
): Promise<Lead | null> {
  if (leadId && leadId.trim()) {
    const lead = await fetchLeadById(db, leadId.trim());
    if (lead) return lead;
  }
  if (mobile && mobile.trim()) {
    return fetchLeadByMobile(db, mobile.trim());
  }
  return null;
}

async function updateLead(db: SupabaseClient, id: string, fields: Record<string, unknown>) {
  const { error } = await db
    .from('dental_enquiries')
    .update({ ...fields, updated_at: now() })
    .eq('id', id);
  if (error) throw new Error(`Lead update failed (${id}): ${error.message}`);
}

// ── agent_runs logger ─────────────────────────────────────────

async function logRun(
  db: SupabaseClient,
  lead: Lead | null,
  action: string,
  input: object,
  output: object,
  durationMs: number,
) {
  const ts = now();
  const { error } = await db.from('agent_runs').insert({
    agent_name:   'retell',
    status:       'success',
    input: {
      source:     'retell',
      action,
      lead_id:    lead?.id,
      client_id:  lead?.client_id,
      first_name: lead?.first_name,
      ...input,
    },
    output,
    duration_ms:  durationMs,
    started_at:   ts,
    completed_at: ts,
  });
  if (error) console.warn('[retell/action] agent_runs log failed:', error.message);
}

// ── Action: send_deposit ──────────────────────────────────────

const DEPOSIT_DEDUP_MINUTES = 10;

async function actionSendDeposit(db: SupabaseClient, lead: Lead): Promise<object> {
  if (lead.status === 'unsubscribed') {
    return { status: 'skipped', reason: 'unsubscribed' };
  }

  // Idempotency guard — don't resend within 10 minutes
  if (lead.deposit_sent_at) {
    const minsAgo = (Date.now() - new Date(lead.deposit_sent_at).getTime()) / 60_000;
    if (minsAgo < DEPOSIT_DEDUP_MINUTES) {
      console.log(`[retell/action] send_deposit idempotency hit — sent ${minsAgo.toFixed(1)}m ago`);
      return { status: 'already_sent' };
    }
  }

  const depositLink = process.env.STRIPE_DEPOSIT_LINK;
  if (isMissing(depositLink)) {
    throw new Error('STRIPE_DEPOSIT_LINK not configured');
  }

  const dncReason = await checkDNC(db, lead.mobile);
  if (dncReason) {
    return { status: 'skipped', reason: `dnc: ${dncReason}` };
  }

  const text =
    `Here's your secure link to hold your consultation: ${depositLink}. ` +
    `It's $50 and fully refundable — deducted from any treatment you go ahead ` +
    `with. Once paid, I'll send your booking link straight away. — Maya`;

  await sendSMS(lead.mobile, text);

  await updateLead(db, lead.id, {
    status:          'deposit_sent',
    deposit_sent_at: now(),
  });

  return { status: 'sent' };
}

// ── Action: log_capture ───────────────────────────────────────
// Whitelist from maya-actions.js + who_involved from Retell spec

const LOG_CAPTURE_ALLOWED = new Set([
  'treatment_scope', 'missing_teeth_count', 'missing_teeth_locations',
  'dental_situation', 'gum_disease_noted',
  'previous_dentist', 'previous_treatment_stopped_reason',
  'tooth_rating', 'readiness_rating',
  'lifestyle_impact', 'emotional_impact', 'vacation_goal',
  'milestone_event', 'trigger_event',
  'investment_comfort', 'funding_pathway', 'who_involved',
  'decision_maker', 'partner_name', 'partner_attending',
  'preferred_slot_start', 'preferred_slot_label',
  'call_notes',
]);

async function actionLogCapture(
  db: SupabaseClient,
  lead: Lead,
  body: Record<string, unknown>,
): Promise<object> {
  const toWrite: Record<string, unknown> = {};
  const rejected: string[] = [];

  for (const [k, v] of Object.entries(body)) {
    if (['action', 'lead_id', 'mobile'].includes(k)) continue;
    if (v == null || v === '') continue;
    if (LOG_CAPTURE_ALLOWED.has(k)) {
      toWrite[k] = v;
    } else {
      rejected.push(k);
    }
  }

  if (rejected.length) {
    console.warn('[retell/action] log_capture: rejected fields:', rejected.join(', '));
  }

  const fieldsWritten = Object.keys(toWrite);
  if (fieldsWritten.length === 0) {
    return { status: 'logged', fields_written: [] };
  }

  await updateLead(db, lead.id, toWrite);
  return { status: 'logged', fields_written: fieldsWritten };
}

// ── Action: flag_human ────────────────────────────────────────

async function actionFlagHuman(
  db: SupabaseClient,
  lead: Lead,
  reason: string,
): Promise<object> {
  await updateLead(db, lead.id, {
    needs_human:       true,
    human_flag_reason: reason,
  });

  // TODO: Send email alert via Nodemailer
  // Install: npm install nodemailer @types/nodemailer
  // Required env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ALERT_EMAIL
  // Subject: `🚨 Maya escalation: ${lead.first_name}`
  // Body: Patient: ${lead.first_name} (${lead.mobile})\nReason: ${reason}
  console.log(
    `[retell/action] FLAG_HUMAN ALERT — ${lead.first_name} (${lead.mobile}): ${reason}`,
  );

  // Also SMS the practice alert mobile if configured
  if (!isMissing(process.env.PRACTICE_ALERT_MOBILE)) {
    const alertText =
      `🚨 Maya escalation\n` +
      `Patient: ${lead.first_name}  ${lead.mobile}\n` +
      `Reason: ${reason}\n` +
      `Call back ASAP. — Maya`;
    await sendSMS(process.env.PRACTICE_ALERT_MOBILE!, alertText).catch(e =>
      console.error('[retell/action] alert SMS failed:', e.message),
    );
  }

  return { status: 'flagged' };
}

// ── Handler ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Read raw body BEFORE parsing — signature verification must run against original bytes
  const rawBody = await req.text();
  const signature = req.headers.get('x-retell-signature') ?? '';

  if (!verifyRetellSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid Retell signature' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const action    = typeof body.action   === 'string' ? body.action   : '';
  const leadId    = typeof body.lead_id  === 'string' ? body.lead_id  : undefined;
  const mobile    = typeof body.mobile   === 'string' ? body.mobile   : undefined;

  if (!action) {
    return NextResponse.json(
      { error: 'Missing required field: action' },
      { status: 400 },
    );
  }

  const VALID_ACTIONS = ['send_deposit', 'log_capture', 'flag_human'];
  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `Unknown action '${action}'. Valid: ${VALID_ACTIONS.join(', ')}` },
      { status: 400 },
    );
  }

  const db   = makeSupabase();
  const t0   = Date.now();

  // Lead resolution — voice call must not break if lead can't be found
  const lead = await resolveLead(db, leadId, mobile);
  if (!lead) {
    console.warn(`[retell/action] no lead resolved — lead_id=${leadId} mobile=${mobile}`);
    await logRun(db, null, action, { lead_id: leadId, mobile }, { status: 'skipped', reason: 'no_lead' }, Date.now() - t0);
    return NextResponse.json({ status: 'skipped', reason: 'no_lead' });
  }

  try {
    let result: object;

    switch (action) {
      case 'send_deposit':
        result = await actionSendDeposit(db, lead);
        break;

      case 'log_capture':
        result = await actionLogCapture(db, lead, body);
        break;

      case 'flag_human': {
        const reason = typeof body.reason === 'string' && body.reason.trim()
          ? body.reason.trim()
          : 'No reason provided';
        result = await actionFlagHuman(db, lead, reason);
        break;
      }

      default:
        // Guard only — VALID_ACTIONS check above already covers this
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    await logRun(db, lead, action, { lead_id: leadId }, result, Date.now() - t0);
    return NextResponse.json(result);

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[retell/action] ${action} failed:`, message);
    await logRun(db, lead, action, { lead_id: leadId }, { error: message }, Date.now() - t0).catch(() => {});
    // Return 200 so a runtime error doesn't break the voice call
    return NextResponse.json({ status: 'error', error: message });
  }
}
