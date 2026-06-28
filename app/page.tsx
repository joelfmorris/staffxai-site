import type { Metadata } from "next";
import Link from "next/link";
import { getLatestBlogPosts, formatDate } from "@/lib/strapi";
import { FAQSection, ScrollRevealSection } from "./home-client";

export const metadata: Metadata = {
  title: "StaffxAI — Autonomous Marketing Engines",
  description:
    "StaffxAI builds and runs autonomous marketing engines that produce the output of a full team — content, SEO, outbound, lead gen — for a fraction of the cost. Running 24/7. No hiring required.",
};

export const revalidate = 60;

export default async function HomePage() {
  const latestPosts = await getLatestBlogPosts(3);

  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section id="hero" className="pt-32 md:pt-44 pb-20 md:pb-32 px-6">
        <div className="max-w-hero mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-pill mb-8 border border-brand-border anim-fade-up"
            style={{ animationDelay: "0ms" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-pop" />
            <span className="text-xs tracking-wide text-brand-muted font-mono">
              Autonomous Marketing
            </span>
          </div>

          <h1
            className="font-sans font-semibold text-brand tracking-tight leading-tight anim-fade-up"
            style={{
              fontSize: "clamp(1.75rem, 4vw, 3rem)",
              letterSpacing: "-0.025em",
              animationDelay: "100ms",
            }}
          >
            Your marketing team —
          </h1>
          <div
            className="font-display italic text-brand leading-none anim-fade-up"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 5rem)",
              letterSpacing: "-0.02em",
              marginTop: "0.1em",
              animationDelay: "200ms",
            }}
          >
            built by AI.
          </div>
          <div
            className="font-sans font-semibold text-brand tracking-tight leading-tight anim-fade-up"
            style={{
              fontSize: "clamp(1.75rem, 4vw, 3rem)",
              letterSpacing: "-0.025em",
              marginTop: "0.15em",
              animationDelay: "280ms",
            }}
          >
            Managed by a 20+-year operator.
          </div>

          <p
            className="mt-8 text-brand-muted text-lg leading-relaxed max-w-[580px] mx-auto anim-fade-up"
            style={{ animationDelay: "380ms" }}
          >
            StaffxAI builds and runs autonomous marketing engines that produce the output of a full team — content, SEO, outbound, lead gen — for a fraction of the cost. Running 24/7. No hiring required.
          </p>

          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 anim-fade-up"
            style={{ animationDelay: "480ms" }}
          >
            <Link
              href="/book"
              className="px-7 py-3 rounded-pill text-sm font-medium bg-brand text-white hover:bg-[#333] transition-all duration-200 hover:-translate-y-px"
            >
              Book a Call
            </Link>
            <Link
              href="/blog"
              className="text-sm text-brand-muted hover:text-brand transition-colors duration-200"
            >
              See the engine working &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── Problem Section ───────────────────────────────── */}
      <section className="py-20 md:py-32 px-6 bg-brand-surface">
        <ScrollRevealSection>
          <div className="max-w-site mx-auto">
            <div className="max-w-[700px] mb-16">
              <h2 className="text-2xl md:text-3xl font-semibold text-brand tracking-tight leading-snug mb-4">
                You need marketing output. Every way to get it is broken.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  title: "Hiring a team costs a fortune.",
                  body: "Two marketers, fully loaded — salary, super, payroll tax, tools, management time — runs $200k+ a year in Australia. And you still need to find, hire, onboard, and manage them. Most businesses at your stage can't justify it.",
                },
                {
                  title: "Agencies are expensive and opaque.",
                  body: "$5k–$15k a month for junior staff on your account, a monthly report that mostly says “we placed some ads,” with little visibility into what you’re paying for. Or the connection to value generation.",
                },
                {
                  title: "Freelancers don't scale.",
                  body: "Inconsistent, uncoordinated, need managing, and don't integrate with your systems. You end up project-managing three people to get the output of one.",
                },
                {
                  title: "SaaS stacks collect dust.",
                  body: "A pile of tools the team never has time to wire together or fully use. You're paying for capability that sits unused because nobody has the bandwidth to operationalise it.",
                },
                {
                  title: "Fractional CMOs give you strategy but no hands on the keyboard.",
                  body: "$5k–$15k a month for senior thinking — but when the call ends, the execution is still on you. You get a plan. You don't get the output.",
                },
              ].map((card, i) => (
                <div
                  key={i}
                  className={`p-8 rounded-card border border-brand-border bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow duration-300 ${i === 4 ? "md:col-span-2" : ""}`}
                >
                  <h3 className="text-lg font-semibold text-brand mb-3 leading-snug">
                    {card.title}
                  </h3>
                  <p className="text-sm text-brand-muted leading-relaxed">
                    {card.body}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-12 text-xl md:text-2xl font-semibold text-brand tracking-tight leading-snug max-w-[700px]">
              The result is always the same: growth stalls because marketing can&rsquo;t keep up.
            </p>
          </div>
        </ScrollRevealSection>
      </section>

      {/* ── Solution Section ──────────────────────────────── */}
      <section className="py-20 md:py-32 px-6">
        <ScrollRevealSection>
          <div className="max-w-site mx-auto">
            <div className="max-w-[700px] mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold text-brand tracking-tight leading-snug mb-4">
                What if you had a marketing team that never sleeps?
              </h2>
              <p className="text-brand-muted leading-relaxed">
                StaffxAI builds you an autonomous marketing engine — a coordinated system of AI agents wired directly into your CMS, email platform, and data sources.
              </p>
              <p className="mt-4 text-brand-muted leading-relaxed">
                Every morning, before anyone&rsquo;s at their desk, the engine wakes up and goes to work:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  title: "It writes and publishes SEO content daily.",
                  body: "The engine researches what's ranking on Google, analyses the competition, then writes and publishes a full blog post — keyword-targeted, brand-voiced, with conversion triggers built in. One post per day. Every day. On autopilot.",
                },
                {
                  title: "It generates conversion-focused landing pages.",
                  body: "Bottom-of-funnel pages targeting high-intent search terms, published automatically alongside your blog content. Full-funnel coverage without a content calendar.",
                },
                {
                  title: "It runs personalised cold outbound.",
                  body: "The engine builds prospect lists, verifies every email address, writes genuinely personalised sequences — not mail-merge, real personalisation — and sends them on schedule. 100 emails in under 3 minutes for less than a dollar.",
                },
                {
                  title: "It selects the best AI model for every job.",
                  body: "Four leading AI providers running simultaneously — Claude, ChatGPT, Grok, Gemini — with the system choosing the one that best matches your brand voice, budget, and use case.",
                },
              ].map((card, i) => (
                <div
                  key={i}
                  className="p-8 rounded-card border border-brand-border bg-brand-surface hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow duration-300"
                >
                  <h3 className="text-lg font-semibold text-brand mb-3 leading-snug">
                    {card.title}
                  </h3>
                  <p className="text-sm text-brand-muted leading-relaxed">
                    {card.body}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-12 text-brand-muted leading-relaxed max-w-[700px]">
              It&rsquo;s not a tool you log into. It&rsquo;s not a dashboard you check. It&rsquo;s a system that produces the output of two or more full-time marketers, every day, without you touching anything.
            </p>
          </div>
        </ScrollRevealSection>
      </section>

      {/* ── Proof Section ─────────────────────────────────── */}
      <section className="py-20 md:py-32 px-6 bg-brand-surface">
        <div className="max-w-site mx-auto">
          <div className="max-w-[700px] mb-4">
            <h2 className="text-2xl md:text-3xl font-semibold text-brand tracking-tight leading-snug mb-4">
              This isn&rsquo;t a demo. It&rsquo;s running right now.
            </h2>
            <p className="text-brand-muted leading-relaxed">
              The blog posts below were written and published by the engine — automatically, on schedule, with no human involvement. This is what the system produces on a Tuesday morning while everyone&rsquo;s still in bed.
            </p>
          </div>

          {latestPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              {latestPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group block p-6 rounded-card border border-brand-border bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-shadow duration-300"
                >
                  <p className="text-xs font-mono text-brand-muted tracking-wide uppercase mb-3">
                    {formatDate(post.publishedAt)}
                  </p>
                  <h3 className="font-semibold text-brand tracking-tight leading-snug mb-3 group-hover:opacity-70 transition-opacity duration-200">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-sm text-brand-muted leading-relaxed line-clamp-3">
                      {post.excerpt}
                    </p>
                  )}
                  <p className="mt-4 text-sm font-medium text-brand group-hover:opacity-70 transition-opacity duration-200">
                    Read &rarr;
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-12 p-8 rounded-card border border-brand-border bg-white text-center">
              <p className="text-brand-muted">Posts loading — engine is warming up.</p>
              <Link href="/blog" className="mt-2 inline-block text-sm font-medium text-brand hover:opacity-70">
                Visit the blog &rarr;
              </Link>
            </div>
          )}

          <div className="mt-12 max-w-[700px]">
            <p className="text-brand-muted leading-relaxed">
              Most AI implementations never make it past the demo. Only about 11% of agentic AI projects reach production (Deloitte, 2025). We&rsquo;re in the 11%.
            </p>
            <p className="mt-4 text-brand-muted leading-relaxed">
              You can build what we&rsquo;ve built. The hard part is making it run — and keeping it running. That&rsquo;s the 20+ years of marketing and operations experience talking.
            </p>
          </div>
        </div>
      </section>

      {/* ── How It's Different ────────────────────────────── */}
      <section className="py-20 md:py-32 px-6">
        <ScrollRevealSection>
          <div className="max-w-site mx-auto">
            <div className="max-w-[700px] mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold text-brand tracking-tight leading-snug">
                Not an agency. Not a freelancer. Not another tool.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  label: "Agency",
                  price: "$5k–$15k/month",
                  items: [
                    "Junior staff execute",
                    "You chase them for updates",
                    "You get a report",
                  ],
                  highlight: false,
                },
                {
                  label: "Fractional CMO",
                  price: "$5k–$15k/month",
                  items: [
                    "Senior strategy",
                    "No execution — that's on you",
                    "You get advice",
                  ],
                  highlight: false,
                },
                {
                  label: "StaffxAI",
                  price: "From $3k/month",
                  items: [
                    "Senior strategy AND autonomous execution",
                    "The engine runs daily, wired to your systems",
                    "You get output",
                  ],
                  highlight: true,
                },
              ].map((col) => (
                <div
                  key={col.label}
                  className={`p-8 rounded-card border ${
                    col.highlight
                      ? "border-brand bg-brand text-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                      : "border-brand-border bg-brand-surface"
                  }`}
                >
                  <span
                    className={`block text-xs font-mono uppercase tracking-widest mb-2 ${
                      col.highlight ? "text-white/50" : "text-brand-muted"
                    }`}
                  >
                    {col.label}
                  </span>
                  <p
                    className={`text-xl font-semibold mb-6 ${
                      col.highlight ? "text-white" : "text-brand"
                    }`}
                  >
                    {col.price}
                  </p>
                  <ul className="flex flex-col gap-3">
                    {col.items.map((item, i) => (
                      <li
                        key={i}
                        className={`flex items-start gap-2.5 text-sm leading-relaxed ${
                          col.highlight ? "text-white/80" : "text-brand-muted"
                        }`}
                      >
                        <svg
                          className="w-4 h-4 mt-0.5 flex-shrink-0"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M3 8.5L6.5 12L13 4"
                            stroke={col.highlight ? "rgba(255,255,255,0.6)" : "#6B7280"}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <p className="mt-12 text-brand-muted leading-relaxed max-w-[700px]">
              A fractional CMO gives you strategy but no hands on the keyboard. An agency gives you hands but junior judgment. We give you both — senior marketing judgment from a 20+-year operator, combined with autonomous execution that runs every day without babysitting.
            </p>
          </div>
        </ScrollRevealSection>
      </section>

      {/* ── Who It's For ──────────────────────────────────── */}
      <section className="py-20 md:py-32 px-6 bg-brand-surface">
        <ScrollRevealSection>
          <div className="max-w-site mx-auto">
            <div className="max-w-[700px] mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold text-brand tracking-tight leading-snug">
                Built for businesses that need marketing output but can&rsquo;t get it affordably.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "Founders with no marketing function",
                  body: "You're growing on referrals and word-of-mouth, but you know it won't scale. You can't justify a $90k+ marketing hire. The engine gives you a full marketing function without the headcount.",
                  quote: '"Our marketing is just ads — isn\'t there a way to grow without spending a bundle?"',
                },
                {
                  title: "Under-resourced marketing leaders",
                  body: "Your team is too small for the targets you've been given. You can't ship content quickly or regularly enough. The engine multiplies your team's output without adding another salary.",
                  quote: '"We can\'t get a campaign or content out quickly and regularly."',
                },
                {
                  title: "Agency-disillusioned buyers",
                  body: "You're paying a hefty monthly retainer that doesn't translate into sales. The engine gives you full transparency — visible daily output tied directly to pipeline and growth.",
                  quote: '"Our agency charges us a hefty fee and I don\'t know what they do besides place ads."',
                },
              ].map((card, i) => (
                <div
                  key={i}
                  className="p-8 rounded-card border border-brand-border bg-white flex flex-col"
                >
                  <h3 className="text-lg font-semibold text-brand mb-3 leading-snug">
                    {card.title}
                  </h3>
                  <p className="text-sm text-brand-muted leading-relaxed mb-6 flex-1">
                    {card.body}
                  </p>
                  <blockquote className="border-l-2 border-brand-pop pl-4 text-sm text-brand-muted italic leading-relaxed">
                    {card.quote}
                  </blockquote>
                </div>
              ))}
            </div>
          </div>
        </ScrollRevealSection>
      </section>

      {/* ── What We Don't Do ──────────────────────────────── */}
      <section className="py-20 md:py-32 px-6">
        <ScrollRevealSection>
          <div className="max-w-[700px] mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold text-brand tracking-tight leading-snug mb-6">
              We&rsquo;re a specialist. Here&rsquo;s what that means.
            </h2>
            <p className="text-brand-muted leading-relaxed mb-4">
              We don&rsquo;t do brand strategy. We don&rsquo;t do social media management. We don&rsquo;t run your paid ad budgets. We don&rsquo;t give you a strategy deck and disappear.
            </p>
            <p className="text-brand-muted leading-relaxed mb-4">
              We do one thing: build and run autonomous marketing engines that produce content, outbound, and lead generation at volume — wired into your actual systems, running every day, managed by someone who&rsquo;s been doing this for 20+ years.
            </p>
            <p className="text-brand-muted leading-relaxed">
              Being specific about what we don&rsquo;t do is the reason the engine works. Specialists build better systems than generalists.
            </p>
          </div>
        </ScrollRevealSection>
      </section>

      {/* ── About / Credibility ───────────────────────────── */}
      <section className="py-20 md:py-32 px-6 bg-brand-surface">
        <ScrollRevealSection>
          <div className="max-w-[700px] mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold text-brand tracking-tight leading-snug mb-6">
              Built and managed by a marketing operator, not a tech bro with a ChatGPT wrapper.
            </h2>
            <p className="text-brand-muted leading-relaxed mb-4">
              Joel Morris has spent 20+ years in senior marketing roles — agency side, client side, and as a COO. He&rsquo;s run teams, managed agencies, built campaigns, and watched the same problems repeat across every business: not enough content, not enough leads, not enough time, and too much money spent on people and tools that don&rsquo;t deliver.
            </p>
            <p className="text-brand-muted leading-relaxed mb-4">
              In 2025, he started building autonomous agents. Not as a side project — as a serious attempt to solve the marketing output problem that had frustrated him for two decades. The first agents ran in an afternoon. A few weeks later, a full autonomous engine was publishing daily, enriching leads, and running personalised outbound — all production-grade, all on schedule, all without human intervention.
            </p>
            <p className="text-brand-muted leading-relaxed">
              StaffxAI exists because the technology works — but almost nobody implements it properly. The gap isn&rsquo;t AI capability. It&rsquo;s the operational discipline to make it run in production and the marketing judgment to know what&rsquo;s worth building.
            </p>
          </div>
        </ScrollRevealSection>
      </section>

      {/* ── Final CTA ─────────────────────────────────────── */}
      <section className="py-20 md:py-32 px-6 bg-brand">
        <div className="max-w-[650px] mx-auto text-center">
          <h2 className="mb-4 text-2xl md:text-3xl font-semibold text-white tracking-tight">
            See what the engine can do for your business.
          </h2>
          <p className="mb-8 text-white/70 leading-relaxed">
            A 15-minute call. No pitch deck. We&rsquo;ll show you the engine running live and talk about what it would look like for your operation.
          </p>
          <Link
            href="/book"
            className="inline-block px-8 py-3.5 rounded-pill text-sm font-medium bg-white text-brand hover:bg-brand-surface transition-all duration-200 hover:-translate-y-px"
          >
            Book a Call
          </Link>
          <p className="mt-6 text-sm text-white/40">
            Or scroll up and read the blog — every post was written and published by the engine, automatically.
          </p>
        </div>
      </section>

      <FAQSection />
    </main>
  );
}
