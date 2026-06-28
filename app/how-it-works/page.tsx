import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "A coordinated system of AI agents, wired into your existing tools, running on a daily schedule. Learn how StaffxAI builds and manages autonomous marketing engines.",
};

export default function HowItWorksPage() {
  return (
    <main className="pt-32 pb-20 px-6">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="max-w-[700px] mx-auto mb-24 text-center">
        <span className="block mb-4 text-xs font-mono uppercase tracking-widest text-brand-muted">
          The Engine
        </span>
        <h1
          className="font-semibold text-brand tracking-tight leading-tight mb-6"
          style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}
        >
          How the autonomous marketing engine works.
        </h1>
        <p className="text-brand-muted text-lg leading-relaxed">
          A coordinated system of AI agents, wired into your existing tools, running on a daily schedule.
        </p>
      </section>

      {/* ── Steps ────────────────────────────────────────── */}
      <section className="max-w-[700px] mx-auto mb-24">
        {[
          {
            num: "01",
            title: "We learn your business.",
            body: [
              "Before a single agent runs, we build a deep understanding of your business — your positioning, your customers, your voice, your competitors. This isn't a questionnaire. It's a structured interview process that captures the context a marketing team would take months to absorb.",
              "That context gets encoded into a persistent memory file — thousands of words of brand intelligence that every agent loads before every task. It's why the output sounds like your business, not like generic AI.",
            ],
          },
          {
            num: "02",
            title: "We build the engine.",
            body: [
              "We connect AI agents to your actual systems — your CMS, your email platform, your CRM, your data sources. Not a demo environment. Your live tools.",
              "The engine is configured for your specific needs:",
            ],
            bullets: [
              "Content agents that research keywords, analyse competitors, and write SEO-optimised blog posts and landing pages in your brand voice — publishing directly to your CMS every day.",
              "Outbound agents that build prospect lists, verify email addresses, write personalised cold email sequences, and send them on schedule through your email platform.",
              "Intelligence agents that run tasks through multiple AI models simultaneously, selecting the best output for your brand and budget.",
            ],
            bodyAfter:
              "Each agent runs on a schedule — daily, weekly, or hourly depending on the task. No human intervention required for routine execution.",
          },
          {
            num: "03",
            title: "We manage and optimise.",
            body: [
              "The engine doesn't run itself forever without oversight. That's the part most AI implementations get wrong — they build it, demo it, and disappear.",
              "We stay. Monthly management includes:",
            ],
            bullets: [
              "Monitoring output quality and adjusting prompts and context as your business evolves",
              "Refilling content queues with fresh keyword research",
              "Reviewing outbound performance and tuning sequences",
              "Quarterly deep-dive: updating business context, reviewing objectives, assessing ROI against the original targets",
            ],
            bodyAfter:
              "You get the output of a full marketing team with the oversight of a senior operator — without hiring either.",
          },
        ].map((step, i) => (
          <div
            key={step.num}
            className={`flex gap-8 ${i < 2 ? "mb-20 pb-20 border-b border-brand-border" : ""}`}
          >
            <span className="flex-shrink-0 text-[3rem] font-mono text-brand-border font-normal leading-none pt-1">
              {step.num}
            </span>
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-brand tracking-tight mb-4 leading-snug">
                {step.title}
              </h2>
              {step.body.map((p, j) => (
                <p key={j} className="text-brand-muted leading-relaxed mb-4">
                  {p}
                </p>
              ))}
              {step.bullets && (
                <ul className="flex flex-col gap-3 mb-4 ml-1">
                  {step.bullets.map((b, j) => (
                    <li key={j} className="flex items-start gap-3 text-brand-muted text-sm leading-relaxed">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-brand-pop" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {b}
                    </li>
                  ))}
                </ul>
              )}
              {step.bodyAfter && (
                <p className="text-brand-muted leading-relaxed">{step.bodyAfter}</p>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* ── Tech Transparency ────────────────────────────── */}
      <section className="max-w-[700px] mx-auto mb-24 p-10 rounded-card bg-brand-surface border border-brand-border">
        <span className="block mb-4 text-xs font-mono uppercase tracking-widest text-brand-muted">
          The Tech
        </span>
        <h2 className="text-xl md:text-2xl font-semibold text-brand tracking-tight mb-6 leading-snug">
          For those who want to know.
        </h2>
        <p className="text-brand-muted leading-relaxed mb-8">
          We&rsquo;re transparent about how the engine works. Here&rsquo;s the architecture:
        </p>

        <div className="flex flex-col gap-6">
          {[
            {
              layer: "Data layer",
              desc: "Supabase (Postgres) — stores brand memory, content queues, lead data, and run logs.",
            },
            {
              layer: "Content layer",
              desc: "Headless CMS (Strapi) — where all published content lives, accessible via API.",
            },
            {
              layer: "Agent layer",
              desc: "Custom Node.js agents running on schedule — deployed to a managed cloud server, your existing infrastructure, or on-prem if data residency matters. The actual workers that research, write, publish, and enrich.",
            },
            {
              layer: "Intelligence layer",
              desc: "Multi-model routing across Claude, ChatGPT, Grok, and Gemini — each task uses whichever model performs best.",
            },
            {
              layer: "Integration layer",
              desc: "Direct API connections to your email platform, CRM, keyword research tools, and verification services.",
            },
          ].map((item) => (
            <div key={item.layer} className="flex gap-4">
              <span className="flex-shrink-0 w-1 h-full bg-brand-border rounded-full" />
              <div>
                <span className="block text-xs font-mono uppercase tracking-widest text-brand-muted mb-1">
                  {item.layer}
                </span>
                <p className="text-sm text-brand-muted leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-brand-muted leading-relaxed text-sm">
          We show you this because transparency builds trust. You could build it yourself — and some technically minded people will. The value we bring is the 20+ years of marketing judgment to know <em>what</em> to build, and the operational discipline to keep it running in production.
        </p>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="max-w-[700px] mx-auto text-center py-12 px-8 rounded-card bg-brand">
        <h2 className="text-xl font-semibold text-white mb-3">
          Ready to see it live?
        </h2>
        <p className="text-white/70 mb-6 text-sm leading-relaxed">
          A 15-minute call. We&rsquo;ll show you the engine running on our own business — live content publishing, real outbound sequences, actual systems.
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
