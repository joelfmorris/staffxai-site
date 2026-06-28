import type { Metadata } from "next";
import Link from "next/link";
import CalendlyWidget from "./calendly-widget";

export const metadata: Metadata = {
  title: "Book a Call",
  description:
    "15 minutes. No pitch deck. We'll show you the autonomous marketing engine running live and talk about what it would look like for your business.",
};

export default function BookPage() {
  return (
    <main className="pt-32 pb-20 px-6">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="max-w-[650px] mx-auto mb-12 text-center">
        <span className="block mb-4 text-xs font-mono uppercase tracking-widest text-brand-muted">
          No pitch deck
        </span>
        <h1
          className="font-semibold text-brand tracking-tight leading-tight mb-6"
          style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}
        >
          Let&rsquo;s talk about what the engine can do for you.
        </h1>
        <p className="text-brand-muted text-lg leading-relaxed">
          15 minutes. No pitch deck. We&rsquo;ll show you the engine running live on our own business and talk through what it would look like for yours.
        </p>
      </section>

      {/* ── Calendar Embed ───────────────────────────────── */}
      <section className="max-w-[650px] mx-auto mb-16">
        <CalendlyWidget />
      </section>

      {/* ── What to Expect ───────────────────────────────── */}
      <section className="max-w-[650px] mx-auto mb-16">
        <h2 className="text-lg font-semibold text-brand tracking-tight mb-6">
          What to expect on the call:
        </h2>
        <ul className="flex flex-col gap-4">
          {[
            "You'll see the engine running — live content publishing, real outbound sequences, actual systems",
            "We'll talk about where your marketing output is stuck and what the engine could handle",
            "If there's a fit, we'll outline next steps and pricing. If not, no pressure — you'll still have seen something worth seeing",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-brand-muted leading-relaxed">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-brand-pop" viewBox="0 0 16 16" fill="none">
                <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Not Ready ────────────────────────────────────── */}
      <section className="max-w-[650px] mx-auto py-8 px-8 rounded-card bg-brand-surface border border-brand-border">
        <h3 className="font-semibold text-brand mb-3">Not ready to book?</h3>
        <p className="text-sm text-brand-muted leading-relaxed mb-4">
          Browse the blog — every post is engine-generated proof of what the system can produce.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/blog"
            className="text-sm font-medium text-brand hover:opacity-70 transition-opacity duration-200"
          >
            Read the blog &rarr;
          </Link>
          <Link
            href="https://linkedin.com/in/joelmorris"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-brand hover:opacity-70 transition-opacity duration-200"
          >
            Connect on LinkedIn &rarr;
          </Link>
        </div>
      </section>
    </main>
  );
}
