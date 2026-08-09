// app/api/retell/availability/route.ts
//
// GET — returns next available Calendly consultation slots for Retell AI to speak aloud.
// Called mid-call as a custom function. Retell reads slots_human verbatim.
//
// Cache strategy (calendly_slot_cache, single row):
//   Fresh  (< 15 min) → return immediately — no Calendly round-trip
//   Stale  (≥ 15 min) → return cached + refresh in background (stale-while-revalidate)
//   Empty  (no row)   → block on Calendly, populate cache, return
//
// Target: < 200ms p99 for fresh/stale hits.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';
import { waitUntil } from '@vercel/functions';
import {
  readCache, refreshCache, isCacheFresh, slotsToHuman,
  type CalendlySlot,
} from '@/lib/calendly-cache';

// ── Supabase ──────────────────────────────────────────────────

function makeSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ── Retell signature verification ─────────────────────────────
// GET has no body — sign the empty string.

function verifyRetellSignature(rawBody: string, signature: string): boolean {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    console.warn('[retell/availability] RETELL_API_KEY not set — skipping signature verification');
    return true;
  }

  const match = signature.match(/^v=(\d+),d=(.*)$/);
  if (!match) return false;

  const [, timestamp, digest] = match;
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

// ── agent_runs logger ─────────────────────────────────────────

async function logRun(
  db: ReturnType<typeof makeSupabase>,
  input: object,
  output: object,
  durationMs: number,
) {
  const ts = new Date().toISOString();
  const { error } = await db.from('agent_runs').insert({
    agent_name:   'retell',
    status:       'success',
    input:        { source: 'retell', action: 'availability', ...input },
    output,
    duration_ms:  durationMs,
    started_at:   ts,
    completed_at: ts,
  });
  if (error) console.warn('[retell/availability] agent_runs log failed:', error.message);
}

// ── Handler ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const signature = req.headers.get('x-retell-signature') ?? '';

  if (!verifyRetellSignature('', signature)) {
    return NextResponse.json({ error: 'Invalid Retell signature' }, { status: 401 });
  }

  const count = Math.min(
    parseInt(req.nextUrl.searchParams.get('count') ?? '3', 10),
    5,
  );

  const db = makeSupabase();
  const t0 = Date.now();

  try {
    const cached = await readCache(db);

    // ── Fresh cache hit → return immediately ──────────────
    if (cached && isCacheFresh(cached.refreshed_at)) {
      const ageS        = Math.round((Date.now() - new Date(cached.refreshed_at).getTime()) / 1000);
      const slots       = (cached.slots_json as CalendlySlot[]).slice(0, count);
      const slots_human = slotsToHuman(slots);
      console.log(`[retell/availability] cache hit (${ageS}s old)`);
      await logRun(db, { count, cache: 'hit' }, { slots, slots_human }, Date.now() - t0);
      return NextResponse.json({ slots_human, slots });
    }

    // ── Stale cache hit → return cached + background refresh ──
    if (cached) {
      const ageS        = Math.round((Date.now() - new Date(cached.refreshed_at).getTime()) / 1000);
      const slots       = (cached.slots_json as CalendlySlot[]).slice(0, count);
      const slots_human = slotsToHuman(slots);
      console.log(`[retell/availability] cache stale (${ageS}s old) — serving stale, refreshing in background`);
      waitUntil(
        refreshCache(db).catch((e: unknown) =>
          console.error('[retell/availability] background refresh failed:', e instanceof Error ? e.message : e),
        ),
      );
      await logRun(db, { count, cache: 'stale' }, { slots, slots_human }, Date.now() - t0);
      return NextResponse.json({ slots_human, slots });
    }

    // ── Cache empty → block on Calendly ──────────────────
    console.log('[retell/availability] cache empty — fetching from Calendly (cold start)');
    const fresh       = await refreshCache(db);
    const slots       = (fresh.slots_json as CalendlySlot[]).slice(0, count);
    const slots_human = slotsToHuman(slots);
    await logRun(db, { count, cache: 'miss' }, { slots, slots_human }, Date.now() - t0);
    return NextResponse.json({ slots_human, slots });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[retell/availability]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
