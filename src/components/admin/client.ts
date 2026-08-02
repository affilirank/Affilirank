"use client";

import type { BlogPost, Deal, DealDraft, ScrapeResult } from "@/lib/types";
import { uid } from "@/lib/utils";

/**
 * Thin client API layer for the admin dashboard. All mutating routes are
 * admin-cookie protected server-side; a 401 bounces back to login.
 */

async function api<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const adminApi = {
  listDeals: () => api<Deal[]>("/api/admin/products"),
  scrape: (url: string) =>
    api<ScrapeResult>("/api/scrape", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),
  createDeal: (draft: DealDraft) =>
    api<Deal>("/api/products", { method: "POST", body: JSON.stringify(draft) }),
  updateDeal: (id: string, patch: Partial<DealDraft>) =>
    api<Deal>(`/api/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteDeal: (id: string) =>
    api<{ ok: boolean }>(`/api/products/${id}`, { method: "DELETE" }),
  listBlogs: () => api<BlogPost[]>("/api/blogs"),
  regenerateBlog: (dealId: string) =>
    api<BlogPost>("/api/blogs", {
      method: "POST",
      body: JSON.stringify({ dealId }),
    }),
  resetAll: () =>
    api<{ ok: boolean }>("/api/products", { method: "DELETE" }),
  logout: () => api<{ ok: boolean }>("/api/admin/logout", { method: "POST" }),
};

/** Build a deal draft from a scraped result (fills manual-override fields). */
export function draftFromScrape(r: ScrapeResult): DealDraft {
  return {
    title: r.title ?? "Untitled Deal",
    subtitle: null,
    description: r.description,
    highlights: r.detected_highlights.length ? r.detected_highlights : null,
    category: null,
    hero_image: r.hero_image,
    video_url: r.video_url,
    video_type: r.video_type,
    deal_tag: r.original_price ? `${Math.round((1 - (r.price ?? 0) / r.original_price) * 100)}% OFF` : null,
    tag_style: "hot",
    coupon_code: null,
    price: r.price,
    original_price: r.original_price,
    currency: r.currency || "USD",
    affiliate_url: r.affiliate_url,
    source_url: r.url,
    expiration_date: null,
    countdown_enabled: true,
    featured: false,
    sort_order: 0,
    published: false,
  };
}

export function emptyDraft(): DealDraft {
  return {
    title: "",
    subtitle: null,
    description: null,
    highlights: null,
    category: null,
    hero_image: null,
    video_url: null,
    video_type: null,
    deal_tag: null,
    tag_style: "hot",
    coupon_code: null,
    price: null,
    original_price: null,
    currency: "USD",
    affiliate_url: "",
    source_url: null,
    expiration_date: null,
    countdown_enabled: true,
    featured: false,
    sort_order: 0,
    published: false,
  };
}

export function tempDealId() {
  return uid("new");
}
