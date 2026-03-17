import { Link } from "react-router-dom";
import { blogPosts } from "../blog/posts";

export default function BlogIndex() {
  return (
    <main className="pt-32 pb-20 px-6">
      <div className="max-w-prose mx-auto">
        <h1 className="text-3xl font-semibold text-brand tracking-tight mb-4">
          Blog
        </h1>
        <p className="text-brand-muted mb-16 text-lg leading-relaxed">
          Insights on AI transformation, Microsoft Copilot adoption, and
          building AI-ready teams.
        </p>

        <div className="flex flex-col gap-12">
          {blogPosts.map((post) => (
            <article
              key={post.slug}
              className="group border-b border-brand-border-subtle pb-12 last:border-0"
            >
              {post.image && (
                <Link to={`/blog/${post.slug}`}>
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-auto aspect-[2/1] object-cover rounded-card mb-6 transition-opacity duration-200 group-hover:opacity-90"
                    loading="lazy"
                  />
                </Link>
              )}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-mono text-brand-muted tracking-wide uppercase">
                  {post.category}
                </span>
                <span className="text-brand-border">&middot;</span>
                <span className="text-xs text-brand-muted">{post.date}</span>
              </div>
              <Link to={`/blog/${post.slug}`}>
                <h2 className="text-xl font-semibold text-brand tracking-tight mb-2 group-hover:opacity-70 transition-opacity duration-200">
                  {post.title}
                </h2>
              </Link>
              <p className="text-brand-muted leading-relaxed mb-4">
                {post.excerpt}
              </p>
              <Link
                to={`/blog/${post.slug}`}
                className="text-sm font-medium text-brand hover:opacity-70 transition-opacity duration-200"
              >
                Read more &rarr;
              </Link>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
