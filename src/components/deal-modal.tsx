"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowUpRight,
  Check,
  ExternalLink,
  BadgeCheck,
  Flame,
  ChevronLeft,
} from "lucide-react";
import { useStream } from "@/components/stream-provider";
import { CountdownTimer } from "@/components/countdown-timer";
import { analytics } from "@/lib/analytics";
import {
  categoryLabel,
  discountPercent,
  formatPrice,
  isExpired,
  cn,
} from "@/lib/utils";

/**
 * Full-screen deal modal — the high-converting "enriched summary frame".
 * Opens over the stream (which keeps its scroll position), shows the product,
 * a live countdown and a primary CTA that pops the REAL JVZoo sales page
 * (via the affiliate link) into the modal as an iframe. The sales page can
 * also be opened in a new tab.
 */
export function DealModal() {
  const { activeDeal: deal, closeDeal } = useStream();
  const [view, setView] = useState<"details" | "sales">("details");

  // Reset to the details view whenever a new deal opens.
  useEffect(() => {
    if (deal?.id) setView("details");
  }, [deal?.id]);

  useEffect(() => {
    if (!deal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (view === "sales") setView("details");
        else closeDeal();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deal, closeDeal, view]);

  const goSales = () => {
    if (!deal) return;
    analytics.ctaClick(deal.id, deal.affiliate_url);
    setView("sales");
  };

  return (
    <AnimatePresence>
      {deal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/85 backdrop-blur-md sm:items-center"
          onClick={closeDeal}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className={cn(
              "relative flex h-[92svh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-abyss shadow-2xl shadow-violet-900/40 sm:h-[88svh] sm:rounded-3xl",
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
                    <ChevronLeft className="h-4 w-4" /> Details
                  </button>
                  <p className="flex-1 truncate text-sm font-semibold text-white/90">
                    {deal.title}
                  </p>
                  <a
                    href={deal.affiliate_url}
                    target="_blank"
                    rel="noopener noreferrer sponsored nofollow"
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/15 hover:text-white"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
                  </a>
                  <button
                    onClick={closeDeal}
                    aria-label="Close"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/70 transition hover:bg-white/15 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <iframe
                  src={deal.affiliate_url}
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
                  onClick={closeDeal}
                  aria-label="Close deal details"
                  className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md transition hover:bg-black/80"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Hero header */}
                <div className="relative h-44 w-full shrink-0 overflow-hidden sm:h-56">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={deal.hero_image ?? "/logo.svg"}
                    alt={deal.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/40 to-transparent" />
                  <div className="absolute left-4 top-4 z-10">
                    <span className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/90">
                      {categoryLabel(deal.category)}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 pb-5 pt-2 sm:px-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/40 bg-violet-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-violet-200">
                      <Flame className="h-3 w-3" />
                      {deal.deal_tag ?? "Limited Time"}
                    </span>
                    {discountPercent(deal.original_price, deal.price) && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                        {discountPercent(deal.original_price, deal.price)}% OFF
                      </span>
                    )}
                  </div>

                  <h2 className="mt-3 font-display text-2xl font-bold leading-tight text-white sm:text-3xl">
                    {deal.title}
                  </h2>
                  {deal.subtitle && (
                    <p className="mt-1.5 text-sm font-medium text-white/70">
                      {deal.subtitle}
                    </p>
                  )}

                  {/* Price */}
                  <div className="mt-4 flex items-baseline gap-3">
                    {deal.price != null && (
                      <span className="font-display text-4xl font-extrabold text-gradient">
                        {formatPrice(deal.price, deal.currency)}
                      </span>
                    )}
                    {deal.original_price != null &&
                      deal.original_price > (deal.price ?? 0) && (
                        <span className="text-xl font-medium text-white/40 line-through">
                          {formatPrice(deal.original_price, deal.currency)}
                        </span>
                      )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70">
                      <BadgeCheck className="h-3.5 w-3.5 text-cyan-300" />
                      One-time · Lifetime
                    </span>
                  </div>

                  {/* Countdown */}
                  {deal.countdown_enabled &&
                    deal.expiration_date &&
                    !isExpired(deal.expiration_date) && (
                      <div className="mt-4">
                        <CountdownTimer
                          expirationDate={deal.expiration_date}
                          className="[&>div:first-child]:flex-row [&>div:first-child]:items-center"
                        />
                      </div>
                    )}

                  {/* Highlights */}
                  {deal.highlights && deal.highlights.length > 0 && (
                    <ul className="mt-5 space-y-2.5">
                      {deal.highlights.map((h, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 text-sm text-white/85"
                        >
                          <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-cyan-400/20">
                            <Check className="h-3 w-3 text-cyan-300" />
                          </span>
                          {h}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Description */}
                  {deal.description && (
                    <p className="mt-5 text-sm leading-relaxed text-white/75">
                      {deal.description}
                    </p>
                  )}

                  {/* Coupon */}
                  {deal.coupon_code && (
                    <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-cyan-400/40 bg-cyan-400/5 px-4 py-3">
                      <div className="text-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                          Coupon code
                        </p>
                        <p className="font-mono text-base font-bold text-white">
                          {deal.coupon_code}
                        </p>
                      </div>
                      <span className="rounded-full bg-cyan-400/20 px-3 py-1 text-[11px] font-bold text-cyan-200">
                        Apply at checkout
                      </span>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="sticky bottom-0 -mx-5 mt-7 bg-gradient-to-t from-abyss via-abyss/95 to-transparent px-5 pb-2 pt-6 sm:-mx-8 sm:px-8">
                    <button
                      onClick={goSales}
                      className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-500 px-6 py-4 text-lg font-bold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.99] cta-glow"
                    >
                      Watch Sales Video & Get the Deal
                      <ArrowUpRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </button>
                    {deal.source_url && (
                      <a
                        href={deal.affiliate_url}
                        target="_blank"
                        rel="noopener noreferrer sponsored nofollow"
                        onClick={() =>
                          analytics.ctaClick(deal.id, deal.affiliate_url)
                        }
                        className="mt-2.5 flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-white/60 transition hover:text-white"
                      >
                        Open sales page in a new tab{" "}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
