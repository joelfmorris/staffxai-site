const STRAPI_URL = process.env.STRAPI_URL ?? "https://satisfying-luck-6f1749a7b7.strapiapp.com";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

export interface BlogPost {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  publishedAt: string;
  createdAt: string;
  meta_title?: string;
  meta_description?: string;
  read_time?: number;
}

export interface LandingPage {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  publishedAt: string;
  createdAt: string;
  meta_title?: string;
  meta_description?: string;
}

async function strapiGet<T>(path: string): Promise<T | null> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (STRAPI_API_TOKEN && STRAPI_API_TOKEN !== "placeholder_token") {
    headers["Authorization"] = `Bearer ${STRAPI_API_TOKEN}`;
  }

  try {
    const res = await fetch(`${STRAPI_URL}${path}`, {
      headers,
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

interface StrapiListResponse<T> {
  data: T[];
  meta: { pagination: { total: number } };
}

interface StrapiSingleResponse<T> {
  data: T[];
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  const res = await strapiGet<StrapiListResponse<BlogPost>>(
    "/api/blog-posts?sort=publishedAt:desc&pagination[pageSize]=100"
  );
  return res?.data ?? [];
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const res = await strapiGet<StrapiSingleResponse<BlogPost>>(
    `/api/blog-posts?filters[slug][$eq]=${encodeURIComponent(slug)}`
  );
  return res?.data?.[0] ?? null;
}

export async function getLatestBlogPosts(count = 3): Promise<BlogPost[]> {
  const res = await strapiGet<StrapiListResponse<BlogPost>>(
    `/api/blog-posts?sort=publishedAt:desc&pagination[pageSize]=${count}`
  );
  return res?.data ?? [];
}

export async function getLandingPages(): Promise<LandingPage[]> {
  const res = await strapiGet<StrapiListResponse<LandingPage>>(
    "/api/landing-pages?sort=publishedAt:desc&pagination[pageSize]=100"
  );
  return res?.data ?? [];
}

export async function getLandingPage(slug: string): Promise<LandingPage | null> {
  const res = await strapiGet<StrapiSingleResponse<LandingPage>>(
    `/api/landing-pages?filters[slug][$eq]=${encodeURIComponent(slug)}`
  );
  return res?.data?.[0] ?? null;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
  });
}

export function estimateReadTime(content: string): number {
  const words = content?.replace(/<[^>]+>/g, "").split(/\s+/).length ?? 0;
  return Math.max(1, Math.ceil(words / 200));
}
