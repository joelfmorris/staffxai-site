import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getBlogPost, getBlogPosts, formatDate, estimateReadTime } from "@/lib/strapi";

export const revalidate = 60;

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return {};
  return {
    title: post.meta_title ?? post.title,
    description: post.meta_description ?? post.excerpt,
    openGraph: {
      title: post.meta_title ?? post.title,
      description: post.meta_description ?? post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) notFound();

  const readTime = post.read_time ?? (post.content ? estimateReadTime(post.content) : null);
  const content = post.content ?? "";

  return (
    <main className="pt-32 pb-20 px-6">
      <article className="max-w-prose mx-auto">
        <Link
          href="/blog"
          className="text-sm text-brand-muted hover:text-brand transition-colors duration-200 mb-8 inline-block"
        >
          &larr; Back to blog
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <span className="text-xs text-brand-muted font-mono">
            {formatDate(post.publishedAt)}
          </span>
          {readTime && (
            <>
              <span className="text-brand-border">&middot;</span>
              <span className="text-xs text-brand-muted">{readTime} min read</span>
            </>
          )}
          <span className="text-brand-border">&middot;</span>
          <span className="text-xs font-mono text-brand-pop">Engine-generated</span>
        </div>

        <h1
          className="font-semibold text-brand tracking-tight leading-tight mb-10"
          style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)", letterSpacing: "-0.025em" }}
        >
          {post.title}
        </h1>

        <div className="prose max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>

        {/* CTA */}
        <div className="mt-16 p-8 rounded-card bg-brand-surface border border-brand-border text-center">
          <p className="font-semibold text-brand mb-2">
            Want an engine like this running for your business?
          </p>
          <p className="text-sm text-brand-muted mb-6">
            A 15-minute call. No pitch deck. We&rsquo;ll show you it running live.
          </p>
          <Link
            href="/book"
            className="inline-block px-7 py-3 rounded-pill text-sm font-medium bg-brand text-white hover:bg-[#333] transition-all duration-200"
          >
            Book a Call
          </Link>
        </div>
      </article>
    </main>
  );
}
