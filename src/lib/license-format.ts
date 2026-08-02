import type { LicenseFeatureKey, LicensePayload, LicenseTier } from "@/lib/licensing";

/** Video types allowed on the base license (client-safe constants). */
export const BASE_VIDEO_TYPES = ["youtube", "vimeo"] as const;
export const PRO_VIDEO_TYPES = ["mp4", "iframe", "gif"] as const;

export interface LicenseFeatureDef {
  key: LicenseFeatureKey;
  label: string;
  description: string;
  /** Env var holding the upsell checkout URL for this feature. */
  env: string;
}

export const LICENSE_FEATURES: LicenseFeatureDef[] = [
  {
    key: "blog",
    label: "SEO Blog Module",
    description: "Auto-generated review articles at /blog for every deal.",
    env: "UPSELL_URL_BLOG",
  },
  {
    key: "unlimited-deals",
    label: "Unlimited Deals",
    description: "Remove the base deal cap (10).",
    env: "UPSELL_URL_UNLIMITED",
  },
  {
    key: "exit-intent",
    label: "Exit-Intent Popup",
    description: "High-converting popup + countdown when visitors leave.",
    env: "UPSELL_URL_EXIT",
  },
  {
    key: "analytics",
    label: "Analytics Module",
    description: "GA4 + Meta Pixel event tracking.",
    env: "UPSELL_URL_ANALYTICS",
  },
  {
    key: "deal-pages",
    label: "Deal Detail Pages",
    description: "SEO landing pages at /deals/[slug] with Product schema.",
    env: "UPSELL_URL_DEALS",
  },
  {
    key: "pro-video",
    label: "Pro Video Mode",
    description: "Support for MP4 / iframe / GIF creative beyond YouTube & Vimeo.",
    env: "UPSELL_URL_VIDEO",
  },
];

export const BUNDLE_ENV = "UPSELL_URL_BUNDLE";

/** All feature keys, used by bundle / full licenses. */
export const ALL_FEATURES: LicenseFeatureKey[] = LICENSE_FEATURES.map(
  (f) => f.key
);

/**
 * Client-safe helpers for displaying license keys. No crypto here — the
 * server (src/lib/licensing.ts) owns signature verification; these helpers
 * only surface the readable payload for the admin UI.
 */

export function decodeLicensePayload(key: string): LicensePayload | null {
  const clean = key.trim();
  const dot = clean.lastIndexOf(".");
  if (dot <= 0) return null;
  try {
    const json = atob(
      clean.slice(0, dot).replace(/-/g, "+").replace(/_/g, "/")
    );
    const payload = JSON.parse(json) as LicensePayload;
    return payload && payload.v === 1 ? payload : null;
  } catch {
    return null;
  }
}

export function licenseTierLabel(tier: LicenseTier): string {
  return tier === "bundle" ? "Bundle (full version)" : tier === "upsell" ? "Upsell" : "Base";
}
