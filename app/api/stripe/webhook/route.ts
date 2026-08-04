// app/api/stripe/webhook/route.ts
//
// POST — handles Stripe checkout webhooks.
// Only processes 'checkout.session.completed'.
//
// Verification: manual HMAC-SHA256 against STRIPE_WEBHOOK_SECRET (no stripe package needed).
// Lead matching: via client_reference_id appended to the payment link by sendDepositBackground.
// On success: sets deposit_paid_at, triggers patient brief if not already sent.
//
// Required env vars:
//   STRIPE_WEBHOOK_SECRET  — from Stripe dashboard → Webhooks → Signing secret (whsec_...)

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { waitUntil } from '@vercel/functions';
import { makeSupabase } from '@/lib/dental-outbound';
import { sendPatientBrief, type LeadBrief } from '@/lib/patient-brief';

// ── Stripe signature verification ─────────────────────────────
// Header format: t=<unix_seconds>,v1=<hex>,v1=<hex>,...
// Signed payload: `${timestamp}.${rawBody}`

function verifyStripeSignature(rawBody: string, header: string, secret: string): boolean {
  const parts: Record<string, string[]> = {};
  for (const segment of header.split(',')) {
    const eq = segment.indexOf('=');
    if (eq < 0) continue;
    const key = segment.slice(0, eq);
    const val = segment.slice(eq + 1);
    (parts[key] ??= []).push(val);
  }

  const ts         = parts.t?.[0];
  const signatures = parts.v1 ?? [];
  if (!ts || signatures.length === 0) return false;

  // Replay protection: 5-minute window
  if (Math.abs(Date.now() - Number(ts) * 1_000) > 5 * 60 * 1_000) return false;

  const expected = createHmac('sha256', secret)
    .update(`${ts}.${rawBody}`)
    .digest('hex');

  return signatures.some(sig => {
    try {
      const eBuf = Buffer.from(expected, 'hex');
      const sBuf = Buffer.from(sig, 'hex');
      return eBuf.length === sBuf.length && timingSafeEqual(eBuf, sBuf);
    } catch {
      return false;
    }
  });
}

// ── Handler ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const header  = req.headers.get('stripe-signature') ?? '';
  const secret  = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret || secret === 'placeholder') {
    console.warn('[stripe/webhook] STRIPE_WEBHOOK_SECRET not set — skipping signature check');
    // Fall through in dev so local testing still works without the secret
  } else if (!verifyStripeSignature(rawBody, header, secret)) {
    console.warn('[stripe/webhook] signature verification failed');
    return new NextResponse(null, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  // Only care about completed checkouts
  if (event.type !== 'checkout.session.completed') {
    return new NextResponse(null, { status: 204 });
  }

  const session  = (event.data as Record<string, unknown>)?.object as Record<string, unknown> | undefined;
  const refId    = session?.client_reference_id as string | undefined;
  const payStatus = session?.payment_status as string | undefined;

  if (!refId) {
    console.warn('[stripe/webhook] checkout.session.completed — no client_reference_id, ignoring');
    return new NextResponse(null, { status: 204 });
  }

  if (payStatus !== 'paid') {
    console.log(`[stripe/webhook] lead=${refId} payment_status=${payStatus} — not paid, ignoring`);
    return new NextResponse(null, { status: 204 });
  }

  console.log(`[stripe/webhook] deposit paid — lead=${refId}`);

  const db = makeSupabase();

  // Fetch full lead for brief
  const { data: lead, error } = await db
    .from('dental_enquiries')
    .select('*')
    .eq('id', refId)
    .maybeSingle();

  if (error || !lead) {
    console.error(`[stripe/webhook] lead not found — id=${refId}`, error?.message);
    // Return 200 so Stripe doesn't retry endlessly for a logic error
    return NextResponse.json({ status: 'lead_not_found' });
  }

  const ts = new Date().toISOString();

  // Mark deposit paid and advance to booked
  const { error: updateErr } = await db
    .from('dental_enquiries')
    .update({
      deposit_paid_at:  ts,
      status:           'deposit_paid',
      sequence_status:  'booked',
      updated_at:       ts,
    })
    .eq('id', refId);

  if (updateErr) {
    console.error(`[stripe/webhook] update failed — lead=${refId}:`, updateErr.message);
    return NextResponse.json({ status: 'update_failed' }, { status: 500 });
  }

  // Send patient brief if not already sent — runs after response so Stripe gets 200 fast
  if (!lead.brief_sent_at) {
    waitUntil(
      sendPatientBrief(lead as unknown as LeadBrief, db).catch((e: unknown) =>
        console.error('[stripe/webhook] brief failed:', e instanceof Error ? e.message : e),
      ),
    );
  }

  return NextResponse.json({ status: 'ok', lead_id: refId });
}
