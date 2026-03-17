/*
 * ─── SITE CONFIGURATION ──────────────────────────────
 * Edit this file to update all site content.
 * Images: place files in /public/images/ and reference as "/images/filename.webp"
 */

export const BRAND = {
  name: "StaffxAI",
  tagline: "AI adoption that actually sticks.",
  description:
    "Guaranteed AI transformation for Australian businesses. Strategy, education, and implementation that your team will actually use.",
  cta: "Book an intro",
  calendlyUrl: "https://calendly.com/joel-staffxai/30min",
  email: "service@staffxai.com.au",
  social: {
    linkedin: "https://linkedin.com/company/staffxai",
    x: "https://x.com/staffxai",
  },
};

export const NAV_LINKS = [
  { label: "Services", href: "/#services" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/#book" },
];

export const CLIENTS = [
  "Gradability",
  "Performance Education",
  "OES",
  "MyIntegra",
];

export const SERVICES = [
  {
    label: "STRATEGY",
    title: "AI audits & transformation roadmaps",
    body: "We assess your current operations, identify high-impact AI opportunities, and build a prioritised roadmap your leadership team can actually execute. No generic playbooks — every recommendation is tailored to your business, your people, and your tech stack.",
    cta: "Explore Strategy →",
    // Replace with: "/images/service-strategy.webp"
    image:
      "https://images.unsplash.com/photo-1586717799252-bd134f3d4236?w=800&q=80&auto=format",
    alt: "Warm lightbulb representing strategic insight",
  },
  {
    label: "EDUCATION",
    title: "AI masterclasses & Copilot training",
    body: "Hands-on workshops that turn your team from AI-curious to AI-competent. Our Microsoft Copilot masterclasses, prompt engineering sessions, and change management programs are designed for real adoption — not just awareness.",
    cta: "Explore Education →",
    // Replace with: "/images/service-education.webp"
    image:
      "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=800&q=80&auto=format",
    alt: "Tablet with learning interface representing education",
  },
  {
    label: "DEVELOPMENT",
    title: "Custom AI agents & implementation",
    body: "From intelligent workflows to bespoke AI agents, we build and deploy solutions that integrate with your existing systems. We handle the technical complexity so your team can focus on outcomes.",
    cta: "Explore Development →",
    // Replace with: "/images/service-development.webp"
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80&auto=format",
    alt: "Dashboard interface showing AI analytics and insights",
  },
];

export const TESTIMONIAL = {
  // Replace with real customer data
  quote:
    "StaffxAI didn\u2019t just give us a strategy deck \u2014 they stayed with our team through every step of the rollout. Six months in, 85% of our staff use Copilot daily. That\u2019s unheard of.",
  name: "Sarah Chen",
  title: "Chief Operating Officer, TechForward Australia",
  // Replace with: "/images/testimonial.webp"
  image:
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80&auto=format",
};

export const METRICS = [
  {
    value: 60,
    suffix: "%",
    label: "Average productivity gain",
    context: "across client teams in the first 90 days",
  },
  {
    value: 2.4,
    suffix: "M",
    prefix: "$",
    label: "ROI delivered",
    context: "for enterprise clients in 2024\u201325",
  },
  {
    value: 4200,
    suffix: "",
    label: "Hours saved",
    context: "through AI workflow automation",
  },
  {
    value: 6,
    suffix: " months",
    label: "To full adoption",
    context: "with our guaranteed methodology",
  },
];

export const PRICING = [
  {
    name: "Spark",
    price: "$5,000",
    period: "one-off",
    description:
      "A focused AI audit and action plan for teams ready to start.",
    features: [
      "Comprehensive AI readiness assessment",
      "3 prioritised use-case recommendations",
      "Executive summary report",
      "30-day follow-up call",
    ],
  },
  {
    name: "Accelerate",
    price: "$15,000",
    period: "per quarter",
    description: "Hands-on AI transformation with embedded support.",
    features: [
      "Everything in Spark",
      "4\u00d7 Copilot masterclass sessions",
      "Custom prompt and skill library for your workflows",
      "Monthly progress reviews",
      "Slack support channel",
      "Change management framework",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Full-scale AI adoption with guaranteed outcomes.",
    features: [
      "Everything in Accelerate",
      "Custom AI agent development",
      "Dedicated transformation lead",
      "Quarterly board reporting",
      "Guaranteed adoption metrics or $0",
      "12-month partnership",
    ],
  },
];

export const FAQS = [
  {
    q: "What exactly is an AI audit?",
    a: "An AI audit is a structured assessment of your current operations, technology stack, and team capabilities. We identify where AI can deliver the highest ROI, flag risks, and produce a prioritised implementation roadmap tailored to your business.",
  },
  {
    q: "Do we need technical staff to work with you?",
    a: "Not at all. Our programs are designed for business leaders and non-technical teams. We handle the technical complexity and translate everything into clear, actionable language your team can work with.",
  },
  {
    q: "What\u2019s included in the Copilot masterclasses?",
    a: "Each session is 2 hours of hands-on training covering real workflows in your Microsoft 365 environment. Topics include prompting techniques, Copilot in Teams/Word/Excel/PowerPoint, and building custom Copilot agents. We tailor content to your industry and use cases.",
  },
  {
    q: "How is StaffxAI different from other AI consultancies?",
    a: "Most AI consultancies sell you a strategy deck and leave. We stay embedded with your team through implementation, measure adoption rates, and back our enterprise tier with a guarantee \u2014 if adoption targets aren\u2019t met, you pay $0.",
  },
  {
    q: "What\u2019s the \u2018guaranteed adoption or $0\u2019 promise?",
    a: "On our Enterprise tier, we agree on specific adoption metrics upfront \u2014 for example, 80% of your team actively using Copilot within 6 months. If we don\u2019t hit those targets, you don\u2019t pay for that quarter. We take on the risk because we\u2019re confident in our methodology.",
  },
  {
    q: "How long does a typical engagement last?",
    a: "The Spark audit is a 2\u20133 week engagement. Accelerate runs quarterly with the option to renew. Enterprise partnerships are typically 12 months. We\u2019ll recommend the right fit during your free strategy call.",
  },
  {
    q: "Do you work with companies outside Australia?",
    a: "Our primary focus is Australian businesses, but we\u2019ve delivered remote masterclasses and audits for teams in New Zealand, Singapore, and the UK. If you\u2019re in a similar timezone, we can make it work.",
  },
  {
    q: "What does the free AI insights call involve?",
    a: "It\u2019s a complimentary 15-minute session with one of our AI transformation specialists. We\u2019ll learn about your business, answer your questions, share some tailored insights, and suggest next steps. No sales pressure, no commitment required.",
  },
];
