import { getPublishedBlogPosts } from "@/lib/data";
import { getCurrentTenant } from "@/lib/tenant";
import { SITE_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

function rssDate(iso: string) {
  return new Date(iso).toUTCString();
}

function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** /rss.xml — feed of all published blog articles for the current tenant. */
export async function GET() {
  const tenant = await getCurrentTenant();
  const siteUrl = `https://${tenant.domain}`;
  const posts = await getPublishedBlogPosts(tenant.id);
  const latest = posts[0]?.updated_at ?? new Date().toISOString();

  const items = posts
    .map((p) => {
      const url = `${siteUrl}/blog/${p.slug}`;
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${rssDate(p.created_at)}</pubDate>
      <description>${escapeXml(p.excerpt)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME} — Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Lifetime deal reviews, feature breakdowns and buying guides for one-time-payment software.</description>
    <language>en-us</language>
    <lastBuildDate>${rssDate(latest)}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
