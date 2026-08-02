"use client";

import { motion } from "framer-motion";
import {
  ArrowDown,
  BadgeCheck,
  CreditCard,
  Percent,
  Zap,
  HeartHandshake,
} from "lucide-react";
import { Logo } from "@/components/logo";

const PILLARS = [
  {
    icon: CreditCard,
    title: "One-Time Payment",
    desc: "Pay once and own it forever — no monthly bills, no surprise renewals.",
  },
  {
    icon: BadgeCheck,
    title: "Hand-Picked & Verified",
    desc: "Every tool is vetted by our team before it ever reaches the stream.",
  },
  {
    icon: Percent,
    title: "Save Up to 90%",
    desc: "Lifetime licenses at a fraction of the regular retail price.",
  },
  {
    icon: Zap,
    title: "Instant Access",
    desc: "Redeem today and start growing your business the very same day.",
  },
];

/**
 * First snap-screen of the stream: introduces the site, what it offers and
 * why we love helping businesses thrive with the best one-time-payment tools.
 */
export function IntroSection() {
  const scrollToDeals = () => {
    const el = document.querySelector("#stream-scroller");
    if (el) el.scrollTo({ top: window.innerHeight, behavior: "smooth" });
  };

  return (
    <section className="relative h-full w-full snap-start overflow-hidden bg-void">
      {/* ambient neon background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-5%,rgba(124,58,237,0.28),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_110%,rgba(34,211,238,0.14),transparent_60%)]" />

      <div className="no-scrollbar relative z-10 flex h-full w-full flex-col items-center justify-center gap-5 overflow-y-auto px-5 py-14 text-center sm:gap-6 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <Logo size={64} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-violet-300/90">
            Curated · Verified · Lifetime
          </span>
          <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-white sm:text-5xl">
            Best Lifetime Software Deals,{" "}
            <span className="text-gradient">One Payment. Forever.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
            We hunt down the best one-time-payment business tools so you can
            grow faster — and keep more of your money. No subscriptions,
            no recurring fees, no fine print.
          </p>
        </motion.div>

        {/* Why we love */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.16 }}
          className="flex max-w-2xl items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-sm sm:px-5"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500">
            <HeartHandshake className="h-4.5 w-4.5 text-white" />
          </span>
          <p className="text-left text-xs leading-relaxed text-white/70 sm:text-sm">
            <span className="font-semibold text-white">Why we love it:</span>{" "}
            we&apos;ve watched small businesses thrive when they get world-class
            tools at a fair price — and that&apos;s exactly what we&apos;re here
            to help you do.
          </p>
        </motion.div>

        {/* Value pillars */}
        <div className="grid w-full max-w-3xl grid-cols-2 gap-3">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.24 + i * 0.07 }}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left backdrop-blur-sm transition hover:border-violet-400/40 sm:p-5"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/90 to-cyan-500/90">
                <p.icon className="h-4.5 w-4.5 text-white" />
              </span>
              <h3 className="mt-2.5 font-display text-sm font-bold text-white sm:text-base">
                {p.title}
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-white/60 sm:text-xs">
                {p.desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.5 }}
          onClick={scrollToDeals}
          className="group flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-500 px-7 py-3.5 text-base font-bold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98] cta-glow"
        >
          Start Exploring
          <ArrowDown className="h-5 w-5 transition-transform group-hover:translate-y-0.5" />
        </motion.button>
      </div>
    </section>
  );
}
