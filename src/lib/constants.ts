export const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME ?? "AffiliRank";
export const SITE_TAGLINE =
  process.env.NEXT_PUBLIC_SITE_TAGLINE ?? "Rank first. Earn on autopilot.";
/** Short sub-label under the logo wordmark. */
export const SITE_BRAND_TAG =
  process.env.NEXT_PUBLIC_SITE_BRAND_TAG ?? "affiliate deal engine";
/**
 * When false, the AffiliRank product/sales pages (/affilirank, /funnel) are
 * hidden — used by white-label deployments like lifetimedealsbundle.com.
 */
export const SHOW_PRODUCT_PAGE = process.env.NEXT_PUBLIC_SHOW_PRODUCT_PAGE !== "false";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://affilirank.com";

export const CATEGORIES = [
  { slug: "ai-tools", label: "AI Tools", icon: "Sparkles" },
  { slug: "seo", label: "SEO", icon: "Search" },
  { slug: "video", label: "Video", icon: "Clapperboard" },
  { slug: "marketing", label: "Marketing", icon: "Megaphone" },
  { slug: "design", label: "Design", icon: "Palette" },
  { slug: "productivity", label: "Productivity", icon: "Zap" },
  { slug: "courses", label: "Courses", icon: "GraduationCap" },
  { slug: "tools", label: "Tools", icon: "Wrench" },
] as const;

export const DEFAULT_CURRENCY = "USD";

export const ADMIN_COOKIE = "ltd_admin_session";
export const ADMIN_SESSION_DAYS = 7;

export const SHARE_BASE_URL = `${SITE_URL}/deals`;

export const ANALYTICS_EVENTS = {
  CTA_CLICK: "cta_click",
  MODAL_OPEN: "modal_open",
  MODAL_CLOSE: "modal_close",
  VIDEO_MILESTONE: "video_milestone",
  SAVE_DEAL: "save_deal",
  UNSAVE_DEAL: "unsave_deal",
  SHARE_DEAL: "share_deal",
  COPY_COUPON: "copy_coupon",
  EXIT_INTENT_SHOWN: "exit_intent_shown",
  EXIT_INTENT_CTA: "exit_intent_cta",
  SEARCH: "search",
  FILTER: "filter",
} as const;

/** Current milestone % shown to analytics. */
export const VIDEO_MILESTONES = [0.25, 0.5, 0.75, 1] as const;
