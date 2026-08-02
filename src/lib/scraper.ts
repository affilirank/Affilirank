import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { ScrapeResult, VideoType } from "@/lib/types";
import { parseUrl, splitHighlights } from "@/lib/utils";

/**
 * JVZoo / OpenGraph metadata scraper.
 *
 * Given a JVZoo affiliate or product URL it:
 *  1. Normalizes the URL and appends the site's JVZoo affiliate tag when the
 *     pasted URL does not already carry one.
 *  2. Fetches the page server-side with a browser User-Agent.
 *  3. Extracts OpenGraph / Twitter Card / JSON-LD metadata (title,
 *     description, hero image, VSL video, pricing) plus bullet highlights.
 *
 * Many sales pages ship no OpenGraph tags at all, so extraction falls back to
 * the page's own HTML: the largest non-trivial `<img>`, first meaningful
 * paragraph, and any `<video>` / video iframe / player scripts.
 *
 * Pages that block scraping simply return null fields — the admin can then
 * fill the Manual Override form. Nothing crashes.
 */

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const JVZOO_HOSTS = ["jvzoo.com", "www.jvzoo.com"];

function isJvzooHost(hostname: string): boolean {
  return JVZOO_HOSTS.includes(hostname) || /^jvz\d+\.com$/i.test(hostname);
}

/**
 * JVZoo affiliate URLs come in two formats:
 *   `https://www.jvzoo.com/b/{product}/{affiliate}`   (classic)
 *   `https://jvz7.com/c/{affiliate}/{product}/`        (short)
 * Both are normalized so a configured affiliate id is used whenever the URL
 * carries a placeholder ("0") or no id.
 */
export function normalizeAffiliateUrl(input: string): string {
  const url = parseUrl(input);
  if (!url) return input.trim();

  const isJvzoo = isJvzooHost(url.hostname);
  const configured = process.env.NEXT_PUBLIC_JVZOO_AFFILIATE_ID?.trim();

  // Classic `/b/{product}/{affiliate}`
  const bMatch = url.pathname.match(/^\/b\/(\d+)\/(\d+)/);
  if (isJvzoo && bMatch) {
    const [, productId, affiliateId] = bMatch;
    const finalAffiliate =
      affiliateId && affiliateId !== "0" ? affiliateId : configured;
    if (finalAffiliate) url.pathname = `/b/${productId}/${finalAffiliate}`;
  }

  // Short `/c/{affiliate}/{product}/`
  const cMatch = url.pathname.match(/^\/c\/(\d+)\/(\d+)/);
  if (isJvzoo && cMatch) {
    const [, affiliateId, productId] = cMatch;
    const finalAffiliate =
      affiliateId && affiliateId !== "0" ? affiliateId : configured;
    if (finalAffiliate) url.pathname = `/c/${finalAffiliate}/${productId}/`;
  }

  return url.toString();
}

interface JsonLdNode {
  "@type"?: string | string[];
  [key: string]: unknown;
}

function walkFor(node: JsonLdNode, type: string): JsonLdNode[] {
  const found: JsonLdNode[] = [];
  const visit = (n: JsonLdNode) => {
    const t = n["@type"];
    const types = Array.isArray(t) ? t : [t];
    if (types.includes(type)) found.push(n);
    for (const key of Object.keys(n)) {
      const v = n[key];
      if (Array.isArray(v)) v.forEach((i) => i && typeof i === "object" && visit(i as JsonLdNode));
      else if (v && typeof v === "object") visit(v as JsonLdNode);
    }
  };
  visit(node);
  return found;
}

function extractJsonLd(html: string): JsonLdNode[] {
  const nodes: JsonLdNode[] = [];
  const scriptRe =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = scriptRe.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (Array.isArray(parsed)) nodes.push(...(parsed as JsonLdNode[]));
      else if (parsed && typeof parsed === "object") nodes.push(parsed);
    } catch {
      // malformed JSON-LD — skip
    }
  }
  return nodes;
}

function firstString(...values: Array<string | null | undefined>): string | null {
  for (const v of values) {
    if (v && typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Resolve a (possibly protocol-relative or absolute-path) href to an absolute URL. */
function abs(base: URL, href: string | null | undefined): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;
  try {
    if (trimmed.startsWith("//")) return `https:${trimmed}`;
    return new URL(trimmed, base).toString();
  } catch {
    return null;
  }
}

/** Names that strongly suggest a page/hero/product image worth showing. */
const GOOD_IMAGE_NAMES =
  /(hero|banner|cover|watch|product|main|thumb|screenshot|preview|showcase|mockup|feature|ss|screen|slide|logo-img|og)/i;
/** Names of tiny/irrelevant decoration assets to skip. */
const BAD_IMAGE_NAMES =
  /(logo|icon|emoji|pixel|line|dot|star|arrow|badge|bar|wave|circle|spark|shine|glow|btn|button|bg-|background|gradient|graphic|rocket|roket|c\d{1,2}$|m\d{1,2}$|i\d{1,2}$|s\d{1,2}$|f[0-9a-z]{6}|_1x|@2x|sprite)/i;

function parseImgArea($: cheerio.CheerioAPI, el: Element): number {
  const sel = $(el);
  const style = sel.attr("style") || "";
  let w = parseFloat(sel.attr("width") || "");
  let h = parseFloat(sel.attr("height") || "");
  const wm = style.match(/width\s*:\s*(\d+(?:\.\d+)?)(px)?/i);
  const hm = style.match(/height\s*:\s*(\d+(?:\.\d+)?)(px)?/i);
  if (!w && wm) w = parseFloat(wm[1]);
  if (!h && hm) h = parseFloat(hm[1]);
  if (w && h) return w * h;
  if (w) return w * (w * 1.5); // assume portrait-ish default
  if (h) return h * (h * 0.667);
  return 0;
}

function extractImageMeta(
  $: cheerio.CheerioAPI,
  jld: JsonLdNode[],
  base: URL
): string | null {
  const og = (prop: string) =>
    $(`meta[property="${prop}"], meta[name="${prop}"]`).first().attr("content");

  const ogImage = firstString(
    og("og:image:secure_url"),
    og("og:image:url"),
    og("og:image"),
    og("twitter:image"),
    og("twitter:image:src")
  );
  if (ogImage) return abs(base, ogImage);

  // JSON-LD ImageObject / product thumbnailUrl.
  for (const node of jld) {
    for (const img of walkFor(node, "ImageObject")) {
      const src = firstString(
        img.contentUrl as string,
        img.url as string,
        (img.thumbnailUrl as string) ?? null
      );
      if (src) return abs(base, src);
    }
    for (const prod of walkFor(node, "Product")) {
      const img = firstString(
        (prod.image as string) ?? null,
        (prod.thumbnailUrl as string) ?? null
      );
      if (img) return abs(base, img);
    }
  }

  // Fall back to the largest non-trivial <img> on the page.
  let bestUrl: string | null = null;
  let bestScore = 0;
  $("img[src]").each((_, el) => {
    const src = $(el).attr("src");
    if (!src) return;
    const absUrl = abs(base, src);
    if (!absUrl) return;
    const name = decodeURIComponent(src.split("/").pop() || src);
    if (BAD_IMAGE_NAMES.test(name)) return;
    const area = parseImgArea($, el);
    if (area > 0 && area < 5000) return; // skip 1x1 tracking pixels
    let score = area || 1200 * 900;
    if (GOOD_IMAGE_NAMES.test(name)) score += 1_000_000;
    if (score > bestScore) {
      bestScore = score;
      bestUrl = absUrl;
    }
  });

  return bestUrl;
}

function extractDescriptionMeta(
  $: cheerio.CheerioAPI,
  jld: JsonLdNode[]
): string | null {
  const og = (prop: string) =>
    $(`meta[property="${prop}"], meta[name="${prop}"]`).first().attr("content");

  const metaDesc = firstString(
    og("og:description"),
    og("twitter:description"),
    $('meta[name="description"]').attr("content")
  );
  if (metaDesc) return metaDesc;

  for (const node of jld) {
    for (const item of walkFor(node, "Article")) {
      const d = firstString(item.description as string, item.abstract as string);
      if (d) return d;
    }
  }

  // First meaningful paragraph on the page.
  let bestP: string | null = null;
  $("p").each((_, el) => {
    if (bestP) return;
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length >= 60 && text.length < 400) bestP = text;
  });
  return bestP;
}

/** Collect every plausible video URL from static HTML (meta, JSON-LD, tags, scripts). */
function collectVideoCandidates(
  $: cheerio.CheerioAPI,
  jld: JsonLdNode[],
  base: URL
): string[] {
  const out: string[] = [];
  const push = (v: string | null | undefined) => {
    const u = abs(base, v);
    if (u && !out.includes(u)) out.push(u);
  };

  const og = (prop: string) =>
    $(`meta[property="${prop}"], meta[name="${prop}"]`).first().attr("content");

  // OpenGraph / Twitter video meta.
  push(og("og:video:secure_url"));
  push(og("og:video:url"));
  push(og("og:video"));
  push(og("twitter:player"));
  push(og("twitter:player:stream"));

  // JSON-LD VideoObject / MediaObject.
  for (const node of jld) {
    for (const vid of [
      ...walkFor(node, "VideoObject"),
      ...walkFor(node, "MediaObject"),
    ]) {
      push(firstString(
        vid.embedUrl as string,
        vid.contentUrl as string,
        vid.url as string,
        vid.playerType as string
      ));
    }
  }

  // HTML5 <video> tags (src attr + <source> children).
  $("video").each((_, el) => {
    const $el = $(el);
    push($el.attr("src"));
    $el.find("source[src]").each((_, s) => push($(s).attr("src")));
  });

  // Video iframes — collect in DOM order, but prefer the main VSL embed:
  // sales pages typically autoplay the primary video, so an iframe whose
  // `allow` attribute enables autoplay and whose URL does not force
  // `autoplay=0` is far more likely to be the VSL than a secondary video.
  const videoHostRe =
    /(youtube\.com|youtu\.be|youtube-nocookie\.com|vimeo\.com|player\.vimeo|wistia\.com|wistia\.net|fast\.wistia|dailymotion\.com|loom\.com|twitch\.tv|streamable\.com|vidyard\.com|wistia)/i;
  // Embeds that are never a sales VSL — countdown timers, forms, chat
  // widgets, social feeds, maps, audio players. JVZoo landers commonly
  // embed a neotimer.com countdown that must not be mistaken for a video.
  const nonVideoIframeRe =
    /(neotimer|countdown|onlineclock|timeanddate\.com\/countdown|calendly|typeform|jotform|google\.com\/forms|tawk\.to|intercom|drift\.com|crisp\.chat|hotjar|facebook\.com\/plugins|instagram\.com\/p|platform\.twitter|twitter\.com\/i\/timelines|pinterest|linkedin\.com\/embed|maps\.google|soundcloud|spotify|twitch\.tv|kick\.com|tiktok\.com\/embed)/i;
  const iframeEntries: { u: string; score: number; order: number }[] = [];
  let iframeOrder = 0;
  $("iframe[src]").each((_, el) => {
    const $el = $(el);
    const src = $el.attr("src");
    if (!src) return;
    const u = abs(base, src);
    if (!u) return;
    if (nonVideoIframeRe.test(u)) return;
    let score = 0;
    if (videoHostRe.test(u)) score += 1;
    if (/\bautoplay\b/i.test($el.attr("allow") ?? "")) score += 3;
    if (/[?&]autoplay=0/i.test(u)) score -= 2;
    iframeEntries.push({ u, score, order: iframeOrder++ });
  });
  // Highest VSL-score first, then earliest in the DOM (deterministic).
  iframeEntries
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .forEach((e) => out.push(e.u));

  // JS-hosted players referenced from <script src> (PlayerNeos, etc.) that
  // render the real VSL via Plyr/Vimeo — resolved later by resolvePlyrEmbed.
  const playerScriptRe =
    /playerneos\.com\/players\/\d+\/(\d+)\.js|plyr|playerneos|wistia\.com\/init|wistia\.com\/embed/i;
  $("script[src]").each((_, el) => {
    const src = $(el).attr("src");
    if (!src || !playerScriptRe.test(src)) return;
    const id = src.match(/playerneos\.com\/players\/\d+\/(\d+)\.js/);
    if (id) push(`https://app.playerneos.com/embed/${id[1]}`);
    else push(src);
  });

  // Scripts often carry embeds even when no iframe exists (JS-rendered players).
  const scriptText = $("script").text();
  const embedRe =
    /(?:https?:)?\/\/[^"'\s]*(?:youtube\.com\/embed|player\.vimeo\.com|wistia\.net|wistia\.com|dailymotion\.com\/embed|loom\.com\/embed)[^"'\s]*/g;
  let m: RegExpExecArray | null;
  while ((m = embedRe.exec(scriptText)) !== null) {
    push(m[0].replace(/\\u002F/g, "/"));
  }

  // Next.js / React landers often ship zero iframes but expose the real player
  // id as JSON inside scripts ("vimeoId":"1195983684", "youtubeId":"dQw4w9WgXcQ").
  // These are the true, playable ids — prefer them over CDN-derived guesses.
  const fullHtml = $.html();
  // Both plain JSON and escaped JSON inside <script> strings ("\"vimeoId\":\"1195...\"") occur.
  const vimeoIdRe = /\\*?["']vimeoId\\*?["']\s*:\s*\\*?["'](\d{7,12})\\*?["']/g;
  let vid: RegExpExecArray | null;
  while ((vid = vimeoIdRe.exec(fullHtml)) !== null) {
    push(`https://player.vimeo.com/video/${vid[1]}`);
  }
  const youtubeIdRe = /\\*?["']youtubeId\\*?["']\s*:\s*\\*?["']([\w-]{8,20})\\*?["']/g;
  let yid: RegExpExecArray | null;
  while ((yid = youtubeIdRe.exec(fullHtml)) !== null) {
    push(`https://www.youtube.com/embed/${yid[1]}`);
  }

  // ClickFunnels / VTurb landers ship the whole rendered page as a URL-encoded
  // string inside a script; players surface as data-youtube-url="..." (with the
  // value optionally %22-encoded). e.g. data-youtube-url="CP34ygcYzi4".
  const ytAttrRe = /data-youtube-url\s*=\s*(?:"|%22|')([\w-]{6,20})(?:"|%22|')/g;
  let ya: RegExpExecArray | null;
  while ((ya = ytAttrRe.exec(fullHtml)) !== null) {
    push(`https://www.youtube.com/embed/${ya[1]}`);
  }
  const wistiaAttrRe = /data-wistia-url\s*=\s*(?:"|%22|')([a-z0-9]{6,15})(?:"|%22|')/g;
  let wa: RegExpExecArray | null;
  while ((wa = wistiaAttrRe.exec(fullHtml)) !== null) {
    push(`https://fast.wistia.net/embed/iframe/${wa[1]}`);
  }

  // Vimeo CDN thumbnail URLs (i.vimeocdn.com/video/{id}-{hash}-d_1280) imply
  // a Vimeo-hosted video even when the player itself is JS-rendered — common
  // on Next.js landers and ClickFunnels pages that ship zero iframes.
  // NOTE: the id here is a CDN *asset* id, not the playable video id — it is
  // used only as a last-resort hint and filtered by vimeoIsPublic() below.
  const vimeoThumbRe = /i\.vimeocdn\.com\/video\/(\d+)/g;
  let vt: RegExpExecArray | null;
  while ((vt = vimeoThumbRe.exec(fullHtml)) !== null) {
    push(`https://player.vimeo.com/video/${vt[1]}`);
  }

  return out;
}

/**
 * Resolve a JS-wrapped video player (PlayerNeos → Plyr → Vimeo/YouTube).
 * The lander only ships `app.playerneos.com/players/7/{id}.js`, so we follow
 * it to the embed page and read the `data-plyr-embed-id` / `data-plyr-provider`
 * attributes to recover the real VSL embed URL.
 */
/**
 * Verify a Vimeo video is actually public/embeddable via oEmbed. CDN-derived
 * IDs often point at private or deleted videos; a 404 means "skip this one".
 */
async function vimeoIsPublic(id: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${id}`)}`,
      {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(6000),
        redirect: "follow",
      }
    );
    return res.ok;
  } catch {
    return true; // if the check itself fails, assume OK rather than block playback
  }
}

async function resolvePlyrEmbed(candidate: string): Promise<string | null> {
  const m = candidate.match(/playerneos\.com\/(?:players\/\d+\/|embed\/)(\d+)/);
  if (!m) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://app.playerneos.com/embed/${m[1]}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = await res.text();
    const provider = html.match(/data-plyr-provider="([^"]+)"/)?.[1]?.toLowerCase();
    const embedId = html.match(/data-plyr-embed-id="([^"]+)"/)?.[1];
    if (!embedId) return null;
    if (provider === "youtube") {
      return `https://www.youtube.com/embed/${embedId}`;
    }
    if (provider === "vimeo") return `https://player.vimeo.com/video/${embedId}`;
    return null;
  } catch {
    return null;
  }
}

export function normalizeVideo(raw: string | null): {
  url: string | null;
  type: VideoType | null;
} {
  if (!raw) return { url: null, type: null };

  const url = parseUrl(raw);
  if (!url) return { url: null, type: "iframe" };

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0] || "";
    return id
      ? { url: `https://www.youtube.com/embed/${id}`, type: "youtube" }
      : { url: null, type: null };
  }

  if (host.includes("youtube") || host.includes("youtube-nocookie.com")) {
    const id =
      url.searchParams.get("v") || url.pathname.match(/^\/embed\/([^/]+)/)?.[1] || "";
    return id
      ? { url: `https://www.youtube.com/embed/${id}`, type: "youtube" }
      : { url: null, type: null };
  }

  if (host.includes("vimeo.com")) {
    const id =
      url.pathname.match(/^\/video\/([^/]+)/)?.[1] ||
      url.pathname.replace(/^\/embed\//, "").split("/")[0] ||
      url.pathname.split("/").filter(Boolean)[0] ||
      "";
    return id
      ? { url: `https://player.vimeo.com/video/${id}`, type: "vimeo" }
      : { url: null, type: null };
  }

  if (/\.(mp4|webm|ogv|mov|m3u8)(\?.*)?$/i.test(url.pathname)) {
    return { url: raw.trim(), type: "mp4" };
  }

  // Unknown host that is likely an embeddable player (Wistia, Loom, etc.)
  return { url: raw.trim(), type: "iframe" };
}

/**
 * Defensive normalization applied at the deal save boundary (create/update)
 * so that no stale or manually-entered video URL ever reaches the player in
 * an un-embeddable form (e.g. a raw vimeo.com/watch page instead of the
 * player embed). GIF/MP4 sources are left untouched.
 */
export function sanitizeVideoForDeal(draft: {
  video_url?: string | null;
  video_type?: VideoType | null;
}): { video_url: string | null; video_type: VideoType | null } {
  const raw = draft.video_url?.trim() ?? null;
  if (!raw) return { video_url: null, video_type: null };
  const type = draft.video_type ?? null;
  if (type === "gif" || type === "mp4") {
    return { video_url: raw, video_type: type };
  }
  const normalized = normalizeVideo(raw);
  if (normalized.url) {
    return {
      video_url: normalized.url,
      video_type: normalized.type ?? type ?? "iframe",
    };
  }
  return type
    ? { video_url: raw, video_type: type }
    : { video_url: raw, video_type: "iframe" };
}

const cache = new Map<string, { at: number; result: ScrapeResult }>();
const CACHE_TTL = 10 * 60 * 1000;

export async function scrapeUrl(inputUrl: string): Promise<ScrapeResult> {
  const affiliateUrl = normalizeAffiliateUrl(inputUrl);
  const cached = cache.get(affiliateUrl);
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.result;

  const base: ScrapeResult = {
    url: affiliateUrl,
    affiliate_url: affiliateUrl,
    title: null,
    description: null,
    hero_image: null,
    video_url: null,
    video_type: null,
    price: null,
    original_price: null,
    currency: "USD",
    site_name: null,
    favicon: null,
    detected_highlights: [],
  };

  const parsed = parseUrl(affiliateUrl);
  if (!parsed) {
    cache.set(affiliateUrl, { at: Date.now(), result: base });
    return base;
  }

  let html = "";
  let finalUrl: URL | null = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(parsed, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return base;
    finalUrl = parseUrl(res.url) ?? parsed;
    html = await res.text();
  } catch {
    return base;
  }

  if (!html) return base;

  const $ = cheerio.load(html);
  const jld = extractJsonLd(html);
  const baseUrl = finalUrl;

  const og = (prop: string) =>
    $(`meta[property="${prop}"], meta[name="${prop}"]`).first().attr("content");

  const title = firstString(
    og("og:title"),
    og("twitter:title"),
    $("title").first().text()
  );

  const description = extractDescriptionMeta($, jld);
  const heroImage = extractImageMeta($, jld, baseUrl);
  const siteName = firstString(og("og:site_name"));
  const favicon = abs(
    baseUrl,
    firstString(
      $('link[rel="icon"]').attr("href"),
      $('link[rel="shortcut icon"]').attr("href")
    )
  );

  // Pricing — OG first, then JSON-LD Product/Offer.
  let price = toNumber(og("og:price:amount"));
  let originalPrice = toNumber(og("og:price:standard_amount"));
  let currency = og("og:price:currency")?.toUpperCase() || "USD";

  for (const node of jld) {
    if (price == null) {
      for (const prod of walkFor(node, "Product")) {
        const offer = (prod.offers ?? prod.Offer) as JsonLdNode | undefined;
        price = toNumber(offer?.price);
        const spec = offer?.priceSpecification as JsonLdNode | undefined;
        originalPrice = originalPrice ?? toNumber(spec?.price);
        currency = (offer?.priceCurrency as string)?.toUpperCase() || currency;
        break;
      }
    }
  }

  // Video (VSL) — first usable candidate wins. Resolve JS-wrapped players
  // (PlayerNeos → Plyr → Vimeo/YouTube) first so the real VSL beats any
  // countdown-timer or widget embed. Vimeo candidates derived from CDN
  // thumbnails can point at private/deleted videos, so verify each one.
  const candidates = collectVideoCandidates($, jld, baseUrl);
  let video: { url: string | null; type: VideoType | null } = { url: null, type: null };
  const resolved: string[] = [];
  for (const candidate of candidates) {
    const direct = await resolvePlyrEmbed(candidate);
    if (direct) resolved.push(direct);
  }
  for (const candidate of [...resolved, ...candidates]) {
    const normalized = normalizeVideo(candidate);
    if (!normalized.url) continue;
    if (normalized.type === "vimeo") {
      const id = normalized.url.match(/player\.vimeo\.com\/video\/([0-9]+)/)?.[1];
      if (id && !(await vimeoIsPublic(id))) continue;
    }
    video = normalized;
    break;
  }

  // Highlights from visible bullet lists on the sales page.
  const highlights: string[] = [];
  $("ul li, .features li, .check li, .feature-list li").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length > 10 && text.length < 160) highlights.push(text);
  });
  if (highlights.length < 2 && description) {
    highlights.push(...splitHighlights(description));
  }
  highlights.splice(5);

  const result: ScrapeResult = {
    ...base,
    title,
    description,
    hero_image: heroImage,
    video_url: video.url,
    video_type: video.type,
    price,
    original_price: originalPrice,
    currency,
    site_name: siteName,
    favicon,
    detected_highlights: highlights,
  };

  cache.set(affiliateUrl, { at: Date.now(), result });
  return result;
}
