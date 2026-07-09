import type { Metadata } from 'next';
import Link from 'next/link';
import { Fragment } from 'react';

export const metadata: Metadata = {
  title: 'Practice Dashboard',
  robots: { index: false, follow: false },
};

export const revalidate = 300;

// ── Design tokens (matching /smile) ──────────────────────────────────────────
const T = {
  ground:     '#F7F4F0',
  white:      '#FFFFFF',
  text:       '#1C1916',
  muted:      '#6E665E',
  accent:     '#4A7C6B',
  accentPale: '#EAF0EE',
  border:     '#E3DDD5',
} as const;

const CLIENT_ID = 'cranbourne-demo';
const SB_URL    = process.env.SUPABASE_URL;
const SB_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── Types ─────────────────────────────────────────────────────────────────────
interface Enquiry {
  id:                  string | number;
  first_name?:         string | null;
  treatment_interest?: string | null;
  status:              string;
  treatment_value?:    number | null;
  prior_consult?:      boolean | null;
  created_at:          string;
}

interface AgentRun {
  id:          string | number;
  notes?:      string | null;
  created_at:  string;
}

// ── Supabase REST fetch ───────────────────────────────────────────────────────
async function sbGet<T>(table: string, params = ''): Promise<T | null> {
  if (!SB_URL || !SB_KEY) return null;
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, {
      headers: {
        apikey:          SB_KEY,
        Authorization:   `Bearer ${SB_KEY}`,
        'Content-Type':  'application/json',
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

function formatAUD(n: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency', currency: 'AUD', maximumFractionDigits: 0,
  }).format(n);
}

// ── Pipeline constants ────────────────────────────────────────────────────────
const FUNNEL_STAGES: readonly string[] = [
  'new', 'contacted', 'deposit_sent', 'deposit_paid', 'booked', 'attended',
];

const STAGE_LABELS: Record<string, string> = {
  new:          'New',
  contacted:    'Contacted',
  deposit_sent: 'Deposit Sent',
  deposit_paid: 'Deposit Paid',
  booked:       'Booked',
  attended:     'Attended',
};

// Warm-to-sage gradient across the funnel stages
const STAGE_COLORS: Record<string, string> = {
  new:          '#7EB3D8',
  contacted:    '#D4A96A',
  deposit_sent: '#CC8F58',
  deposit_paid: '#6A9E8E',
  booked:       '#4A8C7A',
  attended:     '#3A7C6A',
};

const TREATMENT_LABELS: Record<string, string> = {
  'single-tooth':  'Single Tooth',
  'several-teeth': 'Several Teeth',
  'full-smile':    'Full Smile Restoration',
  'not-sure':      'Not Sure Yet',
};

const STATUS_BADGE: Record<string, { label: string; bg: string; fg: string }> = {
  new:          { label: 'New',          bg: '#DBEAFE', fg: '#1E40AF' },
  contacted:    { label: 'Contacted',    bg: '#FEF3C7', fg: '#92400E' },
  deposit_sent: { label: 'Deposit Sent', bg: '#FEF3C7', fg: '#92400E' },
  deposit_paid: { label: 'Deposit Paid', bg: '#D1FAE5', fg: '#065F46' },
  booked:       { label: 'Booked',       bg: '#D1FAE5', fg: '#065F46' },
  attended:     { label: 'Attended',     bg: '#A7F3D0', fg: '#064E3B' },
  no_show:      { label: 'No Show',      bg: '#FEE2E2', fg: '#991B1B' },
  closed_won:   { label: 'Won',          bg: '#A7F3D0', fg: '#064E3B' },
  closed_lost:  { label: 'Lost',         bg: '#F3F4F6', fg: '#6B7280' },
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function PracticeDashboardPage() {
  const [enquiriesResult, agentRunsResult] = await Promise.allSettled([
    sbGet<Enquiry[]>(
      'dental_enquiries',
      `select=*&client_id=eq.${CLIENT_ID}&order=created_at.desc&limit=500`,
    ),
    sbGet<AgentRun[]>(
      'agent_runs',
      `select=*&client_id=eq.${CLIENT_ID}&agent=eq.dental-sequencer&order=created_at.desc&limit=10`,
    ),
  ]);

  const enquiries  = enquiriesResult.status === 'fulfilled' ? (enquiriesResult.value ?? []) : [];
  const agentRuns  = agentRunsResult.status === 'fulfilled' ? (agentRunsResult.value ?? []) : [];
  const dataLoaded = enquiriesResult.status === 'fulfilled';

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalEnquiries      = enquiries.length;
  const depositsSecured     = enquiries.filter(e =>
    ['deposit_paid', 'booked', 'attended', 'closed_won'].includes(e.status)).length;
  const consultationsBooked = enquiries.filter(e =>
    ['booked', 'attended', 'closed_won'].includes(e.status)).length;
  const revenueAttributed   = enquiries.reduce(
    (sum, e) => sum + (typeof e.treatment_value === 'number' ? e.treatment_value : 0), 0);

  // ── Funnel stage counts ───────────────────────────────────────────────────
  const stageCounts: Record<string, number> =
    Object.fromEntries(FUNNEL_STAGES.map(s => [s, 0]));
  for (const e of enquiries) {
    if (e.status in stageCounts) stageCounts[e.status]++;
  }
  const maxCount = Math.max(...Object.values(stageCounts), 1);

  const recentEnquiries = enquiries.slice(0, 10);

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <main style={{ background: T.ground }} className="min-h-screen pt-24 pb-20 px-5 sm:px-6">
      <div className="max-w-[1000px] mx-auto">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill font-mono text-xs uppercase tracking-[0.15em]"
              style={{ background: T.accentPale, color: T.accent }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: T.accent }}
              />
              Live
            </span>
          </div>
          <h1
            className="font-display leading-tight mb-2"
            style={{ color: T.text, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}
          >
            Cranbourne Dental Studio
          </h1>
          <p className="font-mono text-xs uppercase tracking-[0.18em]" style={{ color: T.muted }}>
            Patient Acquisition Dashboard
          </p>
        </header>

        {/* ── HERO STATS ──────────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Enquiries',            value: dataLoaded ? String(totalEnquiries)           : '—', sub: 'total received' },
            { label: 'Deposits Secured',     value: dataLoaded ? String(depositsSecured)          : '—', sub: 'paid or committed' },
            { label: 'Consultations Booked', value: dataLoaded ? String(consultationsBooked)      : '—', sub: 'booked or attended' },
            { label: 'Revenue Attributed',   value: dataLoaded ? formatAUD(revenueAttributed)     : '—', sub: 'treatment value' },
          ].map((stat, i) => (
            <div
              key={i}
              className="p-5 sm:p-6 rounded-card"
              style={{ background: T.white, border: `1px solid ${T.border}` }}
            >
              <p
                className="font-mono uppercase mb-4"
                style={{ fontSize: '0.65rem', letterSpacing: '0.15em', color: T.muted }}
              >
                {stat.label}
              </p>
              <p
                className="font-semibold leading-none mb-2"
                style={{ color: T.text, fontSize: 'clamp(1.6rem, 3vw, 2.25rem)', letterSpacing: '-0.035em' }}
              >
                {stat.value}
              </p>
              <p className="text-xs" style={{ color: T.muted }}>{stat.sub}</p>
            </div>
          ))}
        </section>

        {/* ── FUNNEL ──────────────────────────────────────────────────────── */}
        <section
          className="rounded-card p-6 sm:p-8 mb-10"
          style={{ background: T.white, border: `1px solid ${T.border}` }}
        >
          <p
            className="font-mono uppercase mb-2"
            style={{ fontSize: '0.65rem', letterSpacing: '0.15em', color: T.muted }}
          >
            Pipeline
          </p>
          <h2
            className="font-display leading-tight mb-8"
            style={{ color: T.text, fontSize: 'clamp(1.3rem, 3vw, 1.8rem)' }}
          >
            Enquiry funnel.
          </h2>

          {totalEnquiries === 0 && dataLoaded ? (
            <div
              className="text-center py-12 rounded-xl"
              style={{ background: T.ground }}
            >
              <p className="text-sm" style={{ color: T.muted }}>Waiting for first enquiry…</p>
            </div>
          ) : (
            <>
              {/* ── Desktop: side-by-side stage cards with connectors ── */}
              <div className="hidden md:flex items-stretch">
                {FUNNEL_STAGES.map((stage, i) => {
                  const count     = stageCounts[stage] ?? 0;
                  const nextStage = i < FUNNEL_STAGES.length - 1 ? FUNNEL_STAGES[i + 1] : null;
                  const nextCount = nextStage != null ? (stageCounts[nextStage] ?? 0) : null;
                  const conv      = count > 0 && nextCount !== null
                    ? Math.round((nextCount / count) * 100) : null;
                  const fillPct   = count > 0
                    ? Math.max(12, Math.round((count / maxCount) * 100)) : 0;

                  return (
                    <Fragment key={stage}>
                      {/* Stage card */}
                      <div
                        className="relative flex-1 rounded-xl overflow-hidden"
                        style={{ minHeight: '140px', background: T.ground, border: `1px solid ${T.border}` }}
                      >
                        {/* Bottom fill — grows proportionally */}
                        <div
                          className="absolute bottom-0 left-0 right-0"
                          style={{
                            height:     `${fillPct}%`,
                            background: STAGE_COLORS[stage],
                            opacity:    count > 0 ? 0.28 : 0,
                          }}
                        />
                        <div className="relative p-4">
                          <p
                            className="font-mono uppercase mb-2"
                            style={{ fontSize: '0.58rem', letterSpacing: '0.1em', color: count > 0 ? T.muted : T.border }}
                          >
                            {STAGE_LABELS[stage]}
                          </p>
                          <p
                            className="font-semibold leading-none"
                            style={{
                              color:          count > 0 ? T.text : T.border,
                              fontSize:       'clamp(1.5rem, 2.2vw, 2rem)',
                              letterSpacing:  '-0.04em',
                            }}
                          >
                            {count}
                          </p>
                        </div>
                      </div>

                      {/* Conversion connector */}
                      {nextStage && (
                        <div
                          className="flex flex-col items-center justify-center gap-1"
                          style={{ width: '2.25rem', flexShrink: 0 }}
                        >
                          <span
                            className="font-mono"
                            style={{ fontSize: '0.58rem', color: conv !== null ? T.accent : T.border }}
                          >
                            {conv !== null ? `${conv}%` : '–'}
                          </span>
                          <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                            <path
                              d="M0 4h9M6.5 1.5l2.5 2.5-2.5 2.5"
                              stroke={conv !== null ? T.accent : T.border}
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      )}
                    </Fragment>
                  );
                })}
              </div>

              {/* ── Mobile: stacked rows ── */}
              <div className="md:hidden flex flex-col gap-2">
                {FUNNEL_STAGES.map((stage, i) => {
                  const count     = stageCounts[stage] ?? 0;
                  const nextStage = i < FUNNEL_STAGES.length - 1 ? FUNNEL_STAGES[i + 1] : null;
                  const nextCount = nextStage != null ? (stageCounts[nextStage] ?? 0) : null;
                  const conv      = count > 0 && nextCount !== null
                    ? Math.round((nextCount / count) * 100) : null;
                  const fillPct   = count > 0
                    ? Math.max(8, Math.round((count / maxCount) * 100)) : 0;

                  return (
                    <Fragment key={stage}>
                      <div
                        className="relative flex items-center justify-between rounded-xl px-4 py-3.5 overflow-hidden"
                        style={{ background: T.ground, border: `1px solid ${T.border}` }}
                      >
                        <div
                          className="absolute inset-y-0 left-0 rounded-xl"
                          style={{
                            width:      `${fillPct}%`,
                            background: STAGE_COLORS[stage],
                            opacity:    count > 0 ? 0.22 : 0,
                          }}
                        />
                        <span
                          className="relative font-mono text-xs uppercase tracking-[0.1em]"
                          style={{ color: count > 0 ? T.text : T.muted }}
                        >
                          {STAGE_LABELS[stage]}
                        </span>
                        <span
                          className="relative font-semibold"
                          style={{ color: count > 0 ? T.text : T.border, fontSize: '1.4rem', letterSpacing: '-0.04em' }}
                        >
                          {count}
                        </span>
                      </div>
                      {nextStage && conv !== null && (
                        <div className="pl-4 py-0.5">
                          <span
                            className="font-mono"
                            style={{ fontSize: '0.65rem', color: T.accent }}
                          >
                            {conv}% →
                          </span>
                        </div>
                      )}
                    </Fragment>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* ── RECENT ENQUIRIES ────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2
            className="font-display leading-tight mb-5"
            style={{ color: T.text, fontSize: 'clamp(1.2rem, 3vw, 1.6rem)' }}
          >
            Recent enquiries.
          </h2>

          {recentEnquiries.length === 0 ? (
            <div
              className="p-10 rounded-card text-center text-sm"
              style={{ background: T.white, border: `1px solid ${T.border}`, color: T.muted }}
            >
              No enquiries yet.
            </div>
          ) : (
            <div
              className="rounded-card overflow-hidden"
              style={{ background: T.white, border: `1px solid ${T.border}` }}
            >
              {/* Column header */}
              <div
                className="hidden sm:grid sm:grid-cols-[1fr_1fr_130px_90px] px-5 py-3"
                style={{ borderBottom: `1px solid ${T.border}`, background: T.ground }}
              >
                {['Name', 'Treatment', 'Status', 'When'].map(h => (
                  <span
                    key={h}
                    className="font-mono uppercase"
                    style={{ fontSize: '0.62rem', letterSpacing: '0.14em', color: T.muted }}
                  >
                    {h}
                  </span>
                ))}
              </div>

              {recentEnquiries.map((e, i) => {
                const badge = STATUS_BADGE[e.status] ?? { label: e.status, bg: T.ground, fg: T.muted };
                const name  = e.first_name ?? '—';
                const treat = TREATMENT_LABELS[e.treatment_interest ?? '']
                  ?? (e.treatment_interest?.replace(/-/g, ' ') ?? '—');

                return (
                  <div
                    key={String(e.id ?? i)}
                    className="flex sm:grid sm:grid-cols-[1fr_1fr_130px_90px] items-center gap-3 sm:gap-0 px-5 py-3.5"
                    style={{
                      borderBottom: i < recentEnquiries.length - 1
                        ? `1px solid ${T.border}` : undefined,
                    }}
                  >
                    <span className="text-sm font-medium" style={{ color: T.text }}>
                      {name}
                    </span>
                    <span className="text-sm hidden sm:block truncate pr-4" style={{ color: T.muted }}>
                      {treat}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className="text-xs font-mono px-2.5 py-1 rounded-pill whitespace-nowrap"
                        style={{ background: badge.bg, color: badge.fg }}
                      >
                        {badge.label}
                      </span>
                      {e.prior_consult && (
                        <span
                          className="text-xs font-mono px-2.5 py-1 rounded-pill whitespace-nowrap"
                          style={{ background: '#FEF3C7', color: '#92400E' }}
                        >
                          Prior Quote
                        </span>
                      )}
                    </div>
                    <span
                      className="text-xs font-mono sm:text-right whitespace-nowrap"
                      style={{ color: T.muted }}
                    >
                      {e.created_at ? relativeTime(e.created_at) : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── MAYA'S ACTIVITY ─────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2
            className="font-display leading-tight mb-5"
            style={{ color: T.text, fontSize: 'clamp(1.2rem, 3vw, 1.6rem)' }}
          >
            Maya&rsquo;s Activity.
          </h2>

          {agentRuns.length === 0 ? (
            <div
              className="p-10 rounded-card text-center text-sm"
              style={{ background: T.white, border: `1px solid ${T.border}`, color: T.muted }}
            >
              No activity recorded yet.
            </div>
          ) : (
            <div
              className="rounded-card overflow-hidden"
              style={{ background: T.white, border: `1px solid ${T.border}` }}
            >
              {agentRuns.map((run, i) => {
                const notes = run.notes ?? '—';
                const isSms = /sms|text|messag/i.test(notes);

                return (
                  <div
                    key={String(run.id ?? i)}
                    className="flex items-start gap-4 px-5 py-4"
                    style={{
                      borderBottom: i < agentRuns.length - 1
                        ? `1px solid ${T.border}` : undefined,
                    }}
                  >
                    <span className="flex-shrink-0 text-base leading-none mt-0.5">
                      {isSms ? '📱' : '✓'}
                    </span>
                    <p className="flex-1 text-sm leading-relaxed" style={{ color: T.text }}>
                      {notes}
                    </p>
                    <span
                      className="flex-shrink-0 text-xs font-mono whitespace-nowrap"
                      style={{ color: T.muted }}
                    >
                      {run.created_at ? relativeTime(run.created_at) : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── PLACEHOLDER CARDS ───────────────────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {[
            { title: 'Ad Performance',  sub: 'Connects to your Meta Ads account' },
            { title: 'Google Reviews',  sub: 'Automated review tracking coming soon' },
          ].map(card => (
            <div
              key={card.title}
              className="flex items-start gap-4 p-6 rounded-card opacity-50"
              style={{ background: T.ground, border: `1px solid ${T.border}` }}
            >
              <svg
                className="flex-shrink-0 mt-0.5"
                width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke={T.muted}
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: T.text }}>
                  {card.title}
                </p>
                <p className="text-xs" style={{ color: T.muted }}>{card.sub}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ── FOOTER CTA ───────────────────────────────────────────────────── */}
        <footer
          className="text-center pt-8"
          style={{ borderTop: `1px solid ${T.border}` }}
        >
          <p
            className="font-mono uppercase mb-3"
            style={{ fontSize: '0.68rem', letterSpacing: '0.16em', color: T.muted }}
          >
            Powered by StaffxAI — Autonomous Marketing Engines
          </p>
          <Link
            href="/book"
            className="text-sm transition-opacity hover:opacity-70"
            style={{ color: T.accent }}
          >
            Want this for your practice? → Book a Call
          </Link>
        </footer>

      </div>
    </main>
  );
}
