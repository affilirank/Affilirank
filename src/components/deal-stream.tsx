"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, SearchX } from "lucide-react";
import type { Deal } from "@/lib/types";
import { DealCard } from "@/components/deal-card";
import { DealModal } from "@/components/deal-modal";
import { Header } from "@/components/header";
import { IntroSection } from "@/components/intro-section";
import { ExitIntent } from "@/components/exit-intent";
import { Toast } from "@/components/toast";
import {
  StreamProvider,
  useFilteredDeals,
  useStream,
} from "@/components/stream-provider";

/**
 * The TikTok/Reels-style vertical snap-scrolling deal stream.
 */
export function DealStream({
  initialDeals,
  exitIntent,
  features,
}: {
  initialDeals: Deal[];
  exitIntent: boolean;
  features?: string[];
}) {
  return (
    <StreamProvider initialDeals={initialDeals} features={features}>
      <StreamInner exitIntent={exitIntent} />
    </StreamProvider>
  );
}

function StreamInner({ exitIntent }: { exitIntent: boolean }) {
  const deals = useFilteredDeals();
  const { clearFilters, filters } = useStream();
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 5200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative h-[100svh] w-full overflow-hidden bg-void">
      <Header />

      {/* Snap scroll viewport */}
      <div
        id="stream-scroller"
        className="no-scrollbar h-full w-full snap-y snap-mandatory overflow-y-scroll scroll-smooth"
      >
        {!filters.query && !filters.category && <IntroSection />}
        {deals.length > 0 ? (
          deals.map((deal) => <DealCard key={deal.id} deal={deal} />)
        ) : (
          <EmptyState
            hasFilters={!!filters.query || !!filters.category}
            onClear={clearFilters}
          />
        )}
      </div>

      {/* "Swipe up" hint */}
      <AnimatePresence>
        {showHint && deals.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-1 text-white/70"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em]">
              Swipe to explore
            </span>
            <ChevronDown className="h-5 w-5 animate-bounce" />
          </motion.div>
        )}
      </AnimatePresence>

      <DealModal />
      {exitIntent && <ExitIntent />}
      <Toast />
    </div>
  );
}

function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex h-full w-full snap-start flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl glass">
        <SearchX className="h-7 w-7 text-white/60" />
      </div>
      <h2 className="font-display text-xl font-bold text-white">
        {hasFilters ? "No deals match your filters" : "No deals yet"}
      </h2>
      <p className="max-w-sm text-sm text-white/55">
        {hasFilters
          ? "Try a different keyword or category — or clear the filters to see everything."
          : "The admin dashboard publishes new lifetime deals here instantly."}
      </p>
      {hasFilters && (
        <button
          onClick={onClear}
          className="mt-2 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 cta-glow"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
