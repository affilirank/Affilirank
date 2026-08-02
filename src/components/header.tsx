"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, SlidersHorizontal, Settings, Newspaper, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { useStream } from "@/components/stream-provider";
import { CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STREAM_SELECTOR = "#stream-scroller";

/**
 * Floating, semi-transparent header with:
 *  - brand logo (top-left)
 *  - live keyword search
 *  - category filter chips
 *  - hidden on scroll-down, revealed on scroll-up so the video stays immersive.
 */
export function Header() {
  const { filters, setQuery, setCategory, clearFilters } = useStream();
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);
  const hidden = filters.query.trim().length > 0 || filters.category !== null;

  useEffect(() => {
    const el = document.querySelector(STREAM_SELECTOR);
    if (!el) return;
    const onScroll = () => {
      const y = el.scrollTop;
      const delta = y - lastY.current;
      if (delta > 4 && y > 90) setVisible(false);
      else if (delta < -4 || y < 90) setVisible(true);
      lastY.current = y;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.header
          initial={{ y: -90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -90, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#0a0f1e]/95 shadow-lg shadow-black/40 backdrop-blur-xl"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex items-center gap-3 py-3">
              <Link href="/" className="shrink-0">
                <span className="hidden sm:inline-flex">
                  <Logo size={38} withWordmark />
                </span>
                <span className="sm:hidden">
                  <Logo size={34} />
                </span>
              </Link>

              {/* Search */}
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  type="search"
                  value={filters.query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search lifetime deals…"
                  className="h-10 w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-9 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/30"
                />
                {filters.query && (
                  <button
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-1 text-white/70 hover:bg-white/20"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Blog */}
              <Link
                href="/blog"
                aria-label="Blog — lifetime deal reviews"
                title="Lifetime deal reviews & guides"
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 px-3 text-white/60 transition hover:border-violet-400/50 hover:text-white"
              >
                <Newspaper className="h-4.5 w-4.5" />
                <span className="hidden text-sm font-semibold md:inline">
                  Blog
                </span>
              </Link>

              {/* About the product / VSL */}
              <Link
                href="/affilirank"
                aria-label="About this software"
                title="About this software"
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 px-3 text-white/60 transition hover:border-violet-400/50 hover:text-white"
              >
                <Sparkles className="h-4.5 w-4.5" />
                <span className="hidden text-sm font-semibold md:inline">
                  Get this
                </span>
              </Link>

              {/* Admin */}
              <a
                href="/admin"
                aria-label="Admin dashboard"
                title="Admin dashboard"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-white/60 transition hover:border-violet-400/50 hover:text-white"
              >
                <Settings className="h-4.5 w-4.5" />
              </a>
            </div>

            {/* Category chips */}
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-3">
              <button
                onClick={clearFilters}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                  !filters.category && !filters.query
                    ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg"
                    : "glass text-white/75 hover:text-white"
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                All Deals
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() =>
                    setCategory(filters.category === cat.slug ? null : cat.slug)
                  }
                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                    filters.category === cat.slug
                      ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg"
                      : "glass text-white/75 hover:text-white"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Active filter summary */}
            {hidden && (
              <div className="mt-1.5 flex items-center gap-2 text-[11px] font-medium text-white/50">
                Filtering:
                {filters.category && (
                  <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-violet-200">
                    {CATEGORIES.find((c) => c.slug === filters.category)?.label}
                  </span>
                )}
                {filters.query && (
                  <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-cyan-200">
                    “{filters.query}”
                  </span>
                )}
              </div>
            )}
          </div>
        </motion.header>
      )}
    </AnimatePresence>
  );
}
