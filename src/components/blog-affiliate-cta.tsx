"use client";

import { useState } from "react";
import { Zap, ArrowRight, ChevronDown, ExternalLink } from "lucide-react";
import { BlogSalesModal } from "@/components/blog-sales-modal";
import { cn, discountPercent, formatPrice } from "@/lib/utils";
import type { Deal, FunnelLink } from "@/lib/types";

/**
 * Client-side blog CTA. The primary "Get X Now" button opens the JVZoo sales
 * page in an on-page modal (with related deals) instead of an external tab,
 * so visitors who arrive from YouTube stay on the blog. The deal stream only
 * surfaces the front-end + bundle tiers; here on the blog we expose EVERY link
 * from the vendor's JV document — FE, bundle and every upsell (OTOs, FastPass,
 * MegaBundle) — so reviewers can pick the exact tier that fits.
 */
export function BlogAffiliateCta({
  deal,
  label,
  related,
}: {
  deal: Deal;
  label: string;
  related: Deal[];
}) {
  const [open, setOpen] = useState(false);
  const [salesUrl, setSalesUrl] = useState<string>(deal.affiliate_url);
  const [mode, setMode] = useState<"fe" | "bundle" | "upsell">("fe");
  const [linkLabel, setLinkLabel] = useState<string>(label);
  const [showAll, setShowAll] = useState(false);
  const price = formatPrice(deal?.price, deal?.currency);
  const pct = discountPercent(
    deal?.original_price ?? null,
    deal?.price ?? null
  );
  const bundle = deal?.bundle_url && deal?.bundle_price != null;

  // Every link from the vendor's JV doc — the FE and bundle plus all upsells.
  const funnelLinks: FunnelLink[] = Array.isArray(deal?.funnel_links)
    ? (deal.funnel_links as FunnelLink[])
    : [];
  const extraLinks = funnelLinks.filter(
    (l) => l.url !== deal.affiliate_url && l.url !== deal.bundle_url
  );

  const openModal = (
    url: string,
    m: "fe" | "bundle" | "upsell",
    lbl?: string
  ) => {
    setSalesUrl(url);
    setMode(m);
    if (lbl) setLinkLabel(lbl);
    setOpen(true);
  };

  return (
    <>
      <div className="my-8 overflow-hidden rounded-3xl border border-violet-400/30 bg-gradient-to-br from-violet-600/15 via-panel to-cyan-500/10 p-6 text-center sm:p-8 cta-glow">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-violet-300">
          Lifetime Deal · One-Time Payment
        </p>
        {pct && (
          <p className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">
            <span className="text-gradient">{pct}% OFF</span>{" "}
            {price && (
              <>
                <span className="align-top text-lg text-white/40 line-through">
                  {formatPrice(deal?.original_price, deal?.currency)}
                </span>{" "}
                <span className="text-white">{price}</span>
              </>
            )}
          </p>
        )}
        {!pct && price && (
          <p className="mt-3 font-display text-3xl font-extrabold text-white">
            {price}{" "}
            <span className="text-base font-semibold text-white/50">
              one-time
            </span>
          </p>
        )}
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-white/60">
          Pay once, own it forever. No monthly fees, no renewals — includes all
          future updates.
        </p>

        {bundle ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => openModal(deal.affiliate_url, "fe")}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-500 px-6 py-3.5 text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.98]"
            >
              <Zap className="h-4 w-4" />
              {label}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => openModal(deal.bundle_url as string, "bundle")}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-6 py-3.5 text-sm font-bold text-amber-200 transition hover:bg-amber-400/20 active:scale-[0.98]"
            >
              <Zap className="h-4 w-4" />
              Get The Bundle · {formatPrice(deal.bundle_price, deal.currency)}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => openModal(deal.affiliate_url, "fe")}
            className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-500 px-7 py-3.5 text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.98]"
          >
            <Zap className="h-4 w-4" />
            {label}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
        {bundle && (
          <p className="mt-2 text-[11px] font-semibold text-amber-200/70">
            Front-end {price} · Bundle {formatPrice(deal.bundle_price, deal.currency)} — compare both before you buy
          </p>
        )}

        {extraLinks.length > 0 && (
          <div className="mt-5 border-t border-white/10 pt-4">
            <button
              onClick={() => setShowAll((s) => !s)}
              className="mx-auto flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/50 transition hover:text-white"
            >
              All purchase options from the JV doc
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform", showAll && "rotate-180")}
              />
            </button>
            {showAll && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {extraLinks.map((l, i) => (
                  <button
                    key={i}
                    onClick={() => openModal(l.url, "upsell", l.label)}
                    className="group flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-left text-xs font-semibold text-white/80 transition hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-white"
                  >
                    <span className="min-w-0 flex-1 truncate">{l.label}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/40 transition group-hover:text-violet-300" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="mt-3 text-[11px] text-white/40">
          Official affiliate links — we may earn a commission at no extra cost
          to you.
        </p>
      </div>
      <BlogSalesModal
        deal={deal}
        related={related}
        open={open}
        onClose={() => setOpen(false)}
        salesUrl={salesUrl}
        mode={mode}
        linkLabel={mode === "upsell" ? linkLabel : undefined}
      />
    </>
  );
}
