import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDealBySlug, getLicenseState } from "@/lib/data";
import { getCurrentTenant } from "@/lib/tenant";
import { StreamProvider } from "@/components/stream-provider";
import { DealCard } from "@/components/deal-card";
import { DealModal } from "@/components/deal-modal";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { truncate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: Promise<{ slug: string }>;
}

/* ---------------------------------------------------------------------------
 * Share-image resolution.
 *
 * The auto-publisher writes the rendered thumbnail to Supabase Storage
 * (previews/deals/{slug}.png) and its 1200x630 Facebook variant to
 * previews/og/{slug}.png, then patches hero_image. Any step can lag or fail
 * (worker still running, OG render skipped, YouTube thumbnails.set 403), so
 * we probe the candidates and use the first that actually exists instead of
 * advertising a broken URL to Facebook.
 * ------------------------------------------------------------------------- */

const ogImageCache = new Map<string, { url: string; at: number }>();
const OG_CACHE_TTL_MS = 10 * 60 * 1000;

async function headOk(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function resolveShareImage(
  deal: { slug: string; hero_image: string | null },
  tenantId: string
): Promise<string> {
  const key = `${deal.slug}|${deal.hero_image ?? ""}`;
  const hit = ogImageCache.get(key);
  if (hit && Date.now() - hit.at < OG_CACHE_TTL_MS) return hit.url;

  const candidates: string[] = [];
  const ogFromHero = deal.hero_image?.includes("/previews/deals/")
    ? deal.hero_image.replace("/previews/deals/", "/previews/og/")
    : null;
  if (ogFromHero) candidates.push(ogFromHero);
  if (deal.hero_image) candidates.push(deal.hero_image);
  const storageBase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (storageBase) {
    const root = `${storageBase.replace(/\/$/, "")}/storage/v1/object/public/previews`;
    candidates.push(
      `${root}/og/${tenantId}/${deal.slug}.png`,
      `${root}/og/${deal.slug}.png`,
      `${root}/deals/${tenantId}/${deal.slug}.png`,
      `${root}/deals/${deal.slug}.png`
    );
  }

  let resolved = `${SITE_URL}/og-default.png`;
  for (const candidate of candidates) {
    if (await headOk(candidate)) {
      resolved = candidate;
      break;
    }
  }
  ogImageCache.set(key, { url: resolved, at: Date.now() });
  return resolved;
}

/**
 * Dynamic OpenGraph metadata per deal — sharing a card URL on X/Facebook/Slack
 * renders a rich preview with the hero image, VSL and pricing.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getCurrentTenant();
  const state = await getLicenseState(tenant.id);
  if (!state.features.has("deal-pages")) return { title: "Deal not found" };
  const deal = await getDealBySlug(tenant.id, slug);
  if (!deal) return { title: "Deal not found" };
  const title = `${deal.title} — Lifetime Deal`;
  const description = truncate(
    deal.subtitle ??
      deal.description ??
      `Lifetime deal for ${deal.title} on ${SITE_NAME}.`,
    160
  );
  const url = `${SITE_URL}/deals/${deal.slug}`;
  // Facebook renders link previews at 1.91:1 (1200x630) and crops 16:9
  // thumbs. Prefer the pre-rendered 1200x630 OG variant from /previews/og/
  // (falling back through the raw thumb and the scraped hero image when a
  // step in the render pipeline hasn't run yet) so shares always show a
  // working image.
  const image = await resolveShareImage(deal, tenant.id);

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
  const tenant = await getCurrentTenant();
  const state = await getLicenseState(tenant.id);
  if (!state.features.has("deal-pages")) notFound();
  const deal = await getDealBySlug(tenant.id, slug);
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
        <DealCard deal={deal} standalone priority />
        <DealModal />
      </StreamProvider>
    </>
  );
}
