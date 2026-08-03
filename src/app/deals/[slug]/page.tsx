import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDealBySlug, getLicenseState } from "@/lib/data";
import { StreamProvider } from "@/components/stream-provider";
import { DealCard } from "@/components/deal-card";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { truncate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Dynamic OpenGraph metadata per deal — sharing a card URL on X/Facebook/Slack
 * renders a rich preview with the hero image, VSL and pricing.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const state = await getLicenseState();
  if (!state.features.has("deal-pages")) return { title: "Deal not found" };
  const deal = await getDealBySlug(slug);
  if (!deal) return { title: "Deal not found" };

  const title = `${deal.title} — Lifetime Deal`;
  const description = truncate(
    deal.subtitle ??
      deal.description ??
      `Lifetime deal for ${deal.title} on ${SITE_NAME}.`,
    160
  );
  const url = `${SITE_URL}/deals/${deal.slug}`;
  const image = deal.hero_image ?? `${SITE_URL}/og-default.png`;

  // Only advertise og:video for formats Facebook can actually validate:
  // direct MP4 files, or YouTube player pages (text/html). Vimeo embed URLs
  // return 405/text-html and would break the share preview, so omit them.
  const videos: NonNullable<Metadata["openGraph"]>["videos"] = [];
  if (deal.video_type === "mp4" && deal.video_url) {
    videos.push({ url: deal.video_url, type: "video/mp4" });
  } else if (deal.video_type === "youtube" && deal.video_url) {
    videos.push({ url: deal.video_url, type: "text/html" });
  }

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: [{ url: image, width: 1200, height: 630 }],
      ...(videos.length > 0 ? { videos } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function DealPage({ params }: Props) {
  const { slug } = await params;
  const state = await getLicenseState();
  if (!state.features.has("deal-pages")) notFound();
  const deal = await getDealBySlug(slug);
  if (!deal) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: deal.title,
    description: deal.description ?? deal.subtitle ?? undefined,
    image: deal.hero_image ?? undefined,
    brand: { "@type": "Brand", name: deal.title },
    offers: {
      "@type": "Offer",
      price: deal.price ?? undefined,
      priceCurrency: deal.currency,
      url: deal.affiliate_url,
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <StreamProvider initialDeals={[deal]} features={[...state.features]}>
        <DealCard deal={deal} standalone />
      </StreamProvider>
    </>
  );
}
