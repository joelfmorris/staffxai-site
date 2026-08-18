// lib/calendly-cache.ts
//
// Calendly slot fetching with Supabase-backed cache.
//
// Table: calendly_slot_cache (single row, id=1)
//   id           SMALLINT    PRIMARY KEY DEFAULT 1
//   slots_json   JSONB       NOT NULL DEFAULT '[]'
//   slots_human  TEXT        NOT NULL DEFAULT ''
//   refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now()
//   CONSTRAINT single_row CHECK (id = 1)
//
// Exports:
//   fetchFromCalendly(count?)   — hits Calendly API, returns CalendlySlot[]
//   readCache(db)               — reads the single cache row (null if empty)
//   refreshCache(db)            — fetchFromCalendly → upsert → return CacheRow
//   isCacheFresh(refreshed_at)  — true if < CACHE_TTL_MS old
//   slotsToHuman(slots)         — slot array → human-readable spoken string
//   formatSlotHuman(iso)        — single slot → "Tuesday the 6th at 10am"

import type { Supabase } from './dental-outbound';

export const CACHE_TTL_MS      = 15 * 60 * 1_000; // 15 minutes
const CACHE_ID                 = 1;
const DEFAULT_FETCH_COUNT      = 5;               // always cache max; callers slice
const TZ                       = 'Australia/Melbourne';

// ── Types ─────────────────────────────────────────────────────

export interface CalendlySlot {
  start_time: string;
  label: string;
}

export interface CacheRow {
  slots_json:   CalendlySlot[];
  slots_human:  string;
  refreshed_at: string;
}

// ── Time helpers ──────────────────────────────────────────────

function melbourneDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
}

function melbourneHour(iso: string): number {
  return parseInt(
    new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', hour12: false, timeZone: TZ }),
    10,
  );
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:  return `${n}st`;
    case 2:  return `${n}nd`;
    case 3:  return `${n}rd`;
    default: return `${n}th`;
  }
}

export function formatSlotHuman(iso: string): string {
  const d       = new Date(iso);
  const weekday = d.toLocaleDateString('en-AU', { weekday: 'long', timeZone: TZ });
  const day     = parseInt(d.toLocaleDateString('en-AU', { day: 'numeric', timeZone: TZ }), 10);

  // formatToParts avoids Windows ICU quirks (narrow no-break spaces, missing am/pm)
  const parts  = new Intl.DateTimeFormat('en-AU', {
    hour: 'numeric', minute: '2-digit', hour12: false, timeZone: TZ,
  }).formatToParts(d);

  const hour24 = parseInt(parts.find(p => p.type === 'hour')?.value  ?? '0', 10);
  const minute  = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10);
  const ampm    = hour24 < 12 ? 'am' : 'pm';
  const hour12  = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const time    = minute === 0
    ? `${hour12}${ampm}`
    : `${hour12}:${minute.toString().padStart(2, '0')}${ampm}`;

  return `${weekday} the ${ordinal(day)} at ${time}`;
}

export function slotsToHuman(slots: CalendlySlot[]): string {
  const parts = slots.map(s => formatSlotHuman(s.start_time));
  if (parts.length === 0) return 'no times available right now';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} or ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, or ${parts[parts.length - 1]}`;
}

// Pick `count` slots spread across different calendar days,
// alternating morning/afternoon preference for variety.
function pickSpreadSlots(
  raw: Array<{ start_time: string; invitees_remaining: number }>,
  count: number,
): string[] {
  const byDay = new Map<string, { morning: string | null; afternoon: string | null }>();

  for (const s of raw) {
    if (s.invitees_remaining <= 0) continue;
    const key  = melbourneDateKey(s.start_time);
    if (!byDay.has(key)) byDay.set(key, { morning: null, afternoon: null });
    const day  = byDay.get(key)!;
    const hour = melbourneHour(s.start_time);
    if (hour < 12  && !day.morning)   day.morning   = s.start_time;
    if (hour >= 12 && !day.afternoon) day.afternoon = s.start_time;
  }

  const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
  const picked: string[] = [];
  let preferMorning = true;

  for (const [, day] of days) {
    if (picked.length >= count) break;
    const chosen = preferMorning
      ? (day.morning ?? day.afternoon)
      : (day.afternoon ?? day.morning);
    if (chosen) {
      picked.push(chosen);
      preferMorning = !preferMorning;
    }
  }

  return picked;
}

// ── Calendly API ──────────────────────────────────────────────

export async function fetchFromCalendly(count = DEFAULT_FETCH_COUNT): Promise<CalendlySlot[]> {
  const eventTypeUri = process.env.CALENDLY_EVENT_TYPE_URI;
  const token        = process.env.CALENDLY_API_TOKEN;

  if (!eventTypeUri || eventTypeUri === 'placeholder') throw new Error('CALENDLY_EVENT_TYPE_URI not configured');
  if (!token        || token        === 'placeholder') throw new Error('CALENDLY_API_TOKEN not configured');

  const startTime = new Date(Date.now() + 60_000).toISOString();
  const endTime   = new Date(Date.now() + 14 * 24 * 60 * 60 * 1_000).toISOString();

  const url = new URL('https://api.calendly.com/event_type_available_times');
  url.searchParams.set('event_type', eventTypeUri);
  url.searchParams.set('start_time', startTime);
  url.searchParams.set('end_time', endTime);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendly API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as {
    collection?: Array<{ start_time: string; invitees_remaining: number }>;
  };

  const spread = pickSpreadSlots(data.collection ?? [], count);

  return spread.map(iso => ({
    start_time: iso,
    label: new Date(iso).toLocaleString('en-AU', {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: 'numeric', minute: '2-digit', hour12: true,
      timeZone: TZ,
    }),
  }));
}

// ── Cache helpers ─────────────────────────────────────────────

export function isCacheFresh(refreshedAt: string): boolean {
  return Date.now() - new Date(refreshedAt).getTime() < CACHE_TTL_MS;
}

export async function readCache(db: Supabase): Promise<CacheRow | null> {
  const { data, error } = await db
    .from('calendly_slot_cache')
    .select('slots_json, slots_human, refreshed_at')
    .eq('id', CACHE_ID)
    .maybeSingle();

  if (error) {
    console.warn('[calendly-cache] readCache error:', error.message);
    return null;
  }

  return data ? (data as unknown as CacheRow) : null;
}

// Fetch fresh slots from Calendly, upsert into cache, return the new row.
export async function refreshCache(db: Supabase): Promise<CacheRow> {
  console.log('[calendly-cache] refresh start');

  const slots       = await fetchFromCalendly(DEFAULT_FETCH_COUNT);
  const slots_human = slotsToHuman(slots);
  const refreshed_at = new Date().toISOString();

  const { error } = await db.from('calendly_slot_cache').upsert(
    { id: CACHE_ID, slots_json: slots, slots_human, refreshed_at },
    { onConflict: 'id' },
  );

  if (error) {
    // Non-fatal — caller still gets fresh data even if upsert failed
    console.error('[calendly-cache] upsert failed:', error.message);
  } else {
    console.log(`[calendly-cache] refresh done — ${slots.length} slot(s) cached: ${slots_human}`);
  }

  return { slots_json: slots, slots_human, refreshed_at };
}
