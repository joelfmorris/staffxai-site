import { useState, useRef } from "react";
import {
  BRAND,
  CLIENTS,
  SERVICES,
  PROBLEM_STATEMENT,
  METRICS,
  PRICING,
  FAQS,
} from "../config";
import { useScrollReveal, useCounter } from "../hooks";

/* ─── Hero ───────────────────────────────────────────── */
function Hero() {
  return (
    <section id="hero" className="pt-32 md:pt-40 pb-16 md:pb-24 px-6">
      <div className="max-w-hero mx-auto text-center">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-pill mb-8 border border-brand-border anim-fade-up"
          style={{ animationDelay: "0ms" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-brand-pop" />
          <span className="text-xs tracking-wide text-brand-muted font-mono">
            AI Transformation
          </span>
        </div>

        <div
          className="font-sans font-semibold text-brand tracking-tight leading-tight anim-fade-up"
          style={{
            fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)",
            letterSpacing: "-0.025em",
            animationDelay: "100ms",
          }}
        >
          AI adoption that
        </div>

        <div
          className="font-display italic text-brand leading-none anim-fade-up"
          style={{
            fontSize: "clamp(3rem, 6vw, 5.5rem)",
            letterSpacing: "-0.02em",
            marginTop: "0.1em",
            animationDelay: "200ms",
          }}
        >
          actually sticks.
        </div>

        <p
          className="mt-6 text-brand-muted text-lg leading-relaxed max-w-[550px] mx-auto anim-fade-up"
          style={{ animationDelay: "300ms" }}
        >
          {BRAND.description}
        </p>

        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 anim-fade-up"
          style={{ animationDelay: "400ms" }}
        >
          <a
            href="#book"
            className="px-7 py-3 rounded-pill text-sm font-medium bg-brand text-white hover:bg-[#333] transition-all duration-200 hover:-translate-y-px"
          >
            {BRAND.cta}
          </a>
          <a
            href="#services"
            className="text-sm text-brand-muted hover:text-brand transition-colors duration-200"
          >
            Learn more &rarr;
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─── Logo Ticker ────────────────────────────────────── */
function LogoTicker() {
  return (
    <section className="py-8 overflow-hidden border-y border-brand-border-subtle">
      <div className="logo-ticker-track">
        {[...CLIENTS, ...CLIENTS].map((name, i) => (
          <span
            key={i}
            className="flex-shrink-0 text-xs font-mono uppercase tracking-widest text-brand opacity-30 whitespace-nowrap"
          >
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ─── Service Pillar ─────────────────────────────────── */
function ServicePillar({ service, index }) {
  const [ref, visible] = useScrollReveal(0.2);
  const reversed = index % 2 === 1;

  return (
    <div
      ref={ref}
      className={`grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
    >
      <div
        className={`md:col-span-7 ${
          reversed ? "md:order-2" : "md:order-1"
        }`}
      >
        <span className="block mb-3 text-xs font-mono tracking-widest text-brand-muted">
          {service.label}
        </span>
        <h3 className="mb-4 text-[1.75rem] font-semibold text-brand tracking-tight leading-snug">
          {service.title}
        </h3>
        <p className="mb-6 text-brand-muted leading-relaxed max-w-[520px]">
          {service.body}
        </p>
        <a
          href="#book"
          className="text-sm font-medium text-brand hover:opacity-70 transition-opacity duration-200"
        >
          {service.cta}
        </a>
      </div>
      <div
        className={`md:col-span-5 ${
          reversed ? "md:order-1" : "md:order-2"
        }`}
      >
        <div className="rounded-card overflow-hidden border border-brand-border shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <img
            src={service.image}
            alt={service.alt}
            className="w-full h-auto object-cover aspect-[4/3]"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}

function Services() {
  return (
    <section
      id="services"
      className="py-20 md:py-32 px-6 bg-brand-surface"
    >
      <div className="max-w-site mx-auto flex flex-col gap-20 md:gap-28">
        {SERVICES.map((s, i) => (
          <ServicePillar key={s.label} service={s} index={i} />
        ))}
      </div>
    </section>
  );
}

/* ─── ProblemStatement ────────────────────────────────────── */
function ProblemStatement() {
  const [ref, visible] = useScrollReveal();
 
  const icons = {
    chat: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#FA50B5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    check: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#FA50B5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    sparkle: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#FA50B5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
      </svg>
    ),
    document: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#FA50B5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  };
 
  return (
    <section className="py-20 md:py-32 px-6">
      <div
        ref={ref}
        className={`max-w-site mx-auto transition-all duration-700 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        <div className="max-w-[700px] mb-12">
          <h2 className="text-2xl md:text-3xl font-semibold text-brand tracking-tight leading-snug mb-4">
            {PROBLEM_STATEMENT.heading}
          </h2>
          <p className="text-xs font-mono uppercase tracking-widest text-brand-muted">
            {PROBLEM_STATEMENT.subheading}
          </p>
        </div>
 
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {PROBLEM_STATEMENT.cards.map((card, i) => (
            <div
              key={i}
              className="p-8 rounded-card border border-brand-border bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow duration-300"
            >
              <div className="mb-4">{icons[card.icon]}</div>
              <h3 className="text-lg font-semibold text-brand mb-2 leading-snug">
                {card.title}
              </h3>
              <p className="text-sm text-brand-muted leading-relaxed">
                {card.body}
              </p>
            </div>
          ))}
        </div>
 
        <p className="text-xl md:text-2xl font-semibold text-brand tracking-tight leading-snug max-w-[700px]">
          {PROBLEM_STATEMENT.closing}
        </p>
      </div>
    </section>
  );
}

/* ─── Philosophy ─────────────────────────────────────── */
function Philosophy() {
  const [ref, visible] = useScrollReveal();
  return (
    <section className="py-20 md:py-32 px-6">
      <div ref={ref} className="max-w-prose mx-auto text-center">
        <span
          className={`block mb-8 text-xs font-mono uppercase tracking-widest text-brand-muted transition-all duration-600 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Our approach
        </span>
        <p
          className={`mb-4 text-lg text-brand-muted leading-relaxed transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: "100ms" }}
        >
          Most AI consultancies focus on tools and features.
        </p>
        <p
          className={`font-semibold text-brand tracking-tight leading-snug transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{
            fontSize: "clamp(1.5rem, 3vw, 2.5rem)",
            transitionDelay: "300ms",
          }}
        >
          We focus on people actually using them.
        </p>
      </div>
    </section>
  );
}

/* ─── Process ────────────────────────────────────────── */
function Process() {
  const steps = [
    {
      num: "01",
      title: "Discover",
      body: "We map your operations, interview key stakeholders, and identify the AI opportunities with the highest business impact.",
    },
    {
      num: "02",
      title: "Enable",
      body: "Hands-on training, prompt libraries, and change management frameworks give your team the skills and confidence to adopt AI.",
    },
    {
      num: "03",
      title: "Embed",
      body: "We stay alongside your team through implementation, track adoption metrics, and iterate until AI is part of daily work.",
    },
  ];

  return (
    <section className="py-20 md:py-32 px-6 bg-brand-surface">
      <div className="max-w-site mx-auto">
        <h2 className="text-center mb-16 text-2xl font-semibold text-brand tracking-tight">
          How we work
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s, i) => {
            const [ref, visible] = useScrollReveal(0.2);
            return (
              <div
                key={s.num}
                ref={ref}
                className={`p-8 rounded-card bg-white border border-brand-border transition-all duration-700 ${
                  visible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <span className="block mb-4 text-[2.5rem] font-mono text-brand-border font-normal">
                  {s.num}
                </span>
                <h3 className="mb-3 text-xl font-semibold text-brand tracking-tight">
                  {s.title}
                </h3>
                <p className="text-[0.95rem] text-brand-muted leading-relaxed">
                  {s.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── Impact Metrics ─────────────────────────────────── */
function MetricCard({ metric }) {
  const [ref, visible] = useScrollReveal(0.3);
  const count = useCounter(metric.value, 1500, visible);
  return (
    <div
      ref={ref}
      className={`text-center py-8 transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className="text-[2.75rem] font-semibold text-brand tracking-tight leading-none">
        {metric.prefix || ""}
        {count}
        {metric.suffix}
      </div>
      <p className="mt-2 font-medium text-brand">{metric.label}</p>
      <p className="mt-1 text-sm text-brand-muted">{metric.context}</p>
    </div>
  );
}

function Impact() {
  return (
    <section className="py-20 md:py-32 px-6 border-t border-brand-border">
      <div className="max-w-site mx-auto">
        <h2 className="text-center mb-16 text-2xl font-semibold text-brand tracking-tight">
          Real results. Guaranteed.
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {METRICS.map((m) => (
            <MetricCard key={m.label} metric={m} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ────────────────────────────────────────── */
function PricingCard({ tier, index }) {
  const [ref, visible] = useScrollReveal(0.2);
  const isPopular = tier.popular;

  return (
    <div
      ref={ref}
      className={`relative flex flex-col p-8 rounded-card border border-brand-border transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${isPopular ? "bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)]" : "bg-brand-surface"}`}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      {isPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-pill text-xs font-medium font-mono tracking-wide bg-brand-pop text-white">
          Most popular
        </span>
      )}
      <h3 className="text-xl font-semibold text-brand">{tier.name}</h3>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-[2.25rem] font-semibold text-brand tracking-tight">
          {tier.price}
        </span>
        {tier.period && (
          <span className="text-sm text-brand-muted">{tier.period}</span>
        )}
      </div>
      <p className="mt-3 mb-6 text-[0.95rem] text-brand-muted leading-relaxed">
        {tier.description}
      </p>
      <ul className="flex-1 flex flex-col gap-3 mb-8">
        {tier.features.map((f, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 text-sm text-brand-muted"
          >
            <svg
              className="w-4 h-4 mt-0.5 flex-shrink-0"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M3 8.5L6.5 12L13 4"
                stroke="#6B7280"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {f}
          </li>
        ))}
      </ul>
      <a
        href="#book"
        className={`block text-center px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:-translate-y-px ${
          isPopular
            ? "bg-brand text-white hover:bg-[#333]"
            : "bg-transparent text-brand border border-brand-border hover:bg-brand-surface"
        }`}
      >
        Get started
      </a>
    </div>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="py-20 md:py-32 px-6 bg-brand-surface">
      <div className="max-w-site mx-auto">
        <h2 className="text-center mb-4 text-2xl font-semibold text-brand tracking-tight">
          Investment
        </h2>
        <p className="text-center mb-16 text-brand-muted max-w-[500px] mx-auto">
          Transparent pricing. No lock-in contracts. Start with a call.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRICING.map((t, i) => (
            <PricingCard key={t.name} tier={t} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Book a Call ─────────────────────────────────────── */
function BookCall() {
  const [ref, visible] = useScrollReveal(0.1);
  return (
    <section id="book" className="py-20 md:py-32 px-6 bg-brand">
      <div
        ref={ref}
        className={`max-w-[650px] mx-auto text-center transition-all duration-700 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        <h2 className="mb-4 text-2xl font-semibold text-white tracking-tight">
          Your complimentary AI insights call.
        </h2>
        <p className="mb-8 text-white/70">
          Chat with an AI strategist for clear, tailored next steps.
        </p>
        <div className="text-left mb-12 space-y-4 text-[0.95rem] text-white/55 leading-relaxed">
          <p>
            Our AI Insights call is a complimentary session with an experienced
            Australian-based AI transformation expert, helping businesses like
            yours find their competitive-edge. We&rsquo;ll learn more about your
            business, share tailored insights, answer your burning questions, and
            offer recommended next steps or tips you can act on. We believe in
            providing value and building relationships &mdash; there are no
            strings attached and no commitment required.
          </p>
          <p>
            Whether you&rsquo;re curious or confused about AI and its impact,
            have burning questions, or have a specific project in mind, this is
            your chance to bounce it around, get some feedback and make some next
            steps forward together.
          </p>
          <p>
            You can also{" "}
            <a
              href={`mailto:${BRAND.email}`}
              className="underline text-white/80 hover:text-white transition-colors duration-200"
            >
              send us an email
            </a>{" "}
            if you&rsquo;d prefer.
          </p>
        </div>
        <div className="rounded-card overflow-hidden bg-white">
          <iframe
            src={BRAND.calendlyUrl}
            title="Book a call with StaffxAI"
            className="w-full border-0"
            style={{ minHeight: "700px" }}
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ ─────────────────────────────────────────────── */
function FAQItem({ item, isOpen, onToggle }) {
  const contentRef = useRef(null);
  return (
    <div className="border-b border-brand-border">
      <button
        className="w-full flex items-center justify-between py-5 text-left"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="font-medium text-brand pr-8">{item.q}</span>
        <span
          className="flex-shrink-0 text-2xl font-light text-brand-muted leading-none transition-transform duration-300"
          style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
        >
          +
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isOpen
            ? `${contentRef.current?.scrollHeight || 300}px`
            : "0px",
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div
          ref={contentRef}
          className="pb-5 text-[0.95rem] text-brand-muted leading-relaxed max-w-[600px]"
        >
          {item.a}
        </div>
      </div>
    </div>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState(-1);
  return (
    <section id="faq" className="py-20 md:py-32 px-6">
      <div className="max-w-prose mx-auto">
        <h2 className="text-center mb-16 text-2xl font-semibold text-brand tracking-tight">
          Common questions
        </h2>
        {FAQS.map((item, i) => (
          <FAQItem
            key={i}
            item={item}
            isOpen={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
          />
        ))}
      </div>
    </section>
  );
}

/* ─── Page Export ─────────────────────────────────────── */
export default function Home() {
  return (
    <main>
      <Hero />
      <LogoTicker />
      <Services />
      <ProblemStatement />
      <Philosophy />
      <Process />
      <Impact />
      <PricingSection />
      <BookCall />
      <FAQSection />
    </main>
  );
}
