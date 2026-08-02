"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Save,
  Rocket,
  Loader2,
  Calendar,
} from "lucide-react";
import type { DealDraft, VideoType, DealTag } from "@/lib/types";
import { CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Manual override editor — every field on a deal is editable here before
 * publishing. Fills from the scraper output; everything can be tweaked.
 */
export function ProductFormPanel({
  id,
  initial,
  busy,
  onClose,
  onSave,
}: {
  id: string;
  initial: DealDraft;
  busy: boolean;
  onClose: () => void;
  onSave: (draft: DealDraft, id: string, publish: boolean) => void;
}) {
  const [draft, setDraft] = useState<DealDraft>(initial);

  const set = <K extends keyof DealDraft>(key: K, value: DealDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const highlightsText = useMemo(
    () => (draft.highlights ?? []).join("\n"),
    [draft.highlights]
  );

  const expiryValue = useMemo(() => {
    if (!draft.expiration_date) return "";
    const d = new Date(draft.expiration_date);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  }, [draft.expiration_date]);

  const submit = (forcePublish: boolean) => {
    const payload: DealDraft = {
      ...draft,
      price: draft.price == null || Number.isNaN(draft.price) ? null : Number(draft.price),
      original_price:
        draft.original_price == null || Number.isNaN(draft.original_price)
          ? null
          : Number(draft.original_price),
      sort_order: Number(draft.sort_order) || 0,
      highlights: highlightsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      published: forcePublish ? true : draft.published,
    };
    onSave(payload, id, forcePublish);
  };

  const input =
    "h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/30";
  const label =
    "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-white/45";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 34 }}
        className="absolute right-0 top-0 flex h-full w-full flex-col bg-abyss shadow-2xl sm:w-[560px] sm:border-l sm:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold">
              {id === "new" ? "New deal" : "Edit deal"}
            </h2>
            <p className="text-xs text-white/45">
              Manually override anything before publishing
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close editor"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div>
            <label className={label}>Title *</label>
            <input
              className={input}
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Product name"
            />
          </div>

          <div>
            <label className={label}>Subtitle</label>
            <input
              className={input}
              value={draft.subtitle ?? ""}
              onChange={(e) => set("subtitle", e.target.value || null)}
              placeholder="Short tagline shown on the card"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Category</label>
              <select
                className={input}
                value={draft.category ?? ""}
                onChange={(e) => set("category", e.target.value || null)}
              >
                <option value="">— None —</option>
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Deal tag</label>
              <input
                className={input}
                value={draft.deal_tag ?? ""}
                onChange={(e) => set("deal_tag", e.target.value || null)}
                placeholder="70% OFF"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Tag style</label>
              <select
                className={input}
                value={draft.tag_style ?? "hot"}
                onChange={(e) => set("tag_style", e.target.value as DealTag)}
              >
                <option value="hot">Hot 🔥</option>
                <option value="popular">Popular</option>
                <option value="lifetime">Lifetime</option>
                <option value="new">New</option>
              </select>
            </div>
            <div>
              <label className={label}>Coupon code</label>
              <input
                className={input}
                value={draft.coupon_code ?? ""}
                onChange={(e) => set("coupon_code", e.target.value || null)}
                placeholder="LTDBUNDLE"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={label}>Price</label>
              <input
                type="number"
                step="0.01"
                className={input}
                value={draft.price ?? ""}
                onChange={(e) => set("price", e.target.value === "" ? null : Number(e.target.value))}
                placeholder="49"
              />
            </div>
            <div>
              <label className={label}>Original</label>
              <input
                type="number"
                step="0.01"
                className={input}
                value={draft.original_price ?? ""}
                onChange={(e) =>
                  set("original_price", e.target.value === "" ? null : Number(e.target.value))
                }
                placeholder="297"
              />
            </div>
            <div>
              <label className={label}>Currency</label>
              <input
                className={input}
                value={draft.currency}
                onChange={(e) => set("currency", e.target.value.toUpperCase())}
                placeholder="USD"
              />
            </div>
          </div>

          <div>
            <label className={label}>Hero image URL</label>
            <input
              className={input}
              value={draft.hero_image ?? ""}
              onChange={(e) => set("hero_image", e.target.value || null)}
              placeholder="https://…/cover.jpg"
            />
          </div>

          <div>
            <label className={label}>VSL video URL</label>
            <input
              className={input}
              value={draft.video_url ?? ""}
              onChange={(e) => set("video_url", e.target.value || null)}
              placeholder="https://www.youtube.com/watch?v=…"
            />
            <div className="mt-2 flex gap-2">
              {(["youtube", "vimeo", "mp4", "iframe"] as VideoType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => set("video_type", t)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide transition",
                    draft.video_type === t
                      ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white"
                      : "bg-white/5 text-white/50 hover:bg-white/10"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Expiration date</label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  type="datetime-local"
                  className={cn(input, "pl-9")}
                  value={expiryValue}
                  onChange={(e) => set("expiration_date", e.target.value ? new Date(e.target.value).toISOString() : null)}
                />
              </div>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-white/75">
                <input
                  type="checkbox"
                  checked={draft.countdown_enabled}
                  onChange={(e) => set("countdown_enabled", e.target.checked)}
                  className="h-4 w-4 accent-violet-500"
                />
                Show countdown
              </label>
            </div>
          </div>

          <div>
            <label className={label}>Affiliate URL *</label>
            <input
              className={cn(input, "font-mono text-xs")}
              value={draft.affiliate_url}
              onChange={(e) => set("affiliate_url", e.target.value)}
              placeholder="https://www.jvzoo.com/b/123456/999999"
            />
            <p className="mt-1 text-[11px] text-white/35">
              The link your CTA sends buyers to (with your tracking tag).
            </p>
          </div>

          <div>
            <label className={label}>Source page URL</label>
            <input
              className={cn(input, "font-mono text-xs")}
              value={draft.source_url ?? ""}
              onChange={(e) => set("source_url", e.target.value || null)}
              placeholder="https://www.jvzoo.com/b/123456/0"
            />
          </div>

          <div>
            <label className={label}>Description</label>
            <textarea
              rows={3}
              className={cn(input, "h-auto py-2.5")}
              value={draft.description ?? ""}
              onChange={(e) => set("description", e.target.value || null)}
              placeholder="What is this product, who is it for…"
            />
          </div>

          <div>
            <label className={label}>Highlights (one per line)</label>
            <textarea
              rows={4}
              className={cn(input, "h-auto py-2.5")}
              value={highlightsText}
              onChange={(e) =>
                set(
                  "highlights",
                  e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              placeholder={"Lifetime access\nUnlimited generations\nFree updates"}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={label}>Featured</label>
              <label className="flex h-10 items-center">
                <input
                  type="checkbox"
                  checked={draft.featured}
                  onChange={(e) => set("featured", e.target.checked)}
                  className="h-4 w-4 accent-violet-500"
                />
              </label>
            </div>
            <div>
              <label className={label}>Sort order</label>
              <input
                type="number"
                className={input}
                value={draft.sort_order}
                onChange={(e) => set("sort_order", Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex gap-2.5 border-t border-white/10 px-5 py-4">
          <button
            onClick={() => submit(false)}
            disabled={busy || !draft.title.trim() || !draft.affiliate_url.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="h-4 w-4" /> Save Draft
          </button>
          <button
            onClick={() => submit(true)}
            disabled={busy || !draft.title.trim() || !draft.affiliate_url.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-500 px-4 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 cta-glow"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
            Publish to Stream
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
