import type { Metadata } from "next";
import Link from "next/link";
import { getBlogPosts, formatDate, estimateReadTime } from "@/lib/strapi";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Every post on this page was researched, written, and published by the autonomous marketing engine — on schedule, with no human involvement.",
};

export const revalidate = 60;

export default async function BlogPage() {
  const posts = await getBlogPosts();

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
          The engine at work.
        </h1>
        <p className="text-brand-muted text-lg leading-relaxed">
          Every post on this page was researched, written, and published by the autonomous marketing engine — on schedule, with no human involvement. This is what it produces.
        </p>
      </section>

      {/* ── Posts Grid ───────────────────────────────────── */}
      <section className="max-w-prose mx-auto">
        {posts.length === 0 ? (
          <div className="py-20 text-center border border-brand-border rounded-card">
            <p className="text-brand-muted mb-2">No posts yet.</p>
            <p className="text-sm text-brand-muted">The engine is warming up — check back soon.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            {posts.map((post) => {
              const readTime = post.read_time ?? (post.content ? estimateReadTime(post.content) : null);
              return (
                <article
                  key={post.id}
                  className="group border-b border-brand-border-subtle pb-12 last:border-0"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs text-brand-muted font-mono">
                      {formatDate(post.publishedAt)}
                    </span>
                    {readTime && (
                      <>
                        <span className="text-brand-border">&middot;</span>
                        <span className="text-xs text-brand-muted">{readTime} min read</span>
                      </>
                    )}
                  </div>
                  <Link href={`/blog/${post.slug}`}>
                    <h2 className="text-xl font-semibold text-brand tracking-tight mb-2 group-hover:opacity-70 transition-opacity duration-200 leading-snug">
                      {post.title}
                    </h2>
                  </Link>
                  {post.excerpt && (
                    <p className="text-brand-muted leading-relaxed mb-4">
                      {post.excerpt}
                    </p>
                  )}
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-sm font-medium text-brand hover:opacity-70 transition-opacity duration-200"
                  >
                    Read more &rarr;
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
