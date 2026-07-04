import type { Metadata } from "next";
import Link from "next/link";
import { getLandingPages, formatDate } from "@/lib/strapi";

export const metadata: Metadata = {
  title: "Insights",
  description:
    "Conversion-focused landing pages generated daily by StaffxAI's autonomous marketing engine.",
};

export const revalidate = 60;

export default async function InsightsPage() {
  const pages = await getLandingPages();

  return (
    <main className="pt-32 pb-20 px-6">
      {/* ── Header ───────────────────────────────────────── */}
      <section className="max-w-prose mx-auto mb-16">
        <span className="block mb-4 text-xs font-mono uppercase tracking-widest text-brand-muted">
          Engine output
        </span>
        <h1
          className="font-semibold text-brand tracking-tight leading-tight mb-6"
          style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}
        >
          Insights &amp; resources.
        </h1>
        <p className="text-brand-muted text-lg leading-relaxed">
          Conversion-focused pages covering the topics our clients care about most — generated and published by the engine daily.
        </p>
      </section>

      {/* ── Pages Grid ───────────────────────────────────── */}
      <section className="max-w-prose mx-auto">
        {pages.length === 0 ? (
          <div className="py-20 text-center border border-brand-border rounded-card">
            <p className="text-brand-muted mb-2">No insights yet.</p>
            <p className="text-sm text-brand-muted">The engine is warming up — check back soon.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            {pages.map((page) => (
              <article
                key={page.id}
                className="group border-b border-brand-border-subtle pb-12 last:border-0"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs text-brand-muted font-mono">
                    {formatDate(page.publishedAt)}
                  </span>
                </div>
                <Link href={`/insights/${page.slug}`}>
                  <h2 className="text-xl font-semibold text-brand tracking-tight mb-2 group-hover:opacity-70 transition-opacity duration-200 leading-snug">
                    {page.title}
                  </h2>
                </Link>
                {page.excerpt && (
                  <p className="text-brand-muted leading-relaxed mb-4">
                    {page.excerpt}
                  </p>
                )}
                <Link
                  href={`/insights/${page.slug}`}
                  className="text-sm font-medium text-brand hover:opacity-70 transition-opacity duration-200"
                >
                  Read more &rarr;
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
