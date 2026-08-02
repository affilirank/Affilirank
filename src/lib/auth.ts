import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, ADMIN_SESSION_DAYS } from "@/lib/constants";

/**
 * Lightweight password auth for the admin portal.
 *
 * The admin password lives in `ADMIN_PASSWORD`. On successful login a
 * cryptographically signed, HttpOnly cookie is issued. Every protected route
 * verifies the signature via HMAC with `ADMIN_SECRET`.
 *
 * Swap for Supabase Auth / NextAuth anytime — the protected layout at
 * `src/app/admin/(protected)/layout.tsx` is the only guard to change.
 */

const secret = () =>
  process.env.ADMIN_SECRET || "affilirank-insecure-secret-change-me";

const expectedPassword = () => process.env.ADMIN_PASSWORD || "admin";

export function verifyPassword(input: string): boolean {
  const expected = expectedPassword();
  const a = Buffer.from(String(input));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function signSession(): string {
  const payload = `${Date.now().toString(36)}.ltd-admin`;
  const sig = createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [ts, id, sig] = parts;
  if (id !== "ltd-admin") return false;
  const expected = createHmac("sha256", secret())
    .update(`${ts}.${id}`)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!timingSafeEqual(a, b)) return false;
  const issuedAt = parseInt(ts, 36);
  const maxAge = ADMIN_SESSION_DAYS * 86_400_000;
  return Date.now() - issuedAt < maxAge;
}

export async function setAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, signSession(), {
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
  return verifySession(cookieStore.get(ADMIN_COOKIE)?.value);
}
