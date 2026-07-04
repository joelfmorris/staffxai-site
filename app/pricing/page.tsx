import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple pricing for StaffxAI autonomous marketing engines. A one-off engine build, then monthly management. All tool licences paid directly — no markup, no hidden fees.",
};

export default function PricingPage() {
  return (
    <main className="pt-32 pb-20 px-6">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="max-w-[700px] mx-auto mb-20 text-center">
        <span className="block mb-4 text-xs font-mono uppercase tracking-widest text-brand-muted">
          Investment
        </span>
        <h1
          className="font-semibold text-brand tracking-tight leading-tight mb-6"
          style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}
        >
          The output of a full marketing team. A fraction of the cost.
        </h1>
        <p className="text-brand-muted text-lg leading-relaxed">
          Simple pricing: a one-off engine build, then monthly management. All tool licences paid directly by you — no markup, no hidden fees.
        </p>
      </section>

      {/* ── Comparison Table ─────────────────────────────── */}
      <section className="max-w-site mx-auto mb-24">
        <h2 className="text-xl font-semibold text-brand tracking-tight mb-8">
          What you&rsquo;re comparing us to.
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-brand-border">
                <th className="text-left py-3 pr-6 font-mono text-xs uppercase tracking-widest text-brand-muted w-[35%]">
                  Alternative
                </th>
                <th className="text-left py-3 pr-6 font-mono text-xs uppercase tracking-widest text-brand-muted w-[25%]">
                  Typical cost (AUD)
                </th>
                <th className="text-left py-3 font-mono text-xs uppercase tracking-widest text-brand-muted">
                  What you actually get
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  alternative: "Small in-house marketing team",
                  cost: "$250k–$600k/year",
                  what: "2–3 people + holidays, sick days, management overhead",
                  highlight: false,
                },
                {
                  alternative: "Multi-channel agency retainer",
                  cost: "$2k–$15k/month",
                  what: "Junior staff on execution; you chase them for updates",
                  highlight: false,
                },
                {
                  alternative: "Fractional CMO",
                  cost: "$5k–$15k/month",
                  what: "Senior strategy — but no execution; that's on you",
                  highlight: false,
                },
                {
                  alternative: "StaffxAI autonomous engine",
                  cost: "From $8k build + $3k/mo",
                  what: "Senior strategy + full execution, running 24/7",
                  highlight: true,
                },
              ].map((row, i) => (
                <tr
                  key={i}
                  className={`border-b ${row.highlight ? "border-brand-border bg-brand-surface" : "border-brand-border-subtle"}`}
                >
                  <td className={`py-4 pr-6 leading-snug ${row.highlight ? "font-semibold text-brand" : "text-brand-muted"}`}>
                    {row.alternative}
                  </td>
                  <td className={`py-4 pr-6 ${row.highlight ? "font-semibold text-brand" : "text-brand-muted"}`}>
                    {row.cost}
                  </td>
                  <td className={`py-4 leading-snug ${row.highlight ? "font-semibold text-brand" : "text-brand-muted"}`}>
                    {row.what}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Pricing Cards ─────────────────────────────────── */}
      <section className="max-w-site mx-auto mb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card A: Done-With-You */}
          <div className="relative p-8 rounded-card border border-brand bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] flex flex-col">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-pill text-xs font-medium font-mono tracking-wide bg-brand-pop text-white">
              Most popular
            </span>
            <span className="block text-xs font-mono uppercase tracking-widest text-brand-muted mb-2">
              Monthly
            </span>
            <h3 className="text-xl font-semibold text-brand mb-1">Done-With-You</h3>
            <div className="mt-4 mb-1 flex items-baseline gap-0.5">
              <span
                className="font-semibold text-brand tracking-tight"
                style={{ fontSize: "clamp(2.5rem, 3vw, 3.25rem)", letterSpacing: "-0.03em" }}
              >
                $3,000
              </span>
              <sup className="text-lg font-semibold text-brand-muted ml-0.5">*</sup>
            </div>
            <p className="text-xs text-brand-muted font-mono mb-6">AUD / month</p>
            <p className="text-sm text-brand-muted leading-relaxed mb-6 flex-1">
              The engine, built and managed. Your team trained on the routine.
            </p>
            <ul className="flex flex-col gap-3 mb-8">
              {[
                "Daily autonomous content and outbound execution",
                "Monthly performance monitoring and tuning",
                "Content queue management and keyword research",
                "Quarterly context review and objectives reset",
                "Slack and email support",
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-brand-muted">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5L6.5 12L13 4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/book"
              className="block text-center px-6 py-3 rounded-xl text-sm font-medium bg-brand text-white hover:bg-[#333] transition-all duration-200"
            >
              Book a Call
            </Link>
          </div>

          {/* Card B: Done-For-You */}
          <div className="relative p-8 rounded-card border border-brand-border bg-brand-surface flex flex-col">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-pill text-xs font-medium font-mono tracking-wide bg-brand text-white">
              Premium
            </span>
            <span className="block text-xs font-mono uppercase tracking-widest text-brand-muted mb-2">
              Monthly
            </span>
            <h3 className="text-xl font-semibold text-brand mb-1">Done-For-You</h3>
            <div className="mt-4 mb-1 flex items-baseline gap-0.5">
              <span
                className="font-semibold text-brand tracking-tight"
                style={{ fontSize: "clamp(2.5rem, 3vw, 3.25rem)", letterSpacing: "-0.03em" }}
              >
                $5,000
              </span>
              <sup className="text-lg font-semibold text-brand-muted ml-0.5">*</sup>
            </div>
            <p className="text-xs text-brand-muted font-mono mb-6">AUD / month</p>
            <p className="text-sm text-brand-muted leading-relaxed mb-6 flex-1">
              Everything run end to end. You receive the output and the reporting.
            </p>
            <ul className="flex flex-col gap-3 mb-8">
              {[
                "Everything in Done-With-You, plus:",
                "Full operational management — zero time required from your team",
                "Weekly performance reporting",
                "Priority support and faster iteration cycles",
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-brand-muted">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5L6.5 12L13 4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/book"
              className="block text-center px-6 py-3 rounded-xl text-sm font-medium bg-transparent text-brand border border-brand-border hover:bg-white transition-all duration-200"
            >
              Book a Call
            </Link>
          </div>
        </div>

        {/* Asterisk footnote */}
        <p className="mt-6 text-sm text-brand-muted leading-relaxed">
          *Plus a one-off Engine Build from $8,000 — business context capture, agent deployment, initial content queue, and full system integration. 2–3 weeks. Founding-client rates, time-limited.
        </p>

        {/* What the Engine Build includes */}
        <div className="mt-8 p-8 rounded-card border border-brand-border bg-brand-surface">
          <h3 className="font-semibold text-brand mb-3">What the Engine Build includes</h3>
          <p className="text-sm text-brand-muted leading-relaxed">
            Every engagement starts with the build: a structured business interview, your brand memory file (the persistent intelligence layer every agent loads), agent deployment wired into your existing systems, initial content queue seeding, and testing through to go-live.
          </p>
        </div>
      </section>

      {/* ── Below Pricing Notes ──────────────────────────── */}
      <section className="max-w-[700px] mx-auto mb-20 flex flex-col gap-8">
        <div className="p-8 rounded-card border border-brand-border bg-brand-surface">
          <h3 className="font-semibold text-brand mb-3">Founding client rates</h3>
          <p className="text-sm text-brand-muted leading-relaxed">
            These are founding-client rates — deliberately set at the lower end while we build our first named case studies. They won&rsquo;t last. If you&rsquo;re reading this page, you&rsquo;re early.
          </p>
        </div>
        <div className="p-8 rounded-card border border-brand-border bg-brand-surface">
          <h3 className="font-semibold text-brand mb-3">Tool licences</h3>
          <p className="text-sm text-brand-muted leading-relaxed">
            All tool licences (CMS, email platform, AI providers, enrichment services) are paid directly by you. We don&rsquo;t mark them up. You see exactly what you&rsquo;re paying for, and you own all your accounts. That&rsquo;s how trust works.
          </p>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="max-w-[700px] mx-auto text-center py-12 px-8 rounded-card bg-brand">
        <h2 className="text-xl font-semibold text-white mb-3">
          Let&rsquo;s talk about your specific situation.
        </h2>
        <p className="text-white/70 mb-6 text-sm leading-relaxed">
          Book a call — we&rsquo;ll walk through what the engine would look like for your specific business and give you a clear picture of the investment.
        </p>
        <Link
          href="/book"
          className="inline-block px-7 py-3 rounded-pill text-sm font-medium bg-white text-brand hover:bg-brand-surface transition-all duration-200"
        >
          Book a Call
        </Link>
      </section>
    </main>
  );
}
