export type VideoType = "youtube" | "vimeo" | "mp4" | "iframe" | "gif";

export type DealTag = "hot" | "popular" | "lifetime" | "new";

export interface Deal {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  /** Feature bullets shown in the modal ("Save up to 80%", ...) */
  highlights: string[] | null;
  /** One of the curated categories in `CATEGORIES` (lower-kebab). */
  category: string | null;
  hero_image: string | null;
  video_url: string | null;
  video_type: VideoType | null;
  deal_tag: string | null;
  tag_style: DealTag | null;
  coupon_code: string | null;
  price: number | null;
  original_price: number | null;
  currency: string;
  /** Final affiliate URL that actually converts. */
  affiliate_url: string;
  /** The raw JVZoo page that was scraped. */
  source_url: string | null;
  /** ISO timestamp. When set + countdown_enabled, a live timer renders. */
  expiration_date: string | null;
  countdown_enabled: boolean;
  featured: boolean;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScrapeResult {
  url: string;
  affiliate_url: string;
  title: string | null;
  description: string | null;
  hero_image: string | null;
  video_url: string | null;
  video_type: VideoType | null;
  price: number | null;
  original_price: number | null;
  currency: string;
  site_name: string | null;
  favicon: string | null;
  detected_highlights: string[];
}

export interface DealDraft {
  title: string;
  subtitle: string | null;
  description: string | null;
  highlights: string[] | null;
  category: string | null;
  hero_image: string | null;
  video_url: string | null;
  video_type: VideoType | null;
  deal_tag: string | null;
  tag_style: DealTag | null;
  coupon_code: string | null;
  price: number | null;
  original_price: number | null;
  currency: string;
  affiliate_url: string;
  source_url: string | null;
  expiration_date: string | null;
  countdown_enabled: boolean;
  featured: boolean;
  sort_order: number;
  published: boolean;
}

export interface StreamFilters {
  query: string;
  category: string | null;
}

/** One content block of a generated SEO blog post. */
export interface BlogSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  /** When true the page renders an affiliate CTA box after this section. */
  cta?: boolean;
}

export interface BlogFaq {
  question: string;
  answer: string;
}

/**
 * Auto-generated, SEO-packed article created for every deal. Generated from
 * the deal's own fields at publish/save time (see src/lib/blog-generator.ts),
 * so every affiliate link inside the content points at the deal's real
 * affiliate URL.
 */
export interface BlogPost {
  id: string;
  deal_id: string | null;
  /** Route slug under /blog. Derived from the deal title. */
  slug: string;
  title: string;
  /** Meta description (150–160 chars). */
  excerpt: string;
  cover_image: string | null;
  category: string | null;
  keywords: string[];
  reading_time_minutes: number;
  published: boolean;
  created_at: string;
  updated_at: string;
  sections: BlogSection[];
  faq: BlogFaq[];
}
