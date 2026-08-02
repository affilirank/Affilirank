"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, Share2, Check, Ticket } from "lucide-react";
import type { Deal } from "@/lib/types";
import { useStream } from "@/components/stream-provider";
import { analytics } from "@/lib/analytics";

function ActionButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick?: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="group flex flex-col items-center gap-1.5"
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-200 ${
          active
            ? "border-violet-400/60 bg-violet-500/25 text-violet-200"
            : "border-white/15 bg-black/45 text-white group-hover:border-violet-400/50 group-hover:bg-violet-500/20 group-hover:text-white"
        }`}
      >
        {children}
      </span>
      <span className="text-[10px] font-semibold text-white/80 drop-shadow">
        {label}
      </span>
    </button>
  );
}

/**
 * Right-side action rail: Save Deal / Share Link / Copy Coupon.
 */
export function ActionBar({
  deal,
  onShare,
}: {
  deal: Deal;
  onShare: () => void;
}) {
  const { saved, toggleSaved, showToast } = useStream();
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const isSaved = saved.has(deal.id);

  const copyCoupon = async () => {
    const code = deal.coupon_code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopiedCoupon(true);
    analytics.copyCoupon(deal.id);
    showToast(`Coupon ${code} copied — apply at checkout`);
    setTimeout(() => setCopiedCoupon(false), 1800);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <ActionButton
        label={isSaved ? "Saved" : "Save Deal"}
        active={isSaved}
        onClick={() => {
          toggleSaved(deal);
          showToast(isSaved ? "Removed from saved" : "Deal saved");
        }}
      >
        {isSaved ? (
          <BookmarkCheck className="h-5 w-5" />
        ) : (
          <Bookmark className="h-5 w-5" />
        )}
      </ActionButton>

      <ActionButton label="Share Link" onClick={onShare}>
        <Share2 className="h-5 w-5" />
      </ActionButton>

      {deal.coupon_code && (
        <ActionButton
          label="Copy Coupon"
          active={copiedCoupon}
          onClick={copyCoupon}
        >
          {copiedCoupon ? (
            <Check className="h-5 w-5" />
          ) : (
            <Ticket className="h-5 w-5" />
          )}
        </ActionButton>
      )}
    </div>
  );
}
