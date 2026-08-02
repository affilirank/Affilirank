"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowUpRight, Gift, Zap } from "lucide-react";
import { useStream } from "@/components/stream-provider";
import { CountdownTimer } from "@/components/countdown-timer";
import { analytics } from "@/lib/analytics";
import { isExpired } from "@/lib/utils";

const SHOWN_FLAG = "ltd_exit_intent_shown";

/**
 * High-converting exit-intent popup. Fires once per session when the cursor
 * leaves toward the browser chrome (desktop) or when a mobile tab is hidden.
 */
export function ExitIntent() {
  const { deals, currentDeal, openDeal } = useStream();
  const [shown, setShown] = useState(false);
  const [open, setOpen] = useState(false);
  const armed = useRef(false);

  const deal = currentDeal ?? deals[0] ?? null;

  // Arm after a short delay so the popup never fires instantly.
  useEffect(() => {
    const t = setTimeout(() => {
      armed.current = true;
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!deal || typeof window === "undefined") return;

    const alreadyShown = localStorage.getItem(SHOWN_FLAG) === "1";

    const onMouseLeave = (e: MouseEvent) => {
      if (!armed.current || alreadyShown) return;
      if (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth) {
        trigger();
      }
    };

    const onVisibility = () => {
      if (!armed.current || alreadyShown) return;
      if (document.visibilityState === "hidden") trigger();
    };

    const trigger = () => {
      localStorage.setItem(SHOWN_FLAG, "1");
      setShown(true);
      setOpen(true);
      analytics.exitIntentShown(deal.id);
    };

    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!shown || !deal) return null;

  const expired = isExpired(deal.expiration_date) && deal.countdown_enabled;

  const handleCta = () => {
    analytics.exitIntentCta(deal.id);
    setOpen(false);
    openDeal(deal);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[75] flex items-center justify-center bg-black/80 p-5 backdrop-blur-md"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-abyss shadow-2xl shadow-violet-900/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* backdrop image */}
            <div className="relative h-44 w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={deal.hero_image ?? "/logo.svg"}
                alt={deal.title}
                className="h-full w-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/60 to-violet-900/30" />
              <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                <Zap className="h-3 w-3" /> Don&apos;t miss out
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md hover:bg-black/80"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white">
                  <Gift className="h-5.5 w-5.5" />
                </div>
                <h3 className="font-display text-xl font-bold leading-snug text-white">
                  Don&apos;t Miss Out on Today&apos;s Top Lifetime Deal
                </h3>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-white/70">
                <span className="font-semibold text-white">{deal.title}</span> —{" "}
                {deal.subtitle ?? "one-time payment, lifetime access."} These
                offers don&apos;t come back.
              </p>

              {deal.countdown_enabled && deal.expiration_date && !expired && (
                <div className="mt-4 flex justify-center">
                  <CountdownTimer
                    expirationDate={deal.expiration_date}
                    className="[&>div]:flex-col"
                  />
                </div>
              )}

              <button
                onClick={handleCta}
                className="group mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-500 px-6 py-3.5 text-base font-bold text-white transition hover:brightness-110 active:scale-[0.99] cta-glow"
              >
                See the deal before it&apos;s gone
                <ArrowUpRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>

              <button
                onClick={() => setOpen(false)}
                className="mt-3 w-full text-center text-xs font-medium text-white/45 transition hover:text-white/75"
              >
                No thanks, I&apos;ll keep scrolling
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
