"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowUpRight, ExternalLink, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { analytics } from "@/lib/analytics";
import { cn, formatPrice } from "@/lib/utils";
import type { Deal } from "@/lib/types";

interface Props {
  deal: Deal;
  /** Other published deals to surface so visitors stick around. */
  related: Deal[];
  open: boolean;
  onClose: () => void;
  /** Which tier to open in the sales frame — front-end, bundle or an upsell. */
  salesUrl?: string;
  mode?: "fe" | "bundle" | "upsell";
  /** Label of the selected tier (e.g. "OTO2: Affiliate Profit Engine — $67"). */
  linkLabel?: string;
}

/**
 * Sales-page popup for the blog: clicking a JVZoo CTA opens the real sales
 * page inside an on-page modal instead of bouncing the visitor to another tab.
 * Mirrors the deal-stream modal — the buyer stays on the site and sees related
 * deals before leaving.
 */
export function BlogSalesModal({
  deal,
  related,
  open,
  onClose,
  salesUrl,
  mode = "fe",
  linkLabel,
}: Props) {
  const [view, setView] = useState<"details" | "sales">("details");
  const url = salesUrl ?? deal.affiliate_url;

  useEffect(() => {
    if (open) setView("details");
  }, [open, deal.id, salesUrl]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (view === "sales") setView("details");
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, view, onClose]);

  const openSales = () => {
    analytics.ctaClick(deal.id, url);
    setView("sales");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/85 backdrop-blur-md sm:items-center"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className={cn(
              "relative flex h-[94svh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-abyss shadow-2xl shadow-violet-900/40 sm:h-[92svh] sm:rounded-3xl",
              view === "sales" && "sm:max-w-4xl"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {view === "sales" ? (
              <>
                {/* Sales page top bar */}
                <div className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#0d1226] px-4 py-2.5">
                  <button
                    onClick={() => setView("details")}
                    className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                  >
                    <ChevronLeft className="h-4 w-4" /> Back to Review
                  </button>
                  <p className="flex-1 truncate text-sm font-semibold text-white/90">
                    {deal.title}
                  </p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer sponsored nofollow"
                    onClick={() => analytics.ctaClick(deal.id, url)}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/15 hover:text-white"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
                  </a>
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/70 transition hover:bg-white/15 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <iframe
                  src={url}
                  title={`${deal.title} — sales page`}
                  allow="autoplay; fullscreen; payment; clipboard-write; encrypted-media; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full flex-1 border-0 bg-white"
                />
              </>
            ) : (
              <>
                {/* Close */}
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md transition hover:bg-black/80"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Header */}
                <div className="shrink-0 border-b border-white/10 px-6 py-5 sm:px-8">
                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-violet-300">
                    Lifetime Deal · JVZoo Checkout
                  </p>
                  <h3 className="mt-1.5 font-display text-xl font-bold leading-tight text-white sm:text-2xl">
                    {deal.title}
                    {mode === "bundle" && (
                      <span className="ml-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 align-middle text-[11px] font-bold uppercase tracking-wider text-amber-200">
                        Bundle
                      </span>
                    )}
                    {mode === "upsell" && (
                      <span className="ml-2 rounded-full border border-violet-400/40 bg-violet-500/15 px-2.5 py-0.5 align-middle text-[11px] font-bold uppercase tracking-wider text-violet-200">
                        Upgrade
                      </span>
                    )}
                  </h3>
                  <p className="mt-1.5 text-sm text-white/70">
                    {mode === "bundle" && deal.bundle_price != null ? (
                      <>
                        <span className="font-display text-2xl font-extrabold text-amber-300">
                          {formatPrice(deal.bundle_price, deal.currency)}
                        </span>
                        <span className="ml-2 text-xs font-semibold text-white/50">
                          one-time · everything in the bundle
                        </span>
                      </>
                    ) : mode === "upsell" ? (
                      <span className="text-sm font-semibold text-white/85">
                        {linkLabel ?? "Additional upgrade tier"}
                      </span>
                    ) : (
                      <>
                        {deal.price != null && (
                          <>
                            <span className="font-display text-2xl font-extrabold text-gradient">
                              {formatPrice(deal.price, deal.currency)}
                            </span>
                            {deal.original_price != null &&
                              deal.original_price > (deal.price ?? 0) && (
                                <span className="ml-2 text-sm text-white/40 line-through">
                                  {formatPrice(deal.original_price, deal.currency)}
                                </span>
                              )}
                          </>
                        )}
                        <span className="ml-2 text-xs font-semibold text-white/50">
                          one-time · lifetime access
                        </span>
                      </>
                    )}
                  </p>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 sm:px-8">
                  <p className="text-sm leading-relaxed text-white/75">
                    The official sales page opens right here in a secure
                    JVZoo checkout — no leaving this review.
                  </p>

                  {/* CTA */}
                  <button
                    onClick={openSales}
                    className="group mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-500 px-6 py-4 text-lg font-bold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.99] cta-glow"
                  >
                    Open Secure JVZoo Checkout
                    <ArrowUpRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer sponsored nofollow"
                    onClick={() => analytics.ctaClick(deal.id, url)}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-white/60 transition hover:text-white"
                  >
                    Or open in a new tab <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <p className="mt-2 text-center text-[11px] text-white/40">
                    Official affiliate links — we may earn a commission at no
                    extra cost to you.
                  </p>
                </div>

                {/* Related deals */}
                {related.length > 0 && (
                  <div className="shrink-0 border-t border-white/10 bg-[#0d1226]/60 px-6 py-4 sm:px-8">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">
                      More lifetime deals to explore
                    </p>
                    <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                      {related.slice(0, 3).map((d) => (
                        <Link
                          key={d.id}
                          href={`/deals/${d.slug}`}
                          onClick={onClose}
                          className="group flex items-center gap-2.5 rounded-xl border border-white/10 bg-panel p-2.5 transition hover:border-violet-400/40"
                        >
                          {d.hero_image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={d.hero_image}
                              alt={d.title}
                              className="h-10 w-16 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[9px] text-white/30">
                              {d.title.slice(0, 18)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-white group-hover:text-violet-200">
                              {d.title}
                            </p>
                            <p className="text-[11px] text-white/45">
                              {formatPrice(d.price, d.currency)}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
