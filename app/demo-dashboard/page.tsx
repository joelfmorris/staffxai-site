import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Live Dashboard",
  description:
    "Live performance data from StaffxAI's own autonomous marketing engine.",
};

export const revalidate = 300;

// ─── ENV ──────────────────────────────────────────────────────────────────────
const STRAPI_URL =
  process.env.STRAPI_URL ?? "https://satisfying-luck-6f1749a7b7.strapiapp.com";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

// Service role key — server components only.
// TODO: migrate to a restricted read-only key/view before any
// client-side data access is ever added.
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ─── FETCH HELPERS ────────────────────────────────────────────────────────────

interface StrapiListResp<T> {
  data: T[];
  meta: { pagination: { total: number } };
}

async function strapiGet<T>(path: string): Promise<T | null> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (STRAPI_TOKEN) headers["Authorization"] = `Bearer ${STRAPI_TOKEN}`;
  try {
    const res = await fetch(`${STRAPI_URL}${path}`, {
      headers,
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function sbGet<T>(table: string, params = ""): Promise<T | null> {
  if (!SB_URL || !SB_KEY) return null;
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, {
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ContentItem {
  id: number;
  title: string;
  slug: string;
  publishedAt: string;
  word_count?: number;
  content?: string;
}

interface QueueRow {
  status: string;
}

interface AgentRun {
  id?: number;
  agent_name?: string;
  agent?: string;
  status?: string;
  created_at?: string;
  run_at?: string;
  keyword?: string;
  target_keyword?: string;
  [key: string]: unknown;
}

type FeedItem = {
  title: string;
  slug: string;
  type: "Blog" | "Landing Page";
  publishedAt: string;
  href: string;
};

// ─── UTILITIES ────────────────────────────────────────────────────────────────

function formatK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 100) / 10}k`;
  return n.toString();
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function countByStatus(rows: QueueRow[]): Record<string, number> {
  return rows.reduce(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
    {} as Record<string, number>
  );
}

function estimateWords(item: ContentItem): number {
  if (item.word_count && item.word_count > 0) return item.word_count;
  if (item.content) return item.content.trim().split(/\s+/).length;
  return 0;
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default async function DemoDashboardPage() {
  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  ).toISOString();

  // All fetches run in parallel; any individual failure returns null, never crashes
  const [
    blogDataRes,
    blogMonthRes,
    lpDataRes,
    lpMonthRes,
    kwQueueRes,
    lpQueueRes,
    agentRunsRes,
  ] = await Promise.allSettled([
    strapiGet<StrapiListResp<ContentItem>>(
      `/api/blog-posts?sort=publishedAt:desc&pagination[pageSize]=200`
    ),
    strapiGet<StrapiListResp<ContentItem>>(
      `/api/blog-posts?filters[publishedAt][$gte]=${encodeURIComponent(monthStart)}&pagination[pageSize]=1`
    ),
    strapiGet<StrapiListResp<ContentItem>>(
      `/api/landing-pages?sort=publishedAt:desc&pagination[pageSize]=200`
    ),
    strapiGet<StrapiListResp<ContentItem>>(
      `/api/landing-pages?filters[publishedAt][$gte]=${encodeURIComponent(monthStart)}&pagination[pageSize]=1`
    ),
    sbGet<QueueRow[]>("keyword_queue", "select=status"),
    sbGet<QueueRow[]>("landing_page_queue", "select=status"),
    sbGet<AgentRun[]>("agent_runs", "select=*&order=created_at.desc&limit=10"),
  ]);

  // Unwrap settled results safely
  const blogData    = blogDataRes.status    === "fulfilled" ? blogDataRes.value    : null;
  const blogMonth   = blogMonthRes.status   === "fulfilled" ? blogMonthRes.value   : null;
  const lpData      = lpDataRes.status      === "fulfilled" ? lpDataRes.value      : null;
  const lpMonth     = lpMonthRes.status     === "fulfilled" ? lpMonthRes.value     : null;
  const kwQueue     = kwQueueRes.status     === "fulfilled" ? kwQueueRes.value     : null;
  const lpQueue     = lpQueueRes.status     === "fulfilled" ? lpQueueRes.value     : null;
  const agentRuns   = agentRunsRes.status   === "fulfilled" ? agentRunsRes.value   : null;

  // Computed stats
  const blogTotal         = blogData?.meta?.pagination?.total ?? 0;
  const landingTotal      = lpData?.meta?.pagination?.total ?? 0;
  const blogThisMonth     = blogMonth?.meta?.pagination?.total ?? 0;
  const landingThisMonth  = lpMonth?.meta?.pagination?.total ?? 0;
  const totalPieces       = blogTotal + landingTotal;
  const totalThisMonth    = blogThisMonth + landingThisMonth;

  const blogPosts    = blogData?.data ?? [];
  const landingPages = lpData?.data ?? [];

  const totalWords = [...blogPosts, ...landingPages].reduce(
    (sum, item) => sum + estimateWords(item),
    0
  );

  // Merge + sort recent feed, take top 8
  const recentFeed: FeedItem[] = [
    ...blogPosts.slice(0, 8).map((p) => ({
      title: p.title,
      slug: p.slug,
      type: "Blog" as const,
      publishedAt: p.publishedAt,
      href: `/blog/${p.slug}`,
    })),
    ...landingPages.slice(0, 8).map((p) => ({
      title: p.title,
      slug: p.slug,
      type: "Landing Page" as const,
      publishedAt: p.publishedAt,
      href: `/insights/${p.slug}`,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    .slice(0, 8);

  // Queue stats
  const kwStats   = kwQueue  ? countByStatus(kwQueue)  : null;
  const lpStats   = lpQueue  ? countByStatus(lpQueue)  : null;
  const sbOnline  = !!SB_URL && !!SB_KEY;
  const kwPending = kwStats?.["pending"] ?? 0;
  const lpPending = lpStats?.["pending"] ?? 0;
  const totalPending = kwPending + lpPending;

  const runs = agentRuns ?? [];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="pt-32 pb-20 px-6">

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <section className="max-w-site mx-auto mb-14">
        <div className="flex items-center gap-3 mb-5">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-brand-pop text-white text-xs font-mono uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Live
          </span>
        </div>
        <h1
          className="font-semibold text-brand tracking-tight leading-tight mb-4"
          style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}
        >
          The Engine — Live
        </h1>
        <p className="text-brand-muted text-lg leading-relaxed max-w-[700px]">
          This is StaffxAI&rsquo;s own autonomous marketing engine, reporting in real time. Every client gets this same view of theirs.
        </p>
      </section>

      {/* ── Hero Stats ──────────────────────────────────────────────── */}
      <section className="max-w-site mx-auto mb-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(
            [
              {
                label: "Published this month",
                value: totalThisMonth > 0 ? totalThisMonth.toString() : "—",
                sub: "blog + landing pages",
                dim: totalThisMonth === 0,
              },
              {
                label: "Total pieces",
                value: totalPieces > 0 ? totalPieces.toString() : "—",
                sub: "all time",
                dim: totalPieces === 0,
              },
              {
                label: "Words generated",
                value: totalWords > 0 ? formatK(totalWords) : "—",
                sub: "all time",
                dim: totalWords === 0,
              },
              {
                label: "Keywords queued",
                value: sbOnline ? totalPending.toString() : null,
                sub: "pending across both queues",
                connecting: !sbOnline,
              },
            ] as Array<{
              label: string;
              value: string | null;
              sub: string;
              dim?: boolean;
              connecting?: boolean;
            }>
          ).map((stat, i) => (
            <div
              key={i}
              className="p-6 md:p-8 rounded-card border border-brand-border bg-white"
            >
              <span className="block text-xs font-mono uppercase tracking-widest text-brand-muted mb-4">
                {stat.label}
              </span>
              <span
                className="block font-semibold tracking-tight leading-none"
                style={{
                  fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
                  letterSpacing: "-0.04em",
                  color: stat.dim ? "#D1D5DB" : "#111111",
                }}
              >
                {stat.connecting ? (
                  <span className="text-base font-normal text-brand-muted">
                    connecting…
                  </span>
                ) : (
                  stat.value
                )}
              </span>
              <span className="block mt-2 text-xs text-brand-muted">
                {stat.sub}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Recent Output ───────────────────────────────────────────── */}
      <section className="max-w-site mx-auto mb-14">
        <h2 className="text-lg font-semibold text-brand tracking-tight mb-5">
          Recent output
        </h2>
        {recentFeed.length === 0 ? (
          <div className="p-10 rounded-card border border-brand-border text-center text-brand-muted text-sm">
            —
          </div>
        ) : (
          <div className="rounded-card border border-brand-border overflow-hidden bg-white">
            {recentFeed.map((item, i) => (
              <div
                key={`${item.type}-${item.slug}`}
                className={`flex items-center gap-4 px-6 py-4 ${
                  i < recentFeed.length - 1
                    ? "border-b border-brand-border-subtle"
                    : ""
                } hover:bg-brand-surface transition-colors duration-150`}
              >
                {/* Type badge */}
                <span
                  className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-mono uppercase tracking-wide ${
                    item.type === "Blog"
                      ? "bg-brand text-white"
                      : "bg-brand-pop/10 text-brand-pop"
                  }`}
                >
                  {item.type === "Blog" ? "Blog" : "LP"}
                </span>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={item.href}
                    className="text-sm font-medium text-brand hover:opacity-60 transition-opacity duration-200 leading-snug block truncate"
                  >
                    {item.title}
                  </Link>
                </div>

                {/* Date */}
                <span className="flex-shrink-0 text-xs text-brand-muted font-mono">
                  {new Date(item.publishedAt).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Content Pipeline ────────────────────────────────────────── */}
      <section className="max-w-site mx-auto mb-14">
        <h2 className="text-lg font-semibold text-brand tracking-tight mb-5">
          Content pipeline
        </h2>
        {!sbOnline ? (
          <div className="p-8 rounded-card border border-brand-border bg-white text-sm text-brand-muted">
            connecting…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(
              [
                {
                  label: "Blog posts — keyword queue",
                  stats: kwStats,
                },
                {
                  label: "Landing pages — page queue",
                  stats: lpStats,
                },
              ] as Array<{ label: string; stats: Record<string, number> | null }>
            ).map(({ label, stats }) => {
              const done       = stats?.["done"]       ?? 0;
              const pending    = stats?.["pending"]    ?? 0;
              const processing = stats?.["processing"] ?? 0;
              const failed     = stats?.["failed"]     ?? 0;
              const total      = done + pending + processing + failed;

              return (
                <div
                  key={label}
                  className="p-6 md:p-8 rounded-card border border-brand-border bg-white"
                >
                  <span className="block text-xs font-mono uppercase tracking-widest text-brand-muted mb-5">
                    {label}
                  </span>

                  {/* Segmented bar */}
                  {total > 0 ? (
                    <div className="flex h-1.5 rounded-full overflow-hidden mb-5 bg-brand-surface">
                      {done > 0 && (
                        <div
                          className="bg-emerald-400 h-full"
                          style={{ width: `${(done / total) * 100}%` }}
                        />
                      )}
                      {processing > 0 && (
                        <div
                          className="bg-amber-400 h-full"
                          style={{ width: `${(processing / total) * 100}%` }}
                        />
                      )}
                      {pending > 0 && (
                        <div
                          className="bg-brand-border h-full"
                          style={{ width: `${(pending / total) * 100}%` }}
                        />
                      )}
                      {failed > 0 && (
                        <div
                          className="bg-red-400 h-full"
                          style={{ width: `${(failed / total) * 100}%` }}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="h-1.5 rounded-full bg-brand-surface mb-5" />
                  )}

                  {/* Counts */}
                  <div className="flex flex-wrap gap-5">
                    <span className="text-xs text-brand-muted">
                      <span className="font-semibold text-brand mr-1">{done}</span>
                      done
                    </span>
                    <span className="text-xs text-brand-muted">
                      <span className="font-semibold text-brand mr-1">{pending}</span>
                      pending
                    </span>
                    {processing > 0 && (
                      <span className="text-xs text-amber-600">
                        <span className="font-semibold mr-1">{processing}</span>
                        processing
                      </span>
                    )}
                    {failed > 0 && (
                      <span className="text-xs text-red-500">
                        <span className="font-semibold mr-1">{failed}</span>
                        failed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Engine Activity ─────────────────────────────────────────── */}
      <section className="max-w-site mx-auto mb-14">
        <h2 className="text-lg font-semibold text-brand tracking-tight mb-5">
          Engine activity
        </h2>
        {!sbOnline ? (
          <div className="p-8 rounded-card border border-brand-border bg-white text-sm text-brand-muted">
            connecting…
          </div>
        ) : runs.length === 0 ? (
          <div className="p-10 rounded-card border border-brand-border bg-white text-sm text-brand-muted text-center">
            No runs recorded yet.
          </div>
        ) : (
          <div className="rounded-card border border-brand-border overflow-hidden">
            {/* Header row */}
            <div className="hidden sm:grid sm:grid-cols-[2rem_1fr_1fr_6rem] px-6 py-3 border-b border-brand-border bg-brand-surface">
              <span className="text-xs font-mono uppercase tracking-widest text-brand-muted" />
              <span className="text-xs font-mono uppercase tracking-widest text-brand-muted">Agent</span>
              <span className="text-xs font-mono uppercase tracking-widest text-brand-muted">Keyword</span>
              <span className="text-xs font-mono uppercase tracking-widest text-brand-muted text-right">When</span>
            </div>

            {runs.map((run, i) => {
              const agentName = String(run.agent_name ?? run.agent ?? "agent");
              const status    = String(run.status ?? "");
              const ts        = String(run.created_at ?? run.run_at ?? "");
              const keyword   = String(run.keyword ?? run.target_keyword ?? "");
              const isOk      =
                status === "success" ||
                status === "done" ||
                status === "completed";

              return (
                <div
                  key={i}
                  className={`flex sm:grid sm:grid-cols-[2rem_1fr_1fr_6rem] items-center gap-3 sm:gap-0 px-6 py-3.5 text-sm bg-white ${
                    i < runs.length - 1
                      ? "border-b border-brand-border-subtle"
                      : ""
                  }`}
                >
                  <span className="text-base leading-none flex-shrink-0">
                    {isOk ? (
                      <span className="text-emerald-500">✓</span>
                    ) : (
                      <span className="text-red-400">✗</span>
                    )}
                  </span>
                  <span className="text-xs text-brand-muted font-mono truncate sm:pr-4">
                    {agentName}
                  </span>
                  <span className="hidden sm:block text-xs text-brand-muted truncate pr-4">
                    {keyword || "—"}
                  </span>
                  <span className="text-xs text-brand-muted font-mono whitespace-nowrap sm:text-right ml-auto sm:ml-0">
                    {ts ? relativeTime(ts) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Locked Placeholder Cards ────────────────────────────────── */}
      <section className="max-w-site mx-auto mb-14">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: "Organic search performance",
              sub: "Connects to your Google Search Console",
            },
            {
              title: "Outbound performance",
              sub: "Connects to your email platform",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="p-8 rounded-card border border-brand-border-subtle bg-brand-surface flex items-start gap-4 opacity-50"
            >
              {/* Lock icon */}
              <svg
                className="w-5 h-5 mt-0.5 flex-shrink-0 text-brand-muted"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <div>
                <p className="text-sm font-medium text-brand-muted mb-1">
                  {card.title}
                </p>
                <p className="text-sm text-brand-muted">{card.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="max-w-site mx-auto">
        <div className="py-12 px-8 rounded-card bg-brand text-center">
          <h2 className="text-xl font-semibold text-white mb-3">
            Want this running for your business?
          </h2>
          <p className="text-white/70 mb-6 text-sm leading-relaxed max-w-[500px] mx-auto">
            Every client gets their own live dashboard — same engine, same visibility, same daily output. See what it would look like for yours.
          </p>
          <Link
            href="/book"
            className="inline-block px-7 py-3 rounded-pill text-sm font-medium bg-white text-brand hover:bg-brand-surface transition-all duration-200"
          >
            Book a Call
          </Link>
        </div>
      </section>

    </main>
  );
}
