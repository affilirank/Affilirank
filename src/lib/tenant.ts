import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * Multi-tenant resolution.
 *
 * One platform deployment serves every customer domain. The current tenant is
 * resolved from the request `Host` header and its rows are scoped everywhere
 * via `tenant_id`. Domain lookups are cached briefly to avoid a DB hit on
 * every request.
 */

export interface Tenant {
  id: string;
  domain: string;
  name: string;
  tagline: string;
  logo_url: string;
  brand_tag: string;
  affiliate_id: string;
  plan: string;
  status: string;
  show_product_page: boolean;
  admin_password_hash: string;
}

/** Flagship tenant (affilirank.com) — used as the safe fallback. */
export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { tenant: Tenant | null; at: number }>();

export function normalizeDomain(host: string): string {
  let h = (host || "").toLowerCase().trim();
  h = h.replace(/:\d+$/, "");
  if (h.startsWith("www.")) h = h.slice(4);
  return h;
}

export function getDefaultTenant(): Tenant {
  return {
    id: DEFAULT_TENANT_ID,
    domain: "affilirank.com",
    name: "AffiliRank",
    tagline: "Rank first. Earn on autopilot.",
    logo_url: "",
    brand_tag: "affiliate deal engine",
    affiliate_id: "3582897",
    plan: "unlimited",
    status: "active",
    show_product_page: true,
    admin_password_hash: "",
  };
}

async function queryTenantByDomain(domain: string): Promise<Tenant | null> {
  const sb = await createSupabaseServerClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("tenants")
    .select("*")
    .eq("domain", domain)
    .maybeSingle();
  if (error || !data) return null;
  return data as Tenant;
}

/** Resolve a tenant by domain (cached). Returns null when unknown. */
export async function getTenantByDomain(
  domain: string
): Promise<Tenant | null> {
  const key = normalizeDomain(domain);
  if (!key) return null;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.tenant;
  const tenant = await queryTenantByDomain(key);
  cache.set(key, { tenant, at: Date.now() });
  return tenant;
}

/** Drop the domain lookup cache (call after provisioning a tenant). */
export function invalidateTenantCache(domain?: string): void {
  if (domain) cache.delete(normalizeDomain(domain));
  else cache.clear();
}

/**
 * Server-side current tenant for route handlers, server components and
 * generateMetadata. Unknown hosts (local dev, preview deployments) fall back
 * to the flagship affilirank tenant so the platform never renders blank.
 */
export async function getCurrentTenant(): Promise<Tenant> {
  const headerStore = await headers();
  const host =
    headerStore.get("host") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "affilirank.com";
  const domain = normalizeDomain(host);
  const tenant = await getTenantByDomain(domain);
  return tenant ?? getDefaultTenant();
}
