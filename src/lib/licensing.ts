import "server-only";

import {
  createPublicKey,
  createVerify,
  generateKeyPairSync,
  createSign,
  randomBytes,
} from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  BASE_VIDEO_TYPES,
  PRO_VIDEO_TYPES,
  LICENSE_FEATURES,
  ALL_FEATURES,
  BUNDLE_ENV,
} from "@/lib/license-format";

/**
 * AffiliRank licensing.
 *
 * License keys are RSA-signed payloads. The seller holds the private key
 * (`license-private.pem`) and mints keys for base / upsell / bundle purchases.
 * The public key below is embedded so a buyer cannot forge keys even with the
 * full source code — only the seller can sign new unlocks.
 *
 * Key format:  base64url(JSON payload) . base64url(RSA-SHA256 signature)
 *
 * Payload:
 *   {
 *     v: 1,
 *     id: "AR-xxxxxxxx",          // human-readable key id
 *     tier: "base" | "upsell" | "bundle",
 *     features: ["blog"],         // granted features (bundle => "*")
 *     maxDeals: 10,               // deal cap contribution
 *     buyer: "name / email",
 *     exp: 0                      // unix ms, 0 = never expires
 *   }
 */

export type LicenseFeatureKey =
  | "blog"
  | "unlimited-deals"
  | "exit-intent"
  | "analytics"
  | "deal-pages"
  | "pro-video";

export type LicenseTier = "base" | "upsell" | "bundle";

export { LICENSE_FEATURES, ALL_FEATURES, BUNDLE_ENV, BASE_VIDEO_TYPES, PRO_VIDEO_TYPES }; 
export type { LicenseFeatureDef } from "@/lib/license-format";

export interface LicensePayload {
  v: number;
  id: string;
  tier: LicenseTier;
  features: LicenseFeatureKey[] | "*";
  maxDeals: number;
  buyer?: string;
  exp: number;
}

/** Deal cap when unlimited-deals is not granted. */
export const BASE_MAX_DEALS = 10;

export const LICENSE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnXUMzd6HzSYwqqdJ/zt6
GJT04lwUmNd4EiBLpKKy+HjLHJH5thDMtGBZrzzBdQf8NwNDnAl7F1mJQmpsaqV7
+ZBEe5JJhi7QVb5zJ55eVvz9S11aMQFg7+OgO0/lW5N23STqQD5olSoZVtEuWWkX
wwx723pMyGSpF5WiDmZ2+Ed6eDp+PQGc5OEmSNzJsJZzCbAqA1fhmcR7L+Wlf7KU
NfEH2Ce4WcflH0xB3DmFyxOUjG6S8E/bbIjzqByp0EwharoH48T5ERtNH8plo8wL
qgu4tavd6hZeG+xRN0HO8KNftmDSdYgio78YNoXz5JaaxOmLEoa7OK4PS7F0Bo3r
FwIDAQAB
-----END PUBLIC KEY-----
`;

export interface LicenseState {
  /** Resolved tier label for display. */
  tier: "base" | "upsell" | "bundle";
  /** Granted feature keys (bundle => all six). */
  features: Set<LicenseFeatureKey>;
  /** Max deals allowed (unlimited-deals => Infinity). */
  maxDeals: number;
  /** Active keys that verified successfully. */
  activeKeys: string[];
  /** Keys present in the store that failed validation (for the admin UI). */
  invalidKeys: string[];
}

export const EMPTY_LICENSE: LicenseState = {
  tier: "base",
  features: new Set(),
  maxDeals: BASE_MAX_DEALS,
  activeKeys: [],
  invalidKeys: [],
};

function b64u(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function unb64u(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

/** Verify a license key string and return its payload, or null if invalid. */
export function verifyLicenseKey(key: string): LicensePayload | null {
  const clean = key.trim();
  if (!clean) return null;
  const dot = clean.lastIndexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = clean.slice(0, dot);
  const sigB64 = clean.slice(dot + 1);

  let payload: LicensePayload;
  try {
    payload = JSON.parse(unb64u(payloadB64).toString("utf8")) as LicensePayload;
  } catch {
    return null;
  }
  if (!payload || payload.v !== 1) {
    return null;
  }

  try {
    const keyObj = createPublicKey(LICENSE_PUBLIC_KEY);
    const verifier = createVerify("sha256");
    verifier.update(payloadB64);
    if (!verifier.verify(keyObj, unb64u(sigB64))) return null;
  } catch {
    return null;
  }

  if (payload.exp && payload.exp > 0 && Date.now() > payload.exp) return null;

  return payload;
}

/** Resolve the combined license state from a list of raw keys. */
export function resolveLicense(rawKeys: string[]): LicenseState {
  const state: LicenseState = {
    tier: "base",
    features: new Set(),
    maxDeals: BASE_MAX_DEALS,
    activeKeys: [],
    invalidKeys: [],
  };

  for (const raw of rawKeys) {
    const payload = verifyLicenseKey(raw);
    if (!payload) {
      state.invalidKeys.push(raw);
      continue;
    }
    state.activeKeys.push(raw);
    if (payload.tier === "bundle" || payload.features === "*") {
      state.tier = "bundle";
      state.features = new Set(ALL_FEATURES);
      state.maxDeals = Infinity;
      return state;
    }
    for (const f of payload.features) state.features.add(f);
    state.maxDeals = Math.max(state.maxDeals, payload.maxDeals || 0);
  }

  if (state.features.has("unlimited-deals")) {
    state.maxDeals = Infinity;
  }
  if (state.activeKeys.length > 0 && state.tier === "base") {
    state.tier = "upsell";
  }
  return state;
}

export function hasFeature(state: LicenseState, feature: LicenseFeatureKey) {
  return state.features.has(feature);
}

/**
 * Thrown when an action is blocked because the active license doesn't grant
 * the required module. Mapped to a 400 response in API routes.
 */
export class LicenseGateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LicenseGateError";
  }
}

export interface LicenseKeyOptions {
  tier?: LicenseTier;
  features?: LicenseFeatureKey[];
  maxDeals?: number;
  buyer?: string;
  exp?: number;
}

let privateKeyPem: string | null = null;

function getPrivateKey(): string {
  if (privateKeyPem) return privateKeyPem;
  try {
    // Generated by `npm run license:keys` — never ships in a release build.
    privateKeyPem = readFileSync(
      resolve(process.cwd(), "license-private.pem"),
      "utf8"
    );
    return privateKeyPem;
  } catch {
    throw new Error(
      "license-private.pem not found. Run `npm run license:keys` to generate it."
    );
  }
}

/** Mint a new license key (seller-only, runs server-side or via CLI). */
export function generateLicenseKey(opts: LicenseKeyOptions = {}): string {
  const payload: LicensePayload = {
    v: 1,
    id: `AR-${randomBytes(4).toString("hex").toUpperCase()}`,
    tier: opts.tier ?? "upsell",
    features:
      opts.tier === "bundle"
        ? "*"
        : (opts.features ?? []).length
          ? opts.features!
          : [],
    maxDeals:
      opts.tier === "bundle"
        ? Number.MAX_SAFE_INTEGER
        : (opts.maxDeals ??
          (opts.features?.includes("unlimited-deals") ? Number.MAX_SAFE_INTEGER : BASE_MAX_DEALS)),
    buyer: opts.buyer,
    exp: opts.exp ?? 0,
  };

  const payloadB64 = b64u(JSON.stringify(payload));
  const signer = createSign("sha256");
  signer.update(payloadB64);
  const sig = signer.sign(getPrivateKey(), "base64url");
  return `${payloadB64}.${sig}`;
}

/** Generate a fresh RSA keypair; returns the public PEM (private is written to disk). */
export function generateKeypair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  return {
    publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  };
}

/** Upsell / bundle checkout URLs, read from env. */
export function upsellUrls(): Record<string, string> {
  const out: Record<string, string> = { bundle: process.env[BUNDLE_ENV] ?? "" };
  for (const f of LICENSE_FEATURES) {
    out[f.key] = process.env[f.env] ?? "";
  }
  return out;
}
