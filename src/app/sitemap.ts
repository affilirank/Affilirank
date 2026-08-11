import type { MetadataRoute } from "next";
import { getPublishedBlogPosts, getPublishedDeals } from "@/lib/data";
import { getCurrentTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * /sitemap.xml — every public page for the current tenant: static routes,
 * per-deal SEO pages and the auto-generated blog articles.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tenant = await getCurrentTenant();
  const siteUrl = `https://${tenant.domain}`;
  const [deals, posts] = await Promise.all([
    getPublishedDeals(tenant.id),
    getPublishedBlogPosts(tenant.id),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/blog`, changeFrequency: "daily", priority: 0.9 },
  ];

  if (tenant.show_product_page) {
    staticEntries.push({
      url: `${siteUrl}/affilirank`,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  const dealEntries: MetadataRoute.Sitemap = deals.map((d) => ({
    url: `${siteUrl}/deals/${d.slug}`,
    lastModified: new Date(d.updated_at),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const blogEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${siteUrl}/blog/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticEntries, ...dealEntries, ...blogEntries];
}
