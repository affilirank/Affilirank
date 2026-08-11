import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, ADMIN_SESSION_DAYS } from "@/lib/constants";
import type { Tenant } from "@/lib/tenant";

/**
 * Lightweight password auth for the admin portal — multi-tenant.
 *
 * Each tenant has its own `admin_password_hash` (HMAC-SHA256 of the password,
 * keyed with ADMIN_SECRET) stored in the `tenants` table. On successful login
 * a cryptographically signed, HttpOnly cookie is issued. Every protected route
 * verifies the signature via HMAC with `ADMIN_SECRET`. The session payload
 * carries the tenant id so a cookie minted on one domain can't be replayed on
 * another tenant's domain.
 *
 * Tenants without a password hash set fall back to the global `ADMIN_PASSWORD`
 * env var (or "admin"), so a fresh tenant is usable before its owner sets a
 * password.
 */

const secret = () =>
  process.env.ADMIN_SECRET || "affilirank-insecure-secret-change-me";

const fallbackPassword = () => process.env.ADMIN_PASSWORD || "admin";

/** Deterministic HMAC-SHA256 hash used to store tenant admin passwords. */
export function hashAdminPassword(password: string): string {
  return createHmac("sha256", secret()).update(password).digest("hex");
}

export function verifyTenantPassword(
  input: string,
  tenant: Tenant
): boolean {
  const hash = tenant.admin_password_hash?.trim();
  if (hash) {
    const a = Buffer.from(hash);
    const b = Buffer.from(hashAdminPassword(input));
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
  const expected = fallbackPassword();
  const a = Buffer.from(String(input));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function signSession(tenantId: string): string {
  const payload = `${Date.now().toString(36)}.${tenantId}`;
  const sig = createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

/** Verify a session token; returns the tenant id it was minted for, or null. */
export function verifySession(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [ts, tenantId, sig] = parts;
  if (!tenantId) return null;
  const expected = createHmac("sha256", secret())
    .update(`${ts}.${tenantId}`)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  const issuedAt = parseInt(ts, 36);
  const maxAge = ADMIN_SESSION_DAYS * 86_400_000;
  if (Date.now() - issuedAt >= maxAge) return null;
  return tenantId;
}

export async function setAdminSessionCookie(tenantId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, signSession(tenantId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_DAYS * 86_400,
  });
}

export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function isAdminAuthed(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(ADMIN_COOKIE)?.value) !== null;
}

/** Tenant id bound to the current admin session, if any. */
export async function getAdminSessionTenantId(): Promise<string | null> {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(ADMIN_COOKIE)?.value);
}
