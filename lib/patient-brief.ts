// lib/patient-brief.ts
//
// Generates and delivers the pre-consultation patient brief.
// Called by the cron route ~24h before appointment_at.
//
// Email env vars: SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS
// Recipient:      PRACTICE_EMAIL
// Dry-runs safely when any env var is missing.

import nodemailer from 'nodemailer';
import type { Supabase } from './dental-outbound';

// ── Brief data shape ──────────────────────────────────────────

export interface LeadBrief {
  id:                                string;
  first_name:                        string;
  mobile:                            string;
  email?:                            string | null;
  treatment_interest?:               string | null;
  timeline?:                         string | null;
  prior_consult?:                    boolean | null;
  appointment_at?:                   string | null;
  tooth_rating?:                     number | null;
  readiness_rating?:                 number | null;
  treatment_scope?:                  string | null;
  dental_situation?:                 string | null;
  emotional_impact?:                 string | null;
  lifestyle_impact?:                 string | null;
  verbatim_quotes?:                  string | null;
  call_notes?:                       string | null;
  milestone_event?:                  string | null;
  vacation_goal?:                    string | null;
  trigger_event?:                    string | null;
  investment_comfort?:               string | null;
  funding_pathway?:                  string | null;
  who_involved?:                     string | null;
  partner_name?:                     string | null;
  partner_attending?:                boolean | null;
  previous_dentist?:                 string | null;
  previous_treatment_stopped_reason?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────

function fmtMelbourne(iso: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: 'Australia/Melbourne',
  }).format(new Date(iso));
}

function stars(n: number, max = 10): string {
  const filled = Math.round(n);
  return '●'.repeat(filled) + '○'.repeat(max - filled) + `  ${n}/${max}`;
}

function join(...parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(' · ');
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

  const section = (title: string, body: string) => {
    if (!body.trim()) return;
    lines.push(`  ${title}`);
    lines.push(`  ${body}`);
    lines.push('');
  };

  section('SELF-ASSESSMENT',
    join(
      lead.tooth_rating     != null ? `Tooth: ${lead.tooth_rating}/10`     : null,
      lead.readiness_rating != null ? `Readiness: ${lead.readiness_rating}/10` : null,
    ),
  );

  section('DESIRED OUTCOME',
    join(lead.treatment_scope, lead.dental_situation, lead.treatment_interest),
  );

  section('EMOTIONAL DRIVER',
    join(lead.emotional_impact, lead.lifestyle_impact),
  );

  section('OCCASION / DEADLINE',
    join(lead.milestone_event, lead.vacation_goal, lead.trigger_event),
  );

  section('FUNDING PATHWAY',
    join(lead.investment_comfort, lead.funding_pathway),
  );

  const attending = join(
    lead.who_involved,
    lead.partner_name ? `Partner: ${lead.partner_name}` : null,
    lead.partner_attending === true  ? '(attending)' : null,
    lead.partner_attending === false ? '(not attending)' : null,
  );
  section('ATTENDING', attending);

  const prior = join(
    lead.prior_consult ? 'Has had prior consultation' : null,
    lead.previous_dentist ? `Prev. dentist: ${lead.previous_dentist}` : null,
    lead.previous_treatment_stopped_reason,
  );
  section('PRIOR HISTORY', prior);

  const quotes = [lead.verbatim_quotes, lead.call_notes].filter(Boolean).join('\n\n  ');
  if (quotes) {
    lines.push('  VERBATIM NOTES');
    lines.push(`  "${quotes}"`);
    lines.push('');
  }

  lines.push('──────────────────────────────────────────────');
  lines.push(`  ${lead.mobile}${lead.email ? `  ·  ${lead.email}` : ''}`);
  if (lead.timeline) lines.push(`  Timeline: ${lead.timeline}`);
  lines.push('══════════════════════════════════════════════');

  return lines.join('\n');
}

// ── HTML brief ────────────────────────────────────────────────

export function buildBriefHtml(lead: LeadBrief): string {
  const appt = lead.appointment_at ? fmtMelbourne(lead.appointment_at) : 'Time TBC';

  const row = (label: string, value: string | null | undefined) =>
    value?.trim()
      ? `<tr>
          <td style="padding:8px 16px 8px 0;font-size:12px;font-weight:600;text-transform:uppercase;
                     letter-spacing:0.08em;color:#6E665E;white-space:nowrap;vertical-align:top;
                     width:160px">${label}</td>
          <td style="padding:8px 0;font-size:14px;color:#1C1916;line-height:1.6">${value}</td>
        </tr>`
      : '';

  const ratings = [
    lead.tooth_rating     != null ? `<span style="margin-right:20px"><strong>Tooth</strong><br><span style="font-family:monospace;letter-spacing:2px">${stars(lead.tooth_rating)}</span></span>` : '',
    lead.readiness_rating != null ? `<span><strong>Readiness to proceed</strong><br><span style="font-family:monospace;letter-spacing:2px">${stars(lead.readiness_rating)}</span></span>` : '',
  ].filter(Boolean).join('');

  const outcome  = join(lead.treatment_scope, lead.dental_situation, lead.treatment_interest);
  const emotional = join(lead.emotional_impact, lead.lifestyle_impact);
  const occasion  = join(lead.milestone_event, lead.vacation_goal, lead.trigger_event);
  const funding   = join(lead.investment_comfort, lead.funding_pathway);
  const attending = join(
    lead.who_involved,
    lead.partner_name ? `Partner: ${lead.partner_name}` : null,
    lead.partner_attending === true  ? '(attending)' : null,
    lead.partner_attending === false ? '(not attending)' : null,
  );
  const prior = join(
    lead.prior_consult ? 'Has had prior consultation' : null,
    lead.previous_dentist ? `Prev. dentist: ${lead.previous_dentist}` : null,
    lead.previous_treatment_stopped_reason,
  );
  const quotes = [lead.verbatim_quotes, lead.call_notes].filter(Boolean).join('<br><br>');

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 16px;background:#F7F4F0;font-family:Georgia,serif">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;
              box-shadow:0 1px 3px rgba(0,0,0,0.08)">

    <!-- Header -->
    <div style="background:#4A7C6B;padding:28px 32px">
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;
                color:rgba(255,255,255,0.75);font-family:Arial,sans-serif">
        Cranbourne Dental Studio · Patient Brief
      </p>
      <h1 style="margin:0 0 4px;font-size:26px;font-weight:normal;color:#fff">
        ${lead.first_name}
      </h1>
      <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.85);font-family:Arial,sans-serif">
        ${appt}
      </p>
    </div>

    <!-- Ratings -->
    ${ratings ? `
    <div style="padding:20px 32px;background:#EAF0EE;border-bottom:1px solid #E3DDD5">
      <div style="font-size:13px;color:#1C1916">${ratings}</div>
    </div>` : ''}

    <!-- Body -->
    <div style="padding:24px 32px">
      <table style="width:100%;border-collapse:collapse">
        ${row('Desired outcome',   outcome)}
        ${row('Emotional driver',  emotional)}
        ${row('Occasion/deadline', occasion)}
        ${row('Funding pathway',   funding)}
        ${row('Attending',         attending)}
        ${row('Prior history',     prior)}
      </table>

      ${quotes ? `
      <div style="margin-top:20px;padding:16px;background:#F7F4F0;border-left:3px solid #4A7C6B;
                  border-radius:4px">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;
                  color:#6E665E;font-family:Arial,sans-serif">Verbatim Notes</p>
        <p style="margin:0;font-size:14px;color:#1C1916;line-height:1.7;font-style:italic">
          &ldquo;${quotes}&rdquo;
        </p>
      </div>` : ''}
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;background:#F7F4F0;border-top:1px solid #E3DDD5">
      <p style="margin:0;font-size:12px;color:#6E665E;font-family:Arial,sans-serif">
        ${lead.mobile}${lead.email ? `  ·  ${lead.email}` : ''}
        ${lead.timeline ? `  ·  Timeline: ${lead.timeline}` : ''}
      </p>
      <p style="margin:4px 0 0;font-size:11px;color:#9E9690;font-family:Arial,sans-serif">
        Sent by Maya · StaffxAI
      </p>
    </div>
  </div>
</body>
</html>`.trim();
}

// ── Email sender ──────────────────────────────────────────────

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || host === 'placeholder' || !user || user === 'placeholder' || !pass || pass === 'placeholder') {
    console.log(`[patient-brief] Email dry-run → ${opts.to}\n  Subject: ${opts.subject}`);
    return false;
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
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

// ── Send brief + mark sent ────────────────────────────────────

export async function sendPatientBrief(lead: LeadBrief, db: Supabase): Promise<boolean> {
  const practiceEmail = process.env.PRACTICE_EMAIL;
  if (!practiceEmail) {
    console.warn('[patient-brief] PRACTICE_EMAIL not set — brief not sent');
    return false;
  }

  const appt = lead.appointment_at ? fmtMelbourne(lead.appointment_at) : 'upcoming appointment';
  const subject = `Patient brief — ${lead.first_name} · ${appt}`;

  const html = buildBriefHtml(lead);
  const text = buildBriefText(lead);

  try {
    const sent = await sendEmail({ to: practiceEmail, subject, html, text });
    const ts = new Date().toISOString();

    await db
      .from('dental_enquiries')
      .update({ brief_sent_at: ts, updated_at: ts })
      .eq('id', lead.id);

    console.log(`[patient-brief] ${sent ? 'sent' : 'dry-run'} — lead=${lead.id} to=${practiceEmail}`);
    return sent;
  } catch (e: unknown) {
    console.error('[patient-brief] failed:', e instanceof Error ? e.message : e);
    return false;
  }
}
