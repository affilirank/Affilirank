"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, ChevronLeft } from "lucide-react";
import type { Deal } from "@/lib/types";
import { useStream } from "@/components/stream-provider";
import { useInView } from "@/hooks/use-in-view";
import { VideoPlayer } from "@/components/video-player";
import { ActionBar } from "@/components/action-bar";
import { CountdownTimer } from "@/components/countdown-timer";
import { ShareModal } from "@/components/share-modal";
import {
  categoryLabel,
  discountPercent,
  formatPrice,
  cn,
  isExpired,
} from "@/lib/utils";

const TAG_STYLES: Record<string, string> = {
  hot: "bg-gradient-to-r from-rose-500 to-orange-400 text-white",
  popular: "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white",
  lifetime: "bg-gradient-to-r from-cyan-500 to-blue-500 text-white",
  new: "bg-gradient-to-r from-emerald-500 to-teal-400 text-white",
};

function HotTag({ deal }: { deal: Deal }) {
  const styles = TAG_STYLES[deal.tag_style ?? "hot"] ?? TAG_STYLES.hot;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-lg",
        styles
      )}
    >
      {deal.deal_tag ?? "Deal"}
    </span>
  );
}

/**
 * One full-screen deal in the snap-scrolling stream.
 */
export function DealCard({
  deal,
  standalone = false,
}: {
  deal: Deal;
  standalone?: boolean;
}) {
  const { openDeal, setCurrentDeal, proVideo } = useStream();
  const { ref, inView } = useInView<HTMLDivElement>(0.65);
  const [shareOpen, setShareOpen] = useState(false);

  // Surface the currently-visible deal (used by the exit-intent popup).
  useEffect(() => {
    if (inView) setCurrentDeal(deal);
  }, [inView, deal, setCurrentDeal]);

  const percent = discountPercent(deal.original_price, deal.price);
  const expired = isExpired(deal.expiration_date) && deal.countdown_enabled;

  return (
    <section
      ref={ref}
      data-deal-id={deal.id}
      className={cn(
        "relative h-full w-full snap-start overflow-hidden bg-black",
        standalone && "min-h-[100svh]"
      )}
    >
      {/* Background VSL — clicking the video opens the details modal */}
      <button
        onClick={() => openDeal(deal)}
        aria-label={`Open ${deal.title} details`}
        className="absolute inset-0 z-0 block h-full w-full cursor-pointer"
        tabIndex={-1}
      >
        <VideoPlayer deal={deal} inView={inView} proVideo={proVideo} />
      </button>

      {/* Category chip — top left */}
      <div className="pointer-events-none absolute left-4 top-16 z-20 sm:left-6 sm:top-20">
        <span className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/85">
          {categoryLabel(deal.category)}
        </span>
      </div>

      {/* Right action rail */}
      <div className="absolute right-3 top-1/2 z-30 -translate-y-1/2 sm:right-5">
        <ActionBar deal={deal} onShare={() => setShareOpen(true)} />
      </div>

      {/* Bottom content */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-8 sm:px-8 sm:pb-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: inView ? 1 : 0.4, y: inView ? 0 : 24 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="pointer-events-auto max-w-2xl"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <HotTag deal={deal} />
            {percent && (
              <span className="rounded-full border border-white/15 bg-black/45 px-3 py-1 text-xs font-bold text-emerald-300 backdrop-blur-md">
                {percent}% off
              </span>
            )}
          </div>

          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-lg sm:text-5xl">
            {deal.title}
          </h1>
          {deal.subtitle && (
            <p className="mt-2 max-w-xl text-sm font-medium text-white/85 drop-shadow sm:text-lg">
              {deal.subtitle}
            </p>
          )}

          {/* Price row */}
          <div className="mt-3 flex items-baseline gap-2.5">
            {deal.price != null && (
              <span className="font-display text-2xl font-bold text-gradient sm:text-3xl">
                {formatPrice(deal.price, deal.currency)}
              </span>
            )}
            {deal.original_price != null &&
              deal.original_price > (deal.price ?? 0) && (
                <span className="text-base font-medium text-white/50 line-through sm:text-lg">
                  {formatPrice(deal.original_price, deal.currency)}
                </span>
              )}
          </div>

          {/* Countdown */}
          {deal.countdown_enabled && deal.expiration_date && !expired && (
            <div className="mt-4">
              <CountdownTimer
                expirationDate={deal.expiration_date}
                className="[&>div]:flex-col"
              />
            </div>
          )}

          {/* CTA */}
          <button
            onClick={() => openDeal(deal)}
            className="group mt-6 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-500 px-6 py-3.5 text-base font-bold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98] cta-glow"
          >
            View Deal & Details
            <ArrowUpRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>

          {standalone && (
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-white/70 transition hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" /> Back to the deal stream
            </Link>
          )}
        </motion.div>
      </div>

      {shareOpen && (
        <ShareModal deal={deal} onClose={() => setShareOpen(false)} onCopied={() => {}} />
      )}
    </section>
  );
}
