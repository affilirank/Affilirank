#!/usr/bin/env node
// AffiliRank license key minter (seller-only).
//
// Uses the RSA private key at <repo>/license-private.pem. If it's missing you
// can generate a fresh keypair with --gen-keypair. Keys minted here verify
// against the public key embedded in src/lib/licensing.ts.
//
// Usage:
//   node scripts/license-keys.mjs --gen-keypair
//   node scripts/license-keys.mjs --tier bundle --buyer "john@acme.com"
//   node scripts/license-keys.mjs --tier upsell --features blog,analytics --buyer "jane@x.com"
//   node scripts/license-keys.mjs --verify "payload.signature"
//   node scripts/license-keys.mjs --help

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRIVATE_KEY_PATH = path.join(ROOT, "license-private.pem");

const BASE_MAX_DEALS = 10;
const ALL_FEATURES = [
  "blog",
  "unlimited-deals",
  "exit-intent",
  "analytics",
  "deal-pages",
  "pro-video",
];

function b64u(input) {
  return Buffer.from(input).toString("base64url");
}
function unb64u(input) {
  return Buffer.from(input, "base64url");
}

function parseArgs(argv) {
  const out = {
    genKeypair: false,
    verify: null,
    tier: null,
    features: [],
    maxDeals: null,
    buyer: null,
    exp: 0,
    count: 1,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--gen-keypair") out.genKeypair = true;
    else if (a === "--verify") out.verify = next();
    else if (a === "--tier") out.tier = next();
    else if (a === "--features") out.features = next().split(",").map((s) => s.trim());
    else if (a === "--max-deals") out.maxDeals = Number(next());
    else if (a === "--buyer") out.buyer = next();
    else if (a === "--exp") out.exp = Number(next());
    else if (a === "--count") out.count = Number(next());
    else if (a === "--help" || a === "-h") {
      console.log(usage());
      process.exit(0);
    }
  }
  return out;
}

function usage() {
  return `AffiliRank license key minter

  --gen-keypair            Generate a fresh RSA keypair and write
                           license-private.pem (overwrites if present).
  --tier <base|upsell|bundle>
                           Key tier. bundle => "*" (all features).
  --features <f1,f2,...>   Upsell features to grant (see list below).
  --max-deals <n>          Deal cap contributed by this key (default 10).
  --buyer <name>           Optional buyer identifier baked into the key.
  --exp <ms>               Expiry as unix ms (0 = never, default).
  --count <n>              Number of keys to mint (default 1).
  --verify <key>           Verify a key against the embedded public key.

Features: ${ALL_FEATURES.join(", ")}`;
}

function loadPrivateKey() {
  if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    console.error(
      `license-private.pem not found at ${PRIVATE_KEY_PATH}.\nRun: node scripts/license-keys.mjs --gen-keypair`
    );
    process.exit(1);
  }
  return fs.readFileSync(PRIVATE_KEY_PATH, "utf8");
}

function mint(privateKey, opts) {
  const tier = opts.tier ?? "upsell";
  const features =
    tier === "bundle" ? "*" : opts.features.length ? opts.features : [];
  const payload = {
    v: 1,
    id: `AR-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    tier,
    features,
    maxDeals:
      tier === "bundle"
        ? Number.MAX_SAFE_INTEGER
        : opts.maxDeals ??
          (features === "*" || features.includes("unlimited-deals")
            ? Number.MAX_SAFE_INTEGER
            : BASE_MAX_DEALS),
    buyer: opts.buyer,
    exp: opts.exp ?? 0,
  };
  const payloadB64 = b64u(JSON.stringify(payload));
  const signer = crypto.createSign("sha256");
  signer.update(payloadB64);
  const sig = signer.sign(privateKey, "base64url");
  return `${payloadB64}.${sig}`;
}

function verify(key) {
  const clean = String(key).trim();
  const dot = clean.lastIndexOf(".");
  if (dot <= 0) return { ok: false, reason: "malformed (no .)" };
  const payloadB64 = clean.slice(0, dot);
  const sigB64 = clean.slice(dot + 1);
  const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnXUMzd6HzSYwqqdJ/zt6
GJT04lwUmNd4EiBLpKKy+HjLHJH5thDMtGBZrzzBdQf8NwNDnAl7F1mJQmpsaqV7
+ZBEe5JJhi7QVb5zJ55eVvz9S11aMQFg7+OgO0/lW5N23STqQD5olSoZVtEuWWkX
wwx723pMyGSpF5WiDmZ2+Ed6eDp+PQGc5OEmSNzJsJZzCbAqA1fhmcR7L+Wlf7KU
NfEH2Ce4WcflH0xB3DmFyxOUjG6S8E/bbIjzqByp0EwharoH48T5ERtNH8plo8wL
qgu4tavd6hZeG+xRN0HO8KNftmDSdYgio78YNoXz5JaaxOmLEoa7OK4PS7F0Bo3r
FwIDAQAB
-----END PUBLIC KEY-----
`;
  try {
    const payload = JSON.parse(unb64u(payloadB64).toString("utf8"));
    const verifier = crypto.createVerify("sha256");
    verifier.update(payloadB64);
    if (!verifier.verify(PUBLIC_KEY, unb64u(sigB64))) {
      return { ok: false, reason: "bad signature" };
    }
    if (payload.exp && payload.exp > 0 && Date.now() > payload.exp) {
      return { ok: false, reason: "expired" };
    }
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "malformed payload" };
  }
}

const opts = parseArgs(process.argv.slice(2));

if (opts.genKeypair) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const pub = publicKey.export({ type: "spki", format: "pem" }).toString();
  const priv = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  fs.writeFileSync(PRIVATE_KEY_PATH, priv);
  console.log(`Wrote private key → ${PRIVATE_KEY_PATH}`);
  console.log(`\nPublic key (already embedded in src/lib/licensing.ts):\n${pub}`);
  process.exit(0);
}

if (opts.verify) {
  const result = verify(opts.verify);
  if (result.ok) {
    console.log("VALID");
    console.log(JSON.stringify(result.payload, null, 2));
  } else {
    console.log(`INVALID — ${result.reason}`);
    process.exit(1);
  }
  process.exit(0);
}

const privateKey = loadPrivateKey();
for (let i = 0; i < opts.count; i++) {
  console.log(mint(privateKey, opts));
}
