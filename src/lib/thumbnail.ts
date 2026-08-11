import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getYoutubeAuth } from "@/lib/youtube";
import type { Deal } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Gemini AI thumbnail generator — mirrors scripts/make-ai-thumbnails.py so the
 * admin dashboard and the Python worker produce the same style of thumbnail.
 *
 * Composites the deal's hero/product image + the connected channel's avatar
 * into a 16:9 high-CTR title card with the exact title / price / badge text,
 * uploads it to the public `previews` bucket and repoints the deal's
 * hero_image at it.
 */

const GEMINI_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image";
const FALLBACK_MODEL = "gemini-2.5-flash-image";
const API = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const DEFAULT_AVATAR_URL =
  "https://yt3.ggpht.com/ueD5KKXNK3ssj2ur5emr-Nait7q7uD7moGK3bHowvQ4ydmqx6qTTB8l-F0SY23EY6ajcwO8p5Pw=s800-c-k-c0x00ffffff-no-rj";

const GIG_EXPRESSIONS = [
  "excited, eyes wide open, big smile, mouth slightly open in surprise",
  "curious, one eyebrow raised, intrigued half-smile",
  "blown away, jaw slightly dropped, amazed expression",
  "smiling confidently, one eyebrow raised, nodding in approval",
];

interface InlineImage {
  inline_data: { mime_type: string; data: string };
}

async function getGeminiKey(): Promise<string> {
  const env = process.env.GEMINI_API_KEY?.trim();
  if (env) return env;
  const sb = await createSupabaseServerClient();
  if (sb) {
    const { data } = await sb
      .from("settings")
      .select("autopublish")
      .eq("id", 1)
      .maybeSingle();
    const ap = (data as { autopublish?: { gemini_api_key?: string } | null })
      ?.autopublish;
    const db = ap?.gemini_api_key?.trim();
    if (db) return db;
  }
  throw new Error(
    "No Gemini API key configured — add one in Auto-Publish settings."
  );
}

async function downloadImage(url: string): Promise<InlineImage> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Image download failed (HTTP ${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mime =
    (res.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim() ||
    "image/jpeg";
  return { inline_data: { mime_type: mime, data: buf.toString("base64") } };
}

function shortName(title: string): string {
  return (title.split(/\s+[—|–|:|-]\s+/)[0] || title).trim();
}

function fmtPrice(price: number | null, currency?: string): string {
  if (price == null) return "";
  const sym = { USD: "$", EUR: "€", GBP: "£" }[currency ?? "USD"] ?? "$";
  return Number.isInteger(price) ? `${sym}${price}` : `${sym}${price.toFixed(2)}`;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function buildPrompt(title: string, price: string, expression: string): string {
  return (
    "Create a high-energy, scroll-stopping YouTube thumbnail (16:9) for a software " +
    "review. Use IMAGE 2 (a real person's photo) as a BIG reaction \"gig\" photo — " +
    "a large chest-up shot of the person filling roughly the LEFT 45% of the frame, " +
    "shown from mid-chest up with an arm raised. Keep the person's exact face from " +
    "IMAGE 2, but give them this expression: " +
    expression +
    ".\n\n" +
    "The person is pointing with their raised hand toward the product-name headline " +
    "text on the RIGHT side of the thumbnail, as if saying \"look at this!\".\n\n" +
    "Use IMAGE 1 (the product's real user interface screenshot) as a clean rounded " +
    "card with a thin white border, tucked in the RIGHT portion UNDER the headline " +
    "text, partially behind the headline, blended into the background.\n\n" +
    "Compose it as:\n" +
    "- Background: vibrant violet-to-deep-purple diagonal gradient, with the product " +
    "UI blurred for depth.\n" +
    "- Top-LEFT above the person: a yellow rounded pill badge with bold black text " +
    "reading exactly: ★ LIFETIME DEAL ★\n" +
    "- RIGHT side: huge bold white uppercase headline with strong black outline, " +
    "max 2 lines, reading exactly: " +
    title +
    "\n" +
    "- Below the headline, small white label \"ONLY\", then a giant bold yellow price " +
    "with black outline reading exactly: " +
    price +
    "\n" +
    "- Under the price, small white text reading exactly: ONE-TIME · LAUNCH PRICE\n" +
    "- Top-RIGHT corner: a red rounded button with bold white text reading exactly: " +
    "▶ WATCH FULL REVIEW\n\n" +
    "Rules: spell every piece of text EXACTLY as given, no typos, no invented words, " +
    "no watermarks. The person's face must clearly match IMAGE 2. High contrast, " +
    "punchy, modern SaaS-review style, crisp sharp edges, everything legible at " +
    "small size."
  );
}

async function genImage(
  prompt: string,
  images: InlineImage[],
  key: string,
  model: string = GEMINI_MODEL
): Promise<Buffer> {
  const body = {
    contents: [{ parts: [{ text: prompt }, ...images] }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio: "16:9" },
    },
  };
  const res = await fetch(API(model), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (model !== FALLBACK_MODEL) {
      return genImage(prompt, images, key, FALLBACK_MODEL);
    }
    throw new Error(
      `Gemini API HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`
    );
  }
  const resp = await res.json();
  for (const cand of resp?.candidates ?? []) {
    for (const part of cand?.content?.parts ?? []) {
      if (part?.inlineData?.data) {
        return Buffer.from(part.inlineData.data, "base64");
      }
    }
  }
  throw new Error("No image in Gemini response");
}

/**
 * Generate a Gemini thumbnail for a deal and repoint its hero_image at the
 * new public storage URL. Returns the updated hero_image.
 */
export async function generateAiThumbnail(
  deal: Deal
): Promise<{ hero_image: string }> {
  const key = await getGeminiKey();
  const auth = await getYoutubeAuth();
  const avatarUrl = auth?.channel_avatar?.trim() || DEFAULT_AVATAR_URL;

  const title = shortName(deal.title);
  const price = fmtPrice(deal.price, deal.currency) || "LIFETIME DEAL";

  const images: InlineImage[] = [];
  if (deal.hero_image?.trim()) {
    images.push(await downloadImage(deal.hero_image.trim()));
  }
  images.push(await downloadImage(avatarUrl));

  const expression = GIG_EXPRESSIONS[hashStr(deal.slug) % GIG_EXPRESSIONS.length];
  const data = await genImage(buildPrompt(title, price, expression), images, key);

  const sb = await createSupabaseServerClient();
  if (!sb) throw new Error("Supabase is not configured");

  const path = `deals/${deal.slug}.png`;
  const { error } = await sb.storage
    .from("previews")
    .upload(path, data, { contentType: "image/png", upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const heroImage = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/previews/${path}`;

  const { error: upErr } = await sb
    .from("products")
    .update({ hero_image: heroImage })
    .eq("id", deal.id);
  if (upErr) throw new Error(`Failed to update deal: ${upErr.message}`);

  return { hero_image: heroImage };
}
