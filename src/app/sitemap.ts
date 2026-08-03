import type { MetadataRoute } from "next";
import { getPublishedBlogPosts, getPublishedDeals } from "@/lib/data";
import { SITE_URL, SHOW_PRODUCT_PAGE } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * /sitemap.xml — every public page: static routes, per-deal SEO pages and
 * the auto-generated blog articles.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [deals, posts] = await Promise.all([
    getPublishedDeals(),
    getPublishedBlogPosts(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/blog`, changeFrequency: "daily", priority: 0.9 },
  ];

  if (SHOW_PRODUCT_PAGE) {
    staticEntries.push({
      url: `${SITE_URL}/affilirank`,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  const dealEntries: MetadataRoute.Sitemap = deals.map((d) => ({
    url: `${SITE_URL}/deals/${d.slug}`,
    lastModified: new Date(d.updated_at),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const blogEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticEntries, ...dealEntries, ...blogEntries];
}
