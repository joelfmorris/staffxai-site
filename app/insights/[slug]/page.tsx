import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getLandingPage, getLandingPages, formatDate } from "@/lib/strapi";

export const revalidate = 60;

export async function generateStaticParams() {
  const pages = await getLandingPages();
  return pages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getLandingPage(slug);
  if (!page) return {};
  return {
    title: page.meta_title ?? page.title,
    description: page.meta_description ?? page.excerpt,
    openGraph: {
      title: page.meta_title ?? page.title,
      description: page.meta_description ?? page.excerpt,
      type: "article",
      publishedTime: page.publishedAt,
    },
  };
}

export default async function InsightPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getLandingPage(slug);

  if (!page) notFound();

  const content = page.content ?? "";

  return (
    <main className="pt-32 pb-20 px-6">
      <article className="max-w-prose mx-auto">
        <Link
          href="/insights"
          className="text-sm text-brand-muted hover:text-brand transition-colors duration-200 mb-8 inline-block"
        >
          &larr; Back to Insights
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <span className="text-xs text-brand-muted font-mono">
            {formatDate(page.publishedAt)}
          </span>
          <span className="text-brand-border">&middot;</span>
          <span className="text-xs font-mono text-brand-pop">Engine-generated</span>
        </div>

        <h1
          className="font-semibold text-brand tracking-tight leading-tight mb-10"
          style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)", letterSpacing: "-0.025em" }}
        >
          {page.title}
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
