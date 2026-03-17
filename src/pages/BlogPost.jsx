import { useParams, Link } from "react-router-dom";
import { blogPosts } from "../blog/posts";

export default function BlogPost() {
  const { slug } = useParams();
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    return (
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-prose mx-auto text-center">
          <h1 className="text-2xl font-semibold text-brand mb-4">
            Post not found
          </h1>
          <Link
            to="/blog"
            className="text-sm font-medium text-brand hover:opacity-70 transition-opacity"
          >
            &larr; Back to blog
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-32 pb-20 px-6">
      <article className="max-w-prose mx-auto">
        <Link
          to="/blog"
          className="text-sm text-brand-muted hover:text-brand transition-colors duration-200 mb-8 inline-block"
        >
          &larr; Back to blog
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-mono text-brand-muted tracking-wide uppercase">
            {post.category}
          </span>
          <span className="text-brand-border">&middot;</span>
          <span className="text-xs text-brand-muted">{post.date}</span>
          {post.readTime && (
            <>
              <span className="text-brand-border">&middot;</span>
              <span className="text-xs text-brand-muted">
                {post.readTime} min read
              </span>
            </>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-semibold text-brand tracking-tight leading-tight mb-6">
          {post.title}
        </h1>

        {post.image && (
          <img
            src={post.image}
            alt={post.title}
            className="w-full h-auto aspect-[2/1] object-cover rounded-card mb-10"
          />
        )}

        <div
          className="prose"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* CTA */}
        <div className="mt-16 p-8 rounded-card bg-brand-surface border border-brand-border text-center">
          <p className="font-semibold text-brand mb-2">
            Ready to start your AI transformation?
          </p>
          <p className="text-sm text-brand-muted mb-6">
            Book a complimentary 15-minute strategy call.
          </p>
          <a
            href="/#book"
            className="inline-block px-7 py-3 rounded-pill text-sm font-medium bg-brand text-white hover:bg-[#333] transition-all duration-200"
          >
            Book an intro
          </a>
        </div>
      </article>
    </main>
  );
}
