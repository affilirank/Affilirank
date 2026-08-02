import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, ArrowRight, Newspaper } from "lucide-react";
import { getPublishedBlogPosts, getPublishedDeals, getLicenseState } from "@/lib/data";
import { BlogNav } from "@/components/blog-nav";
import { Logo } from "@/components/logo";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/constants";
import { categoryLabel, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const state = await getLicenseState();
  if (!state.features.has("blog")) return { title: "Blog not found" };
  const posts = await getPublishedBlogPosts();
  const description = `In-depth lifetime deal reviews, feature breakdowns and buying guides for the best one-time-payment software on ${SITE_NAME}. ${posts.length} articles and growing.`;
  return {
    title: `Blog — Lifetime Deal Reviews & Guides`,
    description,
    alternates: { canonical: `${SITE_URL}/blog` },
    openGraph: {
      type: "website",
      url: `${SITE_URL}/blog`,
      siteName: SITE_NAME,
      title: `Blog — Lifetime Deal Reviews & Guides`,
      description,
      images: [{ url: `${SITE_URL}/og-default.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `Blog — Lifetime Deal Reviews & Guides`,
      description,
    },
    keywords: [
      "lifetime deals blog",
      "software reviews",
      "one-time payment software",
      "lifetime license reviews",
      "deal guides",
    ],
  };
}

export default async function BlogIndex() {
  const state = await getLicenseState();
  if (!state.features.has("blog")) notFound();
  const [posts, deals] = await Promise.all([
    getPublishedBlogPosts(),
    getPublishedDeals(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${SITE_NAME} Blog`,
    description: SITE_TAGLINE,
    url: `${SITE_URL}/blog`,
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `${SITE_URL}/blog/${p.slug}`,
      datePublished: p.created_at,
      dateModified: p.updated_at,
    })),
  };

  return (
    <div className="min-h-[100svh] bg-void text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogNav active="blog" />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-5%,rgba(124,58,237,0.25),transparent_60%)]" />
        <div className="relative mx-auto max-w-5xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-violet-300/90">
            <Newspaper className="mr-1 inline h-4 w-4 -translate-y-0.5" />
            Lifetime Deal Blog
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight sm:text-5xl">
            Reviews, Pricing &amp; Buying Guides
            <span className="text-gradient"> for One-Time Tools</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
            We test and review the best lifetime software deals so you can buy
            with confidence. Every article covers features, who it&apos;s for,
            honest pricing and a clear answer on whether it&apos;s worth it.
          </p>
        </div>
      </section>

      {/* Posts */}
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-panel py-20 text-center">
            <Newspaper className="h-10 w-10 text-white/25" />
            <p className="text-sm text-white/55">
              No articles yet — publish a deal and its review appears here
              automatically.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => {
              const deal = deals.find((d) => d.id === post.deal_id);
              return (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-panel transition hover:border-violet-400/40 hover:shadow-xl hover:shadow-violet-500/10"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-black">
                    {post.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.cover_image}
                        alt={post.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Logo size={48} />
                      </div>
                    )}
                    {post.category && (
                      <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300 backdrop-blur">
                        {categoryLabel(post.category)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <h2 className="line-clamp-2 font-display text-base font-bold leading-snug text-white transition group-hover:text-violet-200">
                      {post.title}
                    </h2>
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-white/55">
                      {post.excerpt}
                    </p>

                    <div className="mt-auto flex items-center justify-between pt-4 text-[11px] text-white/40">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {post.reading_time_minutes} min read
                      </span>
                      {deal?.price != null && (
                        <span className="font-bold text-emerald-300">
                          {formatPrice(deal.price, deal.currency)}
                          {deal.original_price && (
                            <span className="ml-1 font-medium text-white/30 line-through">
                              {formatPrice(deal.original_price, deal.currency)}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <div className="glass flex flex-col items-center gap-4 rounded-3xl p-8 text-center sm:p-10">
          <h2 className="font-display text-2xl font-bold">
            Ready to grab a <span className="text-gradient">lifetime deal</span>?
          </h2>
          <p className="max-w-xl text-sm text-white/60">
            {deals.length > 0
              ? `Explore ${deals.length} hand-picked one-time deals on the stream — starting at ${formatPrice(
                  Math.min(
                    ...deals
                      .map((d) => d.price)
                      .filter((p): p is number => p != null),
                    999999
                  )
                )}.`
              : "Explore our hand-picked one-time deals on the stream."}
          </p>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-500 px-6 py-3 text-sm font-bold text-white transition hover:brightness-110 cta-glow"
          >
            Browse the Deal Stream
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
