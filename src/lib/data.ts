import type { BlogPost, Deal, DealDraft } from "@/lib/types";
import {
  isMockMode,
  mockCreateDeal,
  mockDeleteBlogPostsByDeal,
  mockDeleteDeal,
  mockGetBlogPostBySlug,
  mockGetDealById,
  mockGetDealBySlug,
  mockGetLicenseKeys,
  mockGetPublishedBlogPosts,
  mockGetPublishedDeals,
  mockListBlogPosts,
  mockListDeals,
  mockResetToSeed,
  mockSetLicenseKeys,
  mockUpdateDeal,
  mockUpsertBlogPost,
} from "@/lib/mock";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { sanitizeVideoForDeal } from "@/lib/scraper";
import { generateBlogPost } from "@/lib/blog-generator";
import { slugify } from "@/lib/utils";
import {
  BASE_VIDEO_TYPES,
  type LicenseFeatureKey,
  LicenseGateError,
  type LicenseState,
  resolveLicense,
} from "@/lib/licensing";

/**
 * Unified server data layer — multi-tenant.
 *
 * Every query is scoped by `tenantId` so one shared Supabase project can host
 * hundreds of white-label brands without cross-tenant leakage. When Supabase
 * env vars are present, reads/writes go through the real database; otherwise
 * the local JSON store is used so `npm run dev` works out of the box.
 */

export async function getPublishedDeals(tenantId: string): Promise<Deal[]> {
  if (isMockMode()) return mockGetPublishedDeals();

  const sb = await createSupabaseServerClient();
  if (!sb) return mockGetPublishedDeals();

  const { data, error } = await sb
    .from("products")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("published", true)
    .order("featured", { ascending: false })
    .order("sort_order", { ascending: true });

  if (error || !data) return mockGetPublishedDeals();
  return data as Deal[];
}

export async function getDealBySlug(
  tenantId: string,
  slug: string
): Promise<Deal | null> {
  if (isMockMode()) return mockGetDealBySlug(slug);

  const sb = await createSupabaseServerClient();
  if (!sb) return mockGetDealBySlug(slug);

  const { data, error } = await sb
    .from("products")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return mockGetDealBySlug(slug);
  return data as Deal;
}

export async function getDealById(
  tenantId: string,
  id: string
): Promise<Deal | null> {
  if (isMockMode()) return mockGetDealById(id);

  const sb = await createSupabaseServerClient();
  if (!sb) return mockGetDealById(id);

  const { data, error } = await sb
    .from("products")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return mockGetDealById(id);
  return data as Deal;
}

export async function getAllDeals(tenantId: string): Promise<Deal[]> {
  if (isMockMode()) return mockListDeals();

  const sb = await createSupabaseServerClient();
  if (!sb) return mockListDeals();

  const { data, error } = await sb
    .from("products")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error || !data) return mockListDeals();
  return data as Deal[];
}

function uniqueSlug(title: string, existingSlugs: string[]): string {
  const base = slugify(title) || "deal";
  const set = new Set(existingSlugs);
  if (!set.has(base)) return base;
  let n = 2;
  while (set.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export async function createDeal(
  tenantId: string,
  draft: DealDraft
): Promise<Deal> {
  const cleaned = { ...draft, ...sanitizeVideoForDeal(draft) };
  const existing = await getAllDeals(tenantId);
  await assertCanCreateDeal(tenantId, existing.length);
  if (cleaned.video_type) await assertProVideoAllowed(tenantId, cleaned.video_type);
  const slug = uniqueSlug(cleaned.title, existing.map((d) => d.slug));
  let deal: Deal;
  if (isMockMode()) {
    deal = mockCreateDeal(cleaned, slug);
  } else {
    const sb = await createSupabaseServerClient();
    if (!sb) {
      deal = mockCreateDeal(cleaned, slug);
    } else {
      const { data, error } = await sb
        .from("products")
        .insert({ ...cleaned, slug, tenant_id: tenantId })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      deal = data as Deal;
    }
  }

  await syncBlogForDeal(tenantId, deal);
  return deal;
}

export async function updateDeal(
  tenantId: string,
  id: string,
  patch: Partial<DealDraft>
): Promise<Deal> {
  const cleaned = { ...patch, ...sanitizeVideoForDeal(patch) };
  if (cleaned.video_type) await assertProVideoAllowed(tenantId, cleaned.video_type);
  let updated: Deal;
  let slug: string | undefined;
  if (cleaned.title) {
    const all = await getAllDeals(tenantId);
    const otherSlugs = all.filter((d) => d.id !== id).map((d) => d.slug);
    slug = uniqueSlug(cleaned.title, otherSlugs);
  }
  if (isMockMode()) {
    const result = mockUpdateDeal(id, cleaned, slug);
    if (!result) throw new Error("Deal not found");
    updated = result;
  } else {
    const sb = await createSupabaseServerClient();
    if (!sb) {
      const result = mockUpdateDeal(id, cleaned, slug);
      if (!result) throw new Error("Deal not found");
      updated = result;
    } else {
      const patchRow: Record<string, unknown> = { ...cleaned };
      if (slug) patchRow.slug = slug;
      const { data, error } = await sb
        .from("products")
        .update(patchRow)
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      updated = data as Deal;
    }
  }

  await syncBlogForDeal(tenantId, updated);
  return updated;
}

export async function deleteDeal(
  tenantId: string,
  id: string
): Promise<boolean> {
  if (isMockMode()) {
    mockDeleteBlogPostsByDeal(id);
    return mockDeleteDeal(id);
  }

  const sb = await createSupabaseServerClient();
  if (!sb) {
    mockDeleteBlogPostsByDeal(id);
    return mockDeleteDeal(id);
  }

  const { error } = await sb
    .from("products")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw new Error(error.message);
  return true;
}

export async function resetToSeed(tenantId: string): Promise<number> {
  if (isMockMode()) return mockResetToSeed();

  const sb = await createSupabaseServerClient();
  if (!sb) return mockResetToSeed();

  const { error } = await sb
    .from("products")
    .delete()
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
  return 0;
}

/* ---------------------------------------------------------------------------
 * Blog posts
 * ------------------------------------------------------------------------- */

export async function getPublishedBlogPosts(
  tenantId: string
): Promise<BlogPost[]> {
  if (isMockMode()) return mockGetPublishedBlogPosts();

  const sb = await createSupabaseServerClient();
  if (!sb) return mockGetPublishedBlogPosts();

  const { data, error } = await sb
    .from("blog_posts")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("published", true)
    .order("updated_at", { ascending: false });

  if (error || !data) return mockGetPublishedBlogPosts();
  return data as BlogPost[];
}

export async function getAllBlogPosts(tenantId: string): Promise<BlogPost[]> {
  if (isMockMode()) return mockListBlogPosts();

  const sb = await createSupabaseServerClient();
  if (!sb) return mockListBlogPosts();

  const { data, error } = await sb
    .from("blog_posts")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });

  if (error || !data) return mockListBlogPosts();
  return data as BlogPost[];
}

export async function getBlogPostBySlug(
  tenantId: string,
  slug: string
): Promise<BlogPost | null> {
  if (isMockMode()) return mockGetBlogPostBySlug(slug);

  const sb = await createSupabaseServerClient();
  if (!sb) return mockGetBlogPostBySlug(slug);

  const { data, error } = await sb
    .from("blog_posts")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return mockGetBlogPostBySlug(slug);
  return data as BlogPost;
}

/**
 * Generate (or regenerate) the SEO blog post for a deal and persist it.
 * Called automatically whenever a deal is created or updated, so publishing
 * a deal from the admin portal instantly creates its article.
 */
export async function syncBlogForDeal(
  tenantId: string,
  deal: Deal
): Promise<BlogPost | null> {
  const post = generateBlogPost(deal);

  if (isMockMode()) return mockUpsertBlogPost(post);

  const sb = await createSupabaseServerClient();
  if (!sb) return mockUpsertBlogPost(post);

  // Let Postgres own the id — the upsert is keyed on the unique deal_id.
  const row = {
    deal_id: post.deal_id,
    tenant_id: tenantId,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    cover_image: post.cover_image,
    category: post.category,
    keywords: post.keywords,
    reading_time_minutes: post.reading_time_minutes,
    published: post.published,
    created_at: post.created_at,
    updated_at: post.updated_at,
    sections: post.sections,
    faq: post.faq,
  };
  const { data, error } = await sb
    .from("blog_posts")
    .upsert(row, { onConflict: "deal_id" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as BlogPost;
}

/* ---------------------------------------------------------------------------
 * Licensing
 * ------------------------------------------------------------------------- */

export async function getLicenseKeys(tenantId: string): Promise<string[]> {
  if (isMockMode()) return mockGetLicenseKeys();

  const sb = await createSupabaseServerClient();
  if (!sb) return mockGetLicenseKeys();

  const { data, error } = await sb
    .from("settings")
    .select("license_keys")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error || !data) return [];
  return (data as { license_keys: string[] }).license_keys ?? [];
}

export async function setLicenseKeys(
  tenantId: string,
  keys: string[]
): Promise<string[]> {
  if (isMockMode()) return mockSetLicenseKeys(keys);

  const sb = await createSupabaseServerClient();
  if (!sb) return mockSetLicenseKeys(keys);

  const { error } = await sb
    .from("settings")
    .upsert({ tenant_id: tenantId, license_keys: keys }, { onConflict: "tenant_id" });
  if (error) throw new Error(error.message);
  return keys;
}

export async function getLicenseState(tenantId: string): Promise<LicenseState> {
  const keys = await getLicenseKeys(tenantId);
  return resolveLicense(keys);
}

export function hasLicenseFeature(
  state: LicenseState,
  feature: LicenseFeatureKey
): boolean {
  return state.features.has(feature);
}

export async function assertCanCreateDeal(
  tenantId: string,
  dealCount: number
): Promise<void> {
  const state = await getLicenseState(tenantId);
  if (state.features.has("unlimited-deals")) return;
  if (dealCount >= state.maxDeals) {
    throw new LicenseGateError(
      `Deal limit reached (${state.maxDeals}). Unlock the "Unlimited deals" upgrade to add more.`
    );
  }
}

export function assertVideoTypeAllowed(type: string): void {
  if ((BASE_VIDEO_TYPES as readonly string[]).includes(type)) return;
  // Pro-only video types are enforced at the API level with the license state;
  // this guard covers direct calls that cannot know the license.
  throw new LicenseGateError(
    `Video type "${type}" requires the "Pro video mode" upgrade.`
  );
}

export async function assertProVideoAllowed(
  tenantId: string,
  videoType: string
): Promise<void> {
  if ((BASE_VIDEO_TYPES as readonly string[]).includes(videoType)) return;
  const state = await getLicenseState(tenantId);
  if (!state.features.has("pro-video")) {
    throw new LicenseGateError(
      `Video type "${videoType}" requires the "Pro video mode" upgrade.`
    );
  }
}
