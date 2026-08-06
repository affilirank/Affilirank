import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Clock,
  Calendar,
  BadgeCheck,
  Check,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Zap,
  ChevronRight,
} from "lucide-react";
import {
  getBlogPostBySlug,
  getDealById,
  getLicenseState,
  getPublishedDeals,
} from "@/lib/data";
import { BlogNav } from "@/components/blog-nav";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { categoryLabel, discountPercent, formatPrice } from "@/lib/utils";
import type { Deal } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const state = await getLicenseState();
  if (!state.features.has("blog")) return { title: "Article not found" };
  const post = await getBlogPostBySlug(slug);
  if (!post) return { title: "Article not found" };

  const url = `${SITE_URL}/blog/${post.slug}`;
  const image = post.cover_image ?? `${SITE_URL}/og-default.png`;

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: url },
    keywords: post.keywords,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url,
      siteName: SITE_NAME,
      images: [{ url: image, width: 1200, height: 630 }],
      publishedTime: post.created_at,
      modifiedTime: post.updated_at,
      authors: [SITE_NAME],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [image],
    },
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function AffiliateCta({ deal, label }: { deal: Deal | null; label: string }) {
  const price = formatPrice(deal?.price, deal?.currency);
  const pct = discountPercent(deal?.original_price ?? null, deal?.price ?? null);

  return (
    <div className="my-8 overflow-hidden rounded-3xl border border-violet-400/30 bg-gradient-to-br from-violet-600/15 via-panel to-cyan-500/10 p-6 text-center sm:p-8 cta-glow">
      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-violet-300">
        Lifetime Deal · One-Time Payment
      </p>
      {pct && (
        <p className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">
          <span className="text-gradient">{pct}% OFF</span>{" "}
          {price && (
            <>
              <span className="align-top text-lg text-white/40 line-through">
                {formatPrice(deal?.original_price, deal?.currency)}
              </span>{" "}
              <span className="text-white">{price}</span>
            </>
          )}
        </p>
      )}
      {!pct && price && (
        <p className="mt-3 font-display text-3xl font-extrabold text-white">
          {price} <span className="text-base font-semibold text-white/50">one-time</span>
        </p>
      )}
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-white/60">
        Pay once, own it forever. No monthly fees, no renewals — includes all
        future updates.
      </p>
      <a
        href={deal?.affiliate_url ?? "#"}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-500 px-7 py-3.5 text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.98]"
      >
        <Zap className="h-4 w-4" />
        {label}
        <ArrowRight className="h-4 w-4" />
      </a>
      {deal?.bundle_url && (
        <a
          href={deal.bundle_url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-7 py-3.5 text-sm font-bold text-amber-200 transition hover:bg-amber-400/20 active:scale-[0.98]"
        >
          <Zap className="h-4 w-4" />
          Get The Bundle &amp; Save More
          <ArrowRight className="h-4 w-4" />
        </a>
      )}
      <p className="mt-3 text-[11px] text-white/40">
        Official affiliate links — we may earn a commission at no extra cost to you.
      </p>
    </div>
  );
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const state = await getLicenseState();
  if (!state.features.has("blog")) notFound();
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  const [deal, deals] = await Promise.all([
    post.deal_id ? getDealById(post.deal_id) : null,
    getPublishedDeals(),
  ]);

  const related = deals
    .filter((d) => d.id !== post.deal_id)
    .slice(0, 3);
  const name = post.title.split(":")[0] || post.title;
  const ctaLabel = `Get ${name} Now`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: name },
    ],
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.cover_image ?? undefined,
    datePublished: post.created_at,
    dateModified: post.updated_at,
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    keywords: post.keywords.join(", "),
    ...(deal
      ? {
          about: {
            "@type": "Product",
            name: name,
            image: post.cover_image ?? undefined,
            offers: deal.price
              ? {
                  "@type": "Offer",
                  price: deal.price,
                  priceCurrency: deal.currency,
                  url: deal.affiliate_url,
                }
              : undefined,
          },
        }
      : {}),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: post.faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="min-h-[100svh] bg-void text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <BlogNav active="blog" />

      {/* Breadcrumb */}
      <nav className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-white/45">
          <li>
            <Link href="/" className="transition hover:text-white">
              Home
            </Link>
          </li>
          <li>
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
          <li>
            <Link href="/blog" className="transition hover:text-white">
              Blog
            </Link>
          </li>
          <li>
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
          <li className="truncate text-white/70">{name}</li>
        </ol>
      </nav>

      <article className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
        {/* Header */}
        <header className="text-center">
          <div className="flex items-center justify-center gap-2">
            {post.category && (
              <span className="rounded-full bg-violet-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-violet-300">
                {categoryLabel(post.category)}
              </span>
            )}
            {deal && pctLabel(deal) && (
              <span className="rounded-full bg-rose-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-rose-300">
                {pctLabel(deal)}
              </span>
            )}
          </div>
          <h1 className="mt-4 font-display text-2xl font-extrabold leading-tight sm:text-4xl">
            {post.title}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
            {post.excerpt}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-white/45">
            <span className="flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4 text-emerald-300" />
              By the {SITE_NAME} Team
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(post.created_at)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {post.reading_time_minutes} min read
            </span>
          </div>
        </header>

        {/* Hero image */}
        {post.cover_image && (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-3xl border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.cover_image}
              alt={name}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Top affiliate CTA */}
        {deal && <AffiliateCta deal={deal} label={ctaLabel} />}

        {/* Sections */}
        <div className="mt-6 space-y-8">
          {post.sections.map((section, i) => (
            <section key={i}>
              <h2
                id={section.heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}
                className="scroll-mt-24 font-display text-xl font-bold sm:text-2xl"
              >
                {section.heading}
              </h2>
              {section.paragraphs.map((p, j) => (
                <p
                  key={j}
                  className="mt-3 text-[15px] leading-relaxed text-white/75"
                >
                  {p}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="mt-4 space-y-2.5">
                  {section.bullets.map((b, k) => (
                    <li key={k} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-white/75">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500">
                        <Check className="h-3 w-3 text-white" />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              )}
              {section.cta && deal && (
                <AffiliateCta deal={deal} label={ctaLabel} />
              )}
            </section>
          ))}
        </div>

        {/* FAQ */}
        <section className="mt-12">
          <h2
            id="faq"
            className="scroll-mt-24 font-display text-xl font-bold sm:text-2xl"
          >
            Frequently Asked Questions
          </h2>
          <div className="mt-4 space-y-3">
            {post.faq.map((f, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-white/10 bg-panel open:border-violet-400/30"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-white transition hover:text-violet-200 [&::-webkit-details-marker]:hidden">
                  {f.question}
                  <ChevronDown className="h-4 w-4 shrink-0 text-white/50 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-white/65">
                  {f.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        {deal && (
          <div className="mt-12 text-center">
            <AffiliateCta deal={deal} label={ctaLabel} />
            <Link
              href={`/deals/${deal.slug}`}
              className="text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
            >
              Watch the sales video &amp; see this deal in the stream →
            </Link>
          </div>
        )}

        {/* Trust row */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/45">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            Secure checkout via JVZoo
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-amber-300" />
            Instant delivery
          </span>
          <span className="flex items-center gap-1.5">
            <BadgeCheck className="h-4 w-4 text-cyan-300" />
            Affiliate disclosure: we may earn a commission
          </span>
        </div>
      </article>

      {/* Related deals */}
      {related.length > 0 && (
        <section className="border-t border-white/10 bg-abyss/60">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
            <h2
              id="related-deals"
              className="scroll-mt-24 text-center font-display text-xl font-bold sm:text-2xl"
            >
              More <span className="text-gradient">Lifetime Deals</span> to Explore
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {related.map((d) => (
                <Link
                  key={d.id}
                  href={`/deals/${d.slug}`}
                  className="group overflow-hidden rounded-3xl border border-white/10 bg-panel transition hover:border-violet-400/40"
                >
                  <div className="relative aspect-video overflow-hidden bg-black">
                    {d.hero_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={d.hero_image}
                        alt={d.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-white/30">
                        {d.title}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="truncate text-sm font-bold text-white transition group-hover:text-violet-200">
                      {d.title}
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      {formatPrice(d.price, d.currency)}
                      {d.original_price && (
                        <span className="ml-1.5 text-white/30 line-through">
                          {formatPrice(d.original_price, d.currency)}
                        </span>
                      )}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function pctLabel(deal: Deal) {
  const pct = discountPercent(deal.original_price, deal.price);
  return pct ? `${pct}% OFF` : null;
}
