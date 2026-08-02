import { CATEGORIES } from "@/lib/constants";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

export function formatPrice(value: number | null | undefined, currency = "USD") {
  if (value == null || Number.isNaN(value)) return null;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `$${value}`;
  }
}

export function discountPercent(original: number | null, price: number | null) {
  if (!original || !price || price >= original) return null;
  return Math.round((1 - price / original) * 100);
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function isExpired(expirationDate: string | null) {
  if (!expirationDate) return false;
  return new Date(expirationDate).getTime() <= Date.now();
}

export function categoryLabel(slug: string | null) {
  if (!slug) return "Deal";
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

/** Tolerant URL parser — returns null instead of throwing. */
export function parseUrl(input: string): URL | null {
  try {
    const url = new URL(input.trim());
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}

export function truncate(text: string, max = 160) {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

export function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function splitHighlights(text: string | null, max = 4): string[] {
  if (!text) return [];
  const sentences = text
    .split(/[.\n·;•]/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 18)
    .slice(0, max);
  return sentences;
}
