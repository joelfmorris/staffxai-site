"use client";

import { useState, useRef } from "react";
import { useScrollReveal } from "@/lib/hooks";

export function ScrollRevealSection({ children }: { children: React.ReactNode }) {
  const [ref, visible] = useScrollReveal(0.1);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
    >
      {children}
    </div>
  );
}

function FAQItem({
  item,
  isOpen,
  onToggle,
}: {
  item: { q: string; a: string };
  isOpen: boolean;
  onToggle: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
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
          maxHeight: isOpen ? `${contentRef.current?.scrollHeight ?? 300}px` : "0px",
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

const FAQS = [
  {
    q: "What does 'autonomous' actually mean?",
    a: "It means the engine runs on a schedule without needing a human to trigger it. Every morning it wakes up, checks its task queue, runs keyword research, writes content, publishes it to your CMS, and logs what it did. You review the output — you don't manage the process.",
  },
  {
    q: "What existing tools does the engine connect to?",
    a: "We wire the engine into your CMS (we use Strapi), your email platform (for outbound sequences), your CRM or lead database, keyword research tools, and email verification services. We work with what you have, or help you set up the right stack.",
  },
  {
    q: "How long does it take to build?",
    a: "The engine build takes 2–3 weeks. That includes the business interview, brand memory file creation, agent deployment, system integration, and go-live testing.",
  },
  {
    q: "What's the brand memory file?",
    a: "It's a structured document — thousands of words — capturing your positioning, target customers, competitive landscape, voice and tone, and strategic priorities. Every agent loads it before every task. It's why the output sounds like your business, not generic AI.",
  },
  {
    q: "Do I need technical staff to work with you?",
    a: "No. We handle all the technical implementation. You need to be able to answer questions about your business and give us access to your existing tools. Everything else is on us.",
  },
  {
    q: "What are the tool licence costs?",
    a: "You pay for tool licences directly — we don't mark them up. Typical costs include AI provider APIs (Claude, ChatGPT, etc.), your email platform, CMS hosting, and enrichment services. We'll give you a clear breakdown before you commit to anything.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState(-1);
  return (
    <section className="py-20 md:py-32 px-6">
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
