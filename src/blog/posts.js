/*
 * ─── BLOG POSTS ──────────────────────────────────────
 * Add new posts to the top of this array.
 * Content is HTML string — use <h2>, <h3>, <p>, <ul>, <li>, <blockquote>, <code>, <img> etc.
 * Images: place in /public/images/blog/ and reference as "/images/blog/filename.webp"
 *
 * For a markdown-based blog later, swap this for a .md loader (gray-matter + marked).
 */

export const blogPosts = [
  {
    slug: "why-copilot-adoption-stalls",
    title: "Why Microsoft Copilot adoption stalls — and how to fix it",
    excerpt:
      "Most organisations buy Copilot licences and expect magic. Here's why the real work starts after deployment, and the three things that actually drive adoption.",
    date: "March 2026",
    category: "Copilot",
    readTime: 6,
    // Replace with: "/images/blog/copilot-adoption.webp"
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80&auto=format",
    content: `
      <p>You've rolled out Microsoft Copilot licences across your organisation. The executive team is excited. IT has done their part. And yet, three months later, adoption sits at 15–20%. Sound familiar?</p>

      <p>This is the most common pattern we see at StaffxAI. The technology works. The licences are paid for. But the humans haven't changed their workflows — and nobody expected them to without help.</p>

      <h2>The adoption gap is a people problem, not a tech problem</h2>

      <p>Microsoft has built an extraordinary product. Copilot genuinely saves time when used well. But "when used well" is doing a lot of heavy lifting in that sentence. Most knowledge workers don't know what to ask it, don't trust the output, or simply forget it exists during their workday.</p>

      <p>The gap between "Copilot is available" and "Copilot is embedded in daily work" is a change management challenge — not an IT deployment challenge.</p>

      <h2>Three things that actually drive adoption</h2>

      <h3>1. Workflow-specific training, not feature demos</h3>
      <p>Generic "here's what Copilot can do" sessions don't stick. What works is showing a sales manager how to use Copilot to prep for a specific client meeting using their actual CRM data. Show a finance team how to summarise their real board pack. Context makes it click.</p>

      <h3>2. Prompt libraries built for your business</h3>
      <p>The biggest barrier to adoption is the blank prompt box. When someone opens Copilot and doesn't know what to type, they close it. A curated library of 20–30 prompts tailored to your most common workflows removes that friction entirely.</p>

      <h3>3. Embedded champions, not one-off workshops</h3>
      <p>A single training session has a half-life of about two weeks. What sustains adoption is having someone (internal or external) who checks in regularly, answers questions, shares tips, and celebrates wins. We call this the "embed" phase — and it's where most consultancies disappear.</p>

      <h2>What 80% adoption actually looks like</h2>

      <p>When we work with enterprise clients on our Accelerate program, we track adoption weekly. The pattern is consistent: a spike after training, a dip in week 3–4, and then a steady climb as the prompt library and champion network take effect. By month 4–5, Copilot becomes invisible — it's just how people work.</p>

      <p>That's the goal. Not "people use Copilot" but "people can't imagine working without it."</p>
    `,
  },
  {
    slug: "ai-audit-what-to-expect",
    title: "What to expect from an AI audit (and why it's worth the investment)",
    excerpt:
      "An AI audit isn't a sales pitch. It's a structured assessment that tells you exactly where AI will — and won't — deliver ROI for your business.",
    date: "February 2026",
    category: "Strategy",
    readTime: 5,
    // Replace with: "/images/blog/ai-audit.webp"
    image:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80&auto=format",
    content: `
      <p>When we tell prospective clients that our Spark engagement starts with an AI audit, the most common response is "what does that actually involve?" Fair question.</p>

      <p>An AI audit is a structured assessment of your organisation's readiness to adopt AI — and more importantly, where AI will generate the most value. It's not a technology review. It's a business review through an AI lens.</p>

      <h2>What we look at</h2>

      <p>Over 2–3 weeks, we examine three layers of your organisation:</p>

      <p><strong>Operations:</strong> Where are your teams spending the most time on repetitive, information-heavy tasks? We map workflows across departments to find the highest-impact automation and augmentation opportunities.</p>

      <p><strong>Technology:</strong> What's your current stack? Are you on Microsoft 365? Do you have data in silos? Are there integration blockers? We assess technical readiness so our recommendations are actually implementable.</p>

      <p><strong>People:</strong> What's the current AI literacy across your team? Where's the enthusiasm, and where's the resistance? This is often the most valuable layer — because great technology means nothing if people won't use it.</p>

      <h2>What you get</h2>

      <p>The output is an executive summary report with three prioritised use cases, each scored on impact, effort, and risk. We don't give you 50 ideas — we give you the 3 that matter most, with a clear path to implement each one.</p>

      <p>We also include a readiness scorecard, a recommended technology approach, and a 90-day action plan. It's designed to be taken straight to your leadership team or board.</p>

      <h2>Why it's worth doing first</h2>

      <p>The biggest mistake we see is organisations jumping straight to implementation without understanding where AI will actually help. They buy Copilot licences for everyone, build a chatbot nobody uses, or invest in a custom AI project that solves the wrong problem.</p>

      <p>A $5,000 audit that saves you from a $100,000 misdirected implementation is the best ROI in AI.</p>
    `,
  },
];
