"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link2,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  PlayCircle,
  Tag,
  Check,
  X,
  PenLine,
  AlertTriangle,
  MonitorPlay,
  ArrowRight,
} from "lucide-react";
import type { ScrapeResult } from "@/lib/types";
import { adminApi } from "@/components/admin/client";
import { formatPrice } from "@/lib/utils";

type YouTubeStatus = {
  configured: boolean;
  connected: boolean;
  channel: { id: string; title: string; avatar: string | null } | null;
};

/**
 * Single-input link ingestion. Paste a JVZoo URL → auto-scrape → review the
 * parsed metadata (title, image, VSL, pricing, affiliate tag) → hand off to
 * the manual-override editor.
 *
 * Parsing is gated on a connected YouTube channel (the deal stream + auto-
 * publish engine are built around it), so white-label owners must connect
 * before they can pull in their own JVZoo deals.
 */
export function UrlIngest({
  onScrapeReady,
  compact = false,
}: {
  onScrapeReady: (result: ScrapeResult) => void;
  compact?: boolean;
}) {
  const [url, setUrl] = useState("");
  const [bundleUrl, setBundleUrl] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [youtube, setYoutube] = useState<YouTubeStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const refreshStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/admin/youtube/status");
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (res.ok) setYoutube(await res.json());
    } catch {
      setYoutube(null);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus().catch(() => {});
  }, [refreshStatus]);

  const connectYouTube = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/youtube/connect");
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Connect failed");
      if (body.authUrl) location.href = body.authUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connect failed");
    }
  }, []);

  const youtubeReady = youtube?.connected ?? false;

  const scrape = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || state === "loading") return;
    if (!youtubeReady) {
      setError("Connect your YouTube channel before parsing JVZoo links.");
      setState("error");
      return;
    }
    setState("loading");
    setError(null);
    try {
      const r = await adminApi.scrape(
        trimmed,
        bundleUrl.trim() ? bundleUrl.trim() : undefined
      );
      setResult(r);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scrape failed");
      setState("error");
    }
  };

  return (
    <div className="space-y-4">
      {/* YouTube gate — required before JVZoo parsing is enabled */}
      {!statusLoading && !youtubeReady && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <MonitorPlay className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div className="text-sm text-amber-100">
              <p className="font-bold">
                {youtube?.configured
                  ? "Connect your YouTube channel first"
                  : "YouTube not configured yet"}
              </p>
              <p className="mt-0.5 text-amber-200/70">
                JVZoo parsing is unlocked once your channel is connected — the
                deal stream is built on the auto-publish engine.
              </p>
            </div>
          </div>
          <button
            onClick={connectYouTube}
            disabled={!youtube?.configured}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MonitorPlay className="h-4 w-4" />
            {youtube?.configured ? "Connect YouTube" : "Configure Google API"}
            {youtube?.configured && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      )}

      {/* Input row */}
      <form onSubmit={scrape} className="flex flex-col gap-2 sm:flex-row">
        <div className="flex flex-1 flex-col gap-2">
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={!youtubeReady}
              placeholder="https://www.jvzoo.com/b/123456/0"
              className="h-12 w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/30 disabled:cursor-not-allowed disabled:opacity-40"
            />
          </div>
          <div className="relative">
            <Tag className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="url"
              value={bundleUrl}
              onChange={(e) => setBundleUrl(e.target.value)}
              disabled={!youtubeReady}
              placeholder="https://www.jvzoo.com/b/123456/999998 (bundle)"
              className="h-12 w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/30 disabled:cursor-not-allowed disabled:opacity-40"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={!url.trim() || state === "loading" || !youtubeReady}
          className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 cta-glow"
        >
          {state === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Scraping…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Scrape &amp; Parse
            </>
          )}
        </button>
      </form>

      {/* Error */}
      {state === "error" && error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-rose-300" />
          <div className="text-sm text-rose-200">
            <p className="font-semibold">Couldn&apos;t parse that page</p>
            <p className="mt-0.5 text-rose-200/70">
              {error}. You can still add this deal manually — the affiliate URL
              will be filled in for you.
            </p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {state === "loading" && (
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <div className="h-40 animate-pulse rounded-2xl bg-white/5 sm:h-36" />
          <div className="space-y-3 py-1">
            <div className="h-5 w-2/3 animate-pulse rounded-lg bg-white/10" />
            <div className="h-3.5 w-full animate-pulse rounded bg-white/5" />
            <div className="h-3.5 w-5/6 animate-pulse rounded bg-white/5" />
            <div className="h-10 w-48 animate-pulse rounded-xl bg-white/10" />
          </div>
        </div>
      )}

      {/* Result preview */}
      <AnimatePresence>
        {state === "done" && result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="overflow-hidden rounded-3xl border border-white/10 bg-panel"
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-5 py-3">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-300">
                <Check className="h-4 w-4" /> Parsed metadata
              </span>
              <button
                onClick={() => {
                  setResult(null);
                  setState("idle");
                }}
                aria-label="Discard result"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-[140px_1fr]">
              {/* Thumbnail */}
              <div className="relative h-36 overflow-hidden rounded-2xl bg-black sm:h-full sm:min-h-32">
                {result.hero_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={result.hero_image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-white/25">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                {result.video_url && (
                  <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-bold text-cyan-300 backdrop-blur">
                    <PlayCircle className="h-3.5 w-3.5" />
                    {result.video_type?.toUpperCase() ?? "VIDEO"}
                  </span>
                )}
              </div>

              {/* Fields */}
              <div className="min-w-0 space-y-2.5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Title
                  </p>
                  <p className="truncate text-sm font-semibold text-white">
                    {result.title ?? "— not detected —"}
                  </p>
                </div>

                {result.description && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                      Description
                    </p>
                    <p className="line-clamp-2 text-xs text-white/60">
                      {result.description}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  {result.price != null && (
                    <span className="flex items-center gap-1 text-sm font-bold text-emerald-300">
                      <Tag className="h-3.5 w-3.5" />
                      {formatPrice(result.price, result.currency)}
                      {result.original_price != null && (
                        <span className="text-xs font-medium text-white/35 line-through">
                          {formatPrice(result.original_price, result.currency)}
                        </span>
                      )}
                    </span>
                  )}
                  {result.detected_highlights.length > 0 && (
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/60">
                      {result.detected_highlights.length} highlights found
                    </span>
                  )}
                </div>

                {/* Affiliate URL */}
                <div className="rounded-xl border border-dashed border-violet-400/40 bg-violet-500/5 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300">
                    Affiliate URL (tracking attached)
                  </p>
                  <p className="truncate font-mono text-[11px] text-white/80">
                    {result.affiliate_url}
                  </p>
                </div>

                {result.bundle_url && (
                  <div className="rounded-xl border border-dashed border-emerald-400/40 bg-emerald-500/5 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                      Bundle URL (tracking attached)
                    </p>
                    <p className="truncate font-mono text-[11px] text-white/80">
                      {result.bundle_url}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-white/10 p-4 sm:flex-row sm:justify-end">
              <button
                onClick={() => {
                  setResult(null);
                  setState("idle");
                }}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white/55 transition hover:text-white"
              >
                Discard
              </button>
              <button
                onClick={() => onScrapeReady(result)}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
              >
                <PenLine className="h-4 w-4" /> Review &amp; Publish
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {compact && !result && state !== "loading" && (
        <p className="text-[11px] text-white/35">
          Tip: paste the plain product and bundle URLs — your affiliate tag is
          appended to both automatically.
        </p>
      )}
    </div>
  );
}
