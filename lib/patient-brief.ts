// lib/patient-brief.ts
//
// Generates and delivers the pre-consultation patient brief.
//
// Triggers (both check brief_sent_at to send once only):
//   1. Stripe webhook — deposit paid
//   2. Daily cron — appointment_at within 18–30h
//
// Delivery: SendGrid (SENDGRID_API_KEY) → Nodemailer (SMTP_*) → dry-run log
// Recipient: PRACTICE_BRIEF_EMAIL
// Sender:    BRIEF_FROM_EMAIL (SendGrid) or SMTP_USER (Nodemailer)

import nodemailer from 'nodemailer';
import type { Supabase } from './dental-outbound';

// ── Data shape ────────────────────────────────────────────────

export interface LeadBrief {
  id:                                 string;
  first_name:                         string;
  mobile:                             string;
  email?:                             string | null;
  treatment_interest?:                string | null;
  timeline?:                          string | null;
  prior_consult?:                     boolean | null;
  appointment_at?:                    string | null;
  tooth_rating?:                      number | null;
  readiness_rating?:                  number | null;
  treatment_scope?:                   string | null;
  dental_situation?:                  string | null;
  emotional_impact?:                  string | null;
  lifestyle_impact?:                  string | null;
  verbatim_quotes?:                   string | null;
  call_notes?:                        string | null;
  milestone_event?:                   string | null;
  vacation_goal?:                     string | null;
  trigger_event?:                     string | null;
  investment_comfort?:                string | null;
  funding_pathway?:                   string | null;
  payment_plan_eligible?:             boolean | null;
  who_involved?:                      string | null;
  partner_name?:                      string | null;
  partner_attending?:                 boolean | null;
  previous_dentist?:                  string | null;
  previous_treatment_stopped_reason?: string | null;
  deposit_promise_time?:              string | null;
  call_transcript_url?:               string | null;
}

// ── Helpers ───────────────────────────────────────────────────

function fmtMelbourne(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit',
    hour12: true, timeZone: 'Australia/Melbourne',
  }).formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  const h = parseInt(get('hour'), 10);
  const m = parseInt(get('minute'), 10);
  const period = get('dayPeriod').toLowerCase().replace(/\s/g, '');
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const time = m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, '0')}${period}`;
  return `${get('weekday')} ${get('day')} ${get('month')}, ${time}`;
}

function cat(...parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(' · ');
}

// ── HTML brief ────────────────────────────────────────────────

const C = {
  green:      '#3A6B5A',
  greenLight: '#EAF0EE',
  text:       '#1C1916',
  muted:      '#6E665E',
  border:     '#E3DDD5',
  ground:     '#F7F4F0',
  white:      '#FFFFFF',
};

export function buildBriefHtml(lead: LeadBrief): string {
  const appt = lead.appointment_at ? fmtMelbourne(lead.appointment_at) : 'Time TBC';

  // Helper: labelled row in the info table.
  // required=true → renders a muted "— Not captured" placeholder rather than
  // omitting the row entirely, so Dr Ana can see which sections weren't gathered.
  const row = (label: string, value: string | null | undefined, required = false) => {
    const hasValue = value?.trim();
    if (!hasValue && !required) return '';
    const cellContent = hasValue
      ? value!
      : `<span style="color:${C.muted};font-style:italic">— Not captured</span>`;
    return `<tr>
          <td style="padding:10px 20px 10px 0;font-size:11px;font-weight:700;
                     text-transform:uppercase;letter-spacing:0.1em;
                     color:${C.muted};white-space:nowrap;vertical-align:top;width:150px;
                     border-bottom:1px solid ${C.border}">
            ${label}
          </td>
          <td style="padding:10px 0;font-size:14px;color:${C.text};line-height:1.6;
                     border-bottom:1px solid ${C.border}">
            ${cellContent}
          </td>
        </tr>`;
  };

  // Self-assessment block
  const selfRating   = lead.tooth_rating     != null ? `${lead.tooth_rating}/10`     : null;
  const readiness    = lead.readiness_rating != null ? `${lead.readiness_rating}/10` : null;
  const ratingHtml   = [
    selfRating ? `<div style="margin-right:32px;display:inline-block">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${C.muted};margin-bottom:4px">Self-rating</div>
      <div style="font-size:22px;font-weight:600;color:${C.text};letter-spacing:-0.03em">${selfRating}</div>
    </div>` : '',
    readiness  ? `<div style="display:inline-block">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${C.muted};margin-bottom:4px">Readiness</div>
      <div style="font-size:22px;font-weight:600;color:${C.text};letter-spacing:-0.03em">${readiness}</div>
    </div>` : '',
  ].filter(Boolean).join('');

  const desiredOutcome   = cat(lead.treatment_scope, lead.dental_situation, lead.treatment_interest);
  const emotional        = cat(lead.emotional_impact, lead.lifestyle_impact);
  const occasion         = cat(lead.milestone_event, lead.vacation_goal, lead.trigger_event);
  const investment       = [
    cat(lead.investment_comfort, lead.funding_pathway),
    lead.payment_plan_eligible === true  ? 'Payment plan: eligible'     : null,
    lead.payment_plan_eligible === false ? 'Payment plan: not eligible' : null,
  ].filter(Boolean).join('<br>');
  const attending = cat(
    lead.who_involved,
    lead.partner_name ? `Partner: ${lead.partner_name}` : null,
    lead.partner_attending === true  ? '(attending)'     : null,
    lead.partner_attending === false ? '(not attending)' : null,
  );
  const prior = cat(
    lead.prior_consult                          ? 'Has had prior consultation'               : null,
    lead.previous_dentist                       ? `Prev. dentist: ${lead.previous_dentist}` : null,
    lead.previous_treatment_stopped_reason,
  );
  const depositPromise   = lead.deposit_promise_time ? fmtMelbourne(lead.deposit_promise_time) : null;
  const verbatim         = lead.verbatim_quotes ?? lead.call_notes ?? '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Patient Brief — ${lead.first_name}</title>
</head>
<body style="margin:0;padding:32px 16px;background:${C.ground};font-family:Georgia,'Times New Roman',serif">
  <div style="max-width:580px;margin:0 auto">

    <!-- Header -->
    <div style="background:${C.green};padding:28px 32px 24px;border-radius:8px 8px 0 0">
      <p style="margin:0 0 10px;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;
                color:rgba(255,255,255,0.65);font-family:Arial,sans-serif">
        Cranbourne Dental Studio &nbsp;·&nbsp; Patient Brief
      </p>
      <h1 style="margin:0 0 6px;font-size:28px;font-weight:400;color:#fff;letter-spacing:-0.01em">
        ${lead.first_name}
      </h1>
      <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.8);font-family:Arial,sans-serif">
        ${appt}
      </p>
    </div>

    <!-- Self-assessment bar -->
    ${ratingHtml ? `<div style="background:${C.greenLight};padding:18px 32px;border-left:4px solid ${C.green}">
      ${ratingHtml}
    </div>` : ''}

    <!-- In their own words -->
    ${verbatim ? `<div style="background:${C.white};padding:20px 32px;border-left:4px solid #C5A96A">
      <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.15em;
                text-transform:uppercase;color:#8A7040;font-family:Arial,sans-serif">
        In their own words
      </p>
      <p style="margin:0;font-size:15px;color:${C.text};line-height:1.7;font-style:italic">
        &ldquo;${verbatim}&rdquo;
      </p>
    </div>` : ''}

    <!-- Info table -->
    <div style="background:${C.white};padding:8px 32px 16px">
      <table style="width:100%;border-collapse:collapse">
        <tbody>
          ${row('Desired outcome',    desiredOutcome,      true)}
          ${row('Emotional driver',   emotional,           true)}
          ${row('Occasion / deadline', occasion,           true)}
          ${row('Investment',         investment || undefined, true)}
          ${row('Prior attempts',     prior,               true)}
          ${row('Attending',          attending)}
          ${row('Deposit promise',    depositPromise)}
        </tbody>
      </table>
    </div>

    <!-- Call transcript -->
    ${lead.call_transcript_url ? `<div style="background:${C.ground};padding:16px 32px;
                border-top:1px solid ${C.border}">
      <p style="margin:0;font-size:12px;color:${C.muted};font-family:Arial,sans-serif">
        <span style="font-weight:700;text-transform:uppercase;letter-spacing:0.08em;
                     font-size:10px">Call transcript</span><br>
        <a href="${lead.call_transcript_url}" style="color:${C.green}">${lead.call_transcript_url}</a>
      </p>
    </div>` : ''}

    <!-- Footer -->
    <div style="background:${C.ground};padding:16px 32px 20px;border-radius:0 0 8px 8px;
                border-top:1px solid ${C.border}">
      <p style="margin:0 0 2px;font-size:13px;color:${C.text};font-family:Arial,sans-serif">
        ${lead.mobile}${lead.email ? `&nbsp;&nbsp;·&nbsp;&nbsp;${lead.email}` : ''}
      </p>
      ${lead.timeline ? `<p style="margin:0 0 6px;font-size:12px;color:${C.muted};font-family:Arial,sans-serif">
        Timeline: ${lead.timeline}
      </p>` : ''}
      <p style="margin:8px 0 0;font-size:10px;color:#9E9690;font-family:Arial,sans-serif">
        Prepared by Maya &nbsp;·&nbsp; StaffxAI &nbsp;·&nbsp; For Dr Ana and the treatment team
      </p>
    </div>

  </div>
</body>
</html>`;
}

// ── Plain-text brief ──────────────────────────────────────────

export function buildBriefText(lead: LeadBrief): string {
  const appt = lead.appointment_at ? fmtMelbourne(lead.appointment_at) : 'Time TBC';
  const lines: string[] = [
    '══════════════════════════════════════════════',
    `  PATIENT BRIEF — ${lead.first_name.toUpperCase()}`,
    `  Appointment: ${appt}`,
    '══════════════════════════════════════════════',
    '',
  ];

  // required=true → prints "— Not captured" so every core section is visible
  const section = (title: string, body: string | null | undefined, required = false) => {
    if (!body?.trim()) {
      if (!required) return;
      lines.push(`  ${title}`);
      lines.push('  — Not captured');
      lines.push('');
      return;
    }
    lines.push(`  ${title}`);
    lines.push(`  ${body}`);
    lines.push('');
  };

  const investment = [
    cat(lead.investment_comfort, lead.funding_pathway),
    lead.payment_plan_eligible === true  ? 'Payment plan: eligible'     : null,
    lead.payment_plan_eligible === false ? 'Payment plan: not eligible' : null,
  ].filter(Boolean).join(' · ');

  section('SELF-ASSESSMENT', cat(
    lead.tooth_rating     != null ? `Self-rating: ${lead.tooth_rating}/10`     : null,
    lead.readiness_rating != null ? `Readiness: ${lead.readiness_rating}/10` : null,
  ));

  const verbatim = lead.verbatim_quotes ?? lead.call_notes;
  if (verbatim) {
    lines.push('  IN THEIR OWN WORDS');
    lines.push(`  "${verbatim}"`);
    lines.push('');
  }

  section('DESIRED OUTCOME',    cat(lead.treatment_scope, lead.dental_situation, lead.treatment_interest), true);
  section('EMOTIONAL DRIVER',   cat(lead.emotional_impact, lead.lifestyle_impact),                         true);
  section('OCCASION / DEADLINE', cat(lead.milestone_event, lead.vacation_goal, lead.trigger_event),        true);
  section('INVESTMENT',         investment,                                                                true);
  section('PRIOR ATTEMPTS', cat(
    lead.prior_consult                          ? 'Has had prior consultation'               : null,
    lead.previous_dentist                       ? `Prev. dentist: ${lead.previous_dentist}` : null,
    lead.previous_treatment_stopped_reason,
  ), true);
  section('ATTENDING', cat(
    lead.who_involved,
    lead.partner_name ? `Partner: ${lead.partner_name}` : null,
    lead.partner_attending === true  ? '(attending)'     : null,
    lead.partner_attending === false ? '(not attending)' : null,
  ));
  if (lead.deposit_promise_time) {
    section('DEPOSIT PROMISE', fmtMelbourne(lead.deposit_promise_time));
  }

  if (lead.call_transcript_url) {
    lines.push('  CALL TRANSCRIPT');
    lines.push(`  ${lead.call_transcript_url}`);
    lines.push('');
  }

  lines.push('──────────────────────────────────────────────');
  lines.push(`  ${lead.mobile}${lead.email ? `  ·  ${lead.email}` : ''}`);
  if (lead.timeline) lines.push(`  Timeline: ${lead.timeline}`);
  lines.push('══════════════════════════════════════════════');

  return lines.join('\n');
}

// ── Email delivery ────────────────────────────────────────────
// SendGrid (SENDGRID_API_KEY) → Nodemailer (SMTP_*) → dry-run

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  const sgKey  = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.BRIEF_FROM_EMAIL ?? process.env.SMTP_USER ?? '';

  // ── SendGrid ──
  if (sgKey && sgKey !== 'placeholder') {
    const sgMail = (await import('@sendgrid/mail')).default;
    sgMail.setApiKey(sgKey);
    await sgMail.send({
      to:      opts.to,
      from:    fromEmail || 'noreply@staffxai.com.au',
      subject: opts.subject,
      html:    opts.html,
      text:    opts.text,
    });
    return true;
  }

  // ── Nodemailer fallback ──
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && host !== 'placeholder' && user && pass) {
    const transport = nodemailer.createTransport({
      host, port, secure: port === 465, auth: { user, pass },
    });
    await transport.sendMail({
      from:    `"Maya · Cranbourne Dental" <${user}>`,
      to:      opts.to,
      subject: opts.subject,
      text:    opts.text,
      html:    opts.html,
    });
    return true;
  }

  // ── Dry-run ──
  console.log(`[patient-brief] dry-run (no SendGrid key or SMTP) → ${opts.to}\n  Subject: ${opts.subject}`);
  return false;
}

// ── Public entry point ────────────────────────────────────────

export async function sendPatientBrief(lead: LeadBrief, db: Supabase): Promise<boolean> {
  const to = process.env.PRACTICE_BRIEF_EMAIL;
  if (!to) {
    console.warn('[patient-brief] PRACTICE_BRIEF_EMAIL not set — skipping');
    return false;
  }

  const appt    = lead.appointment_at ? fmtMelbourne(lead.appointment_at) : null;
  const subject = appt
    ? `Patient brief: ${lead.first_name} — ${appt}`
    : `Patient brief: ${lead.first_name}`;

  try {
    const sent = await sendEmail({ to, subject, html: buildBriefHtml(lead), text: buildBriefText(lead) });
    const ts   = new Date().toISOString();
    await db.from('dental_enquiries').update({ brief_sent_at: ts, updated_at: ts }).eq('id', lead.id);
    console.log(`[patient-brief] ${sent ? 'sent' : 'dry-run'} — lead=${lead.id} to=${to}`);
    return sent;
  } catch (e: unknown) {
    console.error('[patient-brief] failed:', e instanceof Error ? e.message : e);
    return false;
  }
}
