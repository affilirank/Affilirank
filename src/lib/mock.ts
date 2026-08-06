import fs from "node:fs";
import path from "node:path";
import type { BlogPost, Deal, DealDraft } from "@/lib/types";
import { slugify, uid } from "@/lib/utils";
import { generateBlogPost } from "@/lib/blog-generator";

/**
 * Local JSON-file data store used as a zero-config fallback when Supabase is
 * NOT configured (no NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).
 *
 * It is intentionally trivial: data persists to `.data/store.json` during
 * local development. On Vercel serverless (read-only filesystem) this store is
 * ephemeral — that is exactly why production should use Supabase. See README.
 */

const STORE_PATH = path.join(process.cwd(), ".data", "store.json");

interface Store {
  deals: Deal[];
  blog_posts: BlogPost[];
  settings: { license_keys: string[] };
}

function seedDeals(): Deal[] {
  const now = Date.now();
  const daysFromNow = (d: number) => new Date(now + d * 86_400_000).toISOString();
  const base = {
    currency: "USD",
    countdown_enabled: true,
    featured: false,
    sort_order: 0,
    published: true,
  };

  const deals: Deal[] = [
    {
      id: uid("deal"),
      slug: "neuralpulse-ai-lifetime-license",
      title: "NeuralPulse AI",
      subtitle: "Full AI writing suite — lifetime license",
      description:
        "NeuralPulse AI writes blog posts, ad copy, emails and product descriptions at scale. One payment, lifetime access, unlimited generations. Includes a 40+ template library, brand voice cloning and a built-in plagiarism checker.",
      highlights: [
        "Lifetime access with unlimited generations",
        "40+ high-converting copywriting templates",
        "Brand voice cloning for consistent tone",
        "Free updates & priority support forever",
      ],
      category: "ai-tools",
      hero_image: "/demo/neuralpulse-ai-lifetime-license.jpg",
      video_url: "/demo/neuralpulse-ai-lifetime-license.gif",
      video_type: "gif",
      deal_tag: "70% OFF",
      tag_style: "hot",
      coupon_code: "LTDBUNDLE",
      price: 49,
      original_price: 297,
      affiliate_url: "https://jvz7.com/c/3582897/416134/",
      source_url: "https://jvz7.com/c/3582897/416134/",
      expiration_date: daysFromNow(3),
      created_at: daysFromNow(-2),
      updated_at: daysFromNow(-1),
      ...base,
      sort_order: 10,
      featured: true,
    },
    {
      id: uid("deal"),
      slug: "rankforge-pro-unlimited-seo",
      title: "RankForge Pro",
      subtitle: "Unlimited keyword & rank tracking",
      description:
        "RankForge Pro tracks thousands of keywords across Google, tracks your competitors, and fires automated daily ranking reports straight to your inbox. Lifetime subscription, no recurring fees.",
      highlights: [
        "Track unlimited keywords & 50+ competitors",
        "Automated daily rank reports to email",
        "AI content briefs built for SEO teams",
        "Lifetime access, no monthly fees",
      ],
      category: "seo",
      hero_image: "/demo/rankforge-pro-unlimited-seo.jpg",
      video_url: "/demo/rankforge-pro-unlimited-seo.gif",
      video_type: "gif",
      deal_tag: "Lifetime Deal",
      tag_style: "lifetime",
      coupon_code: "RANKFOREVER",
      price: 79,
      original_price: 199,
      affiliate_url: "https://jvz7.com/c/3582897/416134/",
      source_url: "https://jvz7.com/c/3582897/416134/",
      expiration_date: daysFromNow(7),
      created_at: daysFromNow(-3),
      updated_at: daysFromNow(-1),
      ...base,
      sort_order: 20,
    },
    {
      id: uid("deal"),
      slug: "motionforge-studio",
      title: "MotionForge Studio",
      subtitle: "AI video editor + motion templates",
      description:
        "Turn scripts into polished marketing videos in minutes. MotionForge includes 200+ motion templates, auto-captions, background remover and direct publishing to YouTube and TikTok.",
      highlights: [
        "200+ drag-and-drop motion templates",
        "Auto-captions in 30+ languages",
        "AI background removal & scene generation",
        "One-click publish to TikTok & YouTube",
      ],
      category: "video",
      hero_image: "/demo/motionforge-studio.jpg",
      video_url: "/demo/motionforge-studio.gif",
      video_type: "gif",
      deal_tag: "Popular",
      tag_style: "popular",
      coupon_code: null,
      price: 59,
      original_price: 349,
      affiliate_url: "https://jvz7.com/c/3582897/416134/",
      source_url: "https://jvz7.com/c/3582897/416134/",
      expiration_date: daysFromNow(5),
      created_at: daysFromNow(-4),
      updated_at: daysFromNow(-1),
      ...base,
      sort_order: 30,
    },
    {
      id: uid("deal"),
      slug: "leadmachine-ai",
      title: "LeadMachine AI",
      subtitle: "Done-for-you lead generation engine",
      description:
        "LeadMachine finds verified buyer emails, enriches leads with firmographic data, and runs warm outreach sequences on autopilot. Lifetime deal includes all future agency plans.",
      highlights: [
        "Verified B2B lead finder with 450M+ records",
        "AI warm outreach sequences on autopilot",
        "CRM sync with HubSpot, Pipedrive & more",
        "Agency license included in lifetime plan",
      ],
      category: "marketing",
      hero_image: "/demo/leadmachine-ai.jpg",
      video_url: "/demo/leadmachine-ai.gif",
      video_type: "gif",
      deal_tag: "50% OFF",
      tag_style: "hot",
      coupon_code: null,
      price: 99,
      original_price: 199,
      affiliate_url: "https://jvz7.com/c/3582897/416134/",
      source_url: "https://jvz7.com/c/3582897/416134/",
      expiration_date: daysFromNow(2),
      created_at: daysFromNow(-1),
      updated_at: daysFromNow(-1),
      ...base,
      sort_order: 40,
    },
    {
      id: uid("deal"),
      slug: "pixelcraft-suite",
      title: "PixelCraft Suite",
      subtitle: "Design system, mockups & brand kit",
      description:
        "A complete design asset library — 1,200+ UI components, device mockups, logo templates and a brand kit generator. Perfect for freelancers shipping client work fast.",
      highlights: [
        "1,200+ Figma & FigJam UI components",
        "Device mockups & 3D scene builder",
        "AI brand kit generator",
        "Commercial license included",
      ],
      category: "design",
      hero_image: "/demo/pixelcraft-suite.jpg",
      video_url: "/demo/pixelcraft-suite.gif",
      video_type: "gif",
      deal_tag: "New",
      tag_style: "new",
      coupon_code: null,
      price: 39,
      original_price: 149,
      affiliate_url: "https://jvz7.com/c/3582897/416134/",
      source_url: "https://jvz7.com/c/3582897/416134/",
      expiration_date: daysFromNow(10),
      created_at: daysFromNow(-2),
      updated_at: daysFromNow(-1),
      ...base,
      sort_order: 50,
    },
    {
      id: uid("deal"),
      slug: "focusflow-planner",
      title: "FocusFlow Planner",
      subtitle: "Deep-work OS for solo founders",
      description:
        "Plan sprints, block deep-work time and auto-build your week from priorities. FocusFlow replaces three subscription tools with one lifetime license across all your devices.",
      highlights: [
        "Sprint planning + deep-work scheduler",
        "Syncs across all devices, lifetime license",
        "AI weekly review & focus insights",
        "Replaces 3+ subscriptions",
      ],
      category: "productivity",
      hero_image: "/demo/focusflow-planner.jpg",
      video_url: "/demo/focusflow-planner.gif",
      video_type: "gif",
      deal_tag: "75% OFF",
      tag_style: "hot",
      coupon_code: null,
      price: 29,
      original_price: 119,
      affiliate_url: "https://jvz7.com/c/3582897/416134/",
      source_url: "https://jvz7.com/c/3582897/416134/",
      expiration_date: daysFromNow(4),
      created_at: daysFromNow(-5),
      updated_at: daysFromNow(-1),
      ...base,
      sort_order: 60,
    },
    {
      id: uid("deal"),
      slug: "launchmaster-suite",
      title: "LaunchMaster Suite",
      subtitle: "Complete product-launch video course",
      description:
        "The exact 7-step launch framework behind 8-figure product launches. Includes swipe files, VSL scripts, funnel templates and lifetime access to every future update.",
      highlights: [
        "7-step launch framework walkthrough",
        "VSL scripts & swipe files included",
        "Funnel templates in ClickFunnels & Builder",
        "Lifetime access to all updates",
      ],
      category: "courses",
      hero_image: "/demo/launchmaster-suite.jpg",
      video_url: "/demo/launchmaster-suite.gif",
      video_type: "gif",
      deal_tag: "Lifetime Deal",
      tag_style: "lifetime",
      coupon_code: null,
      price: 89,
      original_price: 499,
      affiliate_url: "https://jvz7.com/c/3582897/416134/",
      source_url: "https://jvz7.com/c/3582897/416134/",
      expiration_date: daysFromNow(14),
      created_at: daysFromNow(-6),
      updated_at: daysFromNow(-1),
      ...base,
      sort_order: 70,
    },
    {
      id: uid("deal"),
      slug: "datascraper-toolkit",
      title: "DataScraper Toolkit",
      subtitle: "No-code web scraping for marketers",
      description:
        "Pull competitor prices, reviews, social stats and SERP data without writing code. Export clean datasets to CSV, Sheets or your favorite tool with scheduled auto-runs.",
      highlights: [
        "No-code visual point-and-click builder",
        "Scheduled auto-runs & cloud exports",
        "Built-in anti-ban proxy rotation",
        "Lifetime license, unlimited projects",
      ],
      category: "tools",
      hero_image: "/demo/datascraper-toolkit.jpg",
      video_url: "/demo/datascraper-toolkit.gif",
      video_type: "gif",
      deal_tag: "Popular",
      tag_style: "popular",
      coupon_code: null,
      price: 45,
      original_price: 189,
      affiliate_url: "https://jvz7.com/c/3582897/416134/",
      source_url: "https://jvz7.com/c/3582897/416134/",
      expiration_date: daysFromNow(6),
      created_at: daysFromNow(-2),
      updated_at: daysFromNow(-1),
      ...base,
      sort_order: 80,
    },
  ];

  return deals;
}

function readStore(): Store {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf8");
      const store = JSON.parse(raw) as Store;
      memoryStore = store;
      if (Array.isArray(store.deals)) {
        // Backfill generated blogs for stores created before the blog feature.
        if (!Array.isArray(store.blog_posts)) {
          store.blog_posts = store.deals.map((d) => generateBlogPost(d));
          writeStore(store);
        }
        // Backfill settings for stores created before licensing.
        if (!store.settings || !Array.isArray(store.settings.license_keys)) {
          store.settings = { license_keys: [] };
          writeStore(store);
        }
        return store;
      }
    }
  } catch {
    // fall through and re-seed
  }
  if (memoryStore) return memoryStore;
  const store = seedStore();
  writeStore(store);
  return store;
}

function seedStore(): Store {
  const deals = seedDeals();
  return {
    deals,
    blog_posts: deals.map((d) => generateBlogPost(d)),
    settings: { license_keys: [] },
  };
}

let memoryStore: Store | null = null;

function writeStore(store: Store) {
  memoryStore = store;
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  } catch {
    // Read-only filesystem (e.g. Vercel serverless): keep in-memory only.
  }
}

export function isMockMode() {
  return (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function mockListDeals() {
  return readStore().deals;
}

export function mockGetDealBySlug(slug: string) {
  return readStore().deals.find((d) => d.slug === slug) ?? null;
}

export function mockGetDealById(id: string) {
  return readStore().deals.find((d) => d.id === id) ?? null;
}

export function mockGetPublishedDeals() {
  return readStore()
    .deals.filter((d) => d.published)
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.sort_order - b.sort_order;
    });
}

export function mockCreateDeal(draft: DealDraft, slug?: string): Deal {
  const store = readStore();
  const now = new Date().toISOString();
  const deal: Deal = {
    id: uid("deal"),
    slug: slug || slugify(draft.title) || uid("deal"),
    created_at: now,
    updated_at: now,
    ...draft,
  };
  store.deals.unshift(deal);
  writeStore(store);
  return deal;
}

export function mockUpdateDeal(
  id: string,
  patch: Partial<DealDraft>,
  slug?: string
): Deal | null {
  const store = readStore();
  const idx = store.deals.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  const next: Deal = {
    ...store.deals[idx],
    ...patch,
    slug:
      slug ??
      (patch.title
        ? slugify(patch.title) || store.deals[idx].slug
        : store.deals[idx].slug),
    updated_at: new Date().toISOString(),
  };
  store.deals[idx] = next;
  writeStore(store);
  return next;
}

export function mockDeleteDeal(id: string): boolean {
  const store = readStore();
  const before = store.deals.length;
  store.deals = store.deals.filter((d) => d.id !== id);
  const deleted = store.deals.length < before;
  if (deleted) writeStore(store);
  return deleted;
}

export function mockResetToSeed() {
  const store = seedStore();
  writeStore(store);
  return store.deals.length;
}

/* ---------------------------------------------------------------------------
 * Blog posts
 * ------------------------------------------------------------------------- */

export function mockListBlogPosts(): BlogPost[] {
  return readStore().blog_posts;
}

export function mockGetPublishedBlogPosts(): BlogPost[] {
  return readStore()
    .blog_posts.filter((p) => p.published)
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
}

export function mockGetBlogPostBySlug(slug: string): BlogPost | null {
  return readStore().blog_posts.find((p) => p.slug === slug) ?? null;
}

export function mockGetBlogPostByDealId(dealId: string): BlogPost | null {
  return readStore().blog_posts.find((p) => p.deal_id === dealId) ?? null;
}

/** Create or replace the blog post for a deal (keyed on deal_id). */
export function mockUpsertBlogPost(post: BlogPost): BlogPost {
  const store = readStore();
  const idx = store.blog_posts.findIndex(
    (p) => p.deal_id === post.deal_id || p.slug === post.slug
  );
  if (idx === -1) store.blog_posts.unshift(post);
  else store.blog_posts[idx] = post;
  writeStore(store);
  return post;
}

export function mockDeleteBlogPostsByDeal(dealId: string): boolean {
  const store = readStore();
  const before = store.blog_posts.length;
  store.blog_posts = store.blog_posts.filter((p) => p.deal_id !== dealId);
  const deleted = store.blog_posts.length < before;
  if (deleted) writeStore(store);
  return deleted;
}

export function mockGetLicenseKeys(): string[] {
  return readStore().settings.license_keys;
}

export function mockSetLicenseKeys(keys: string[]): string[] {
  const store = readStore();
  store.settings.license_keys = keys;
  writeStore(store);
  return keys;
}
