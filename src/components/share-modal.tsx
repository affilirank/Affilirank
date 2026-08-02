"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Link2, Check, Send, MessageCircle } from "lucide-react";
import type { Deal } from "@/lib/types";
import { SHARE_BASE_URL } from "@/lib/constants";
import { analytics } from "@/lib/analytics";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

/**
 * Share sheet — native share (mobile), plus direct links for X, Facebook,
 * WhatsApp and a plain copy-link action.
 */
export function ShareModal({
  deal,
  onClose,
  onCopied,
}: {
  deal: Deal;
  onClose: () => void;
  onCopied: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${SHARE_BASE_URL}/${deal.slug}`;
  const text = encodeURIComponent(
    `🔥 ${deal.title} — ${deal.subtitle ?? "Lifetime deal"} on AffiliRank`
  );
  const encodedUrl = encodeURIComponent(shareUrl);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    analytics.shareDeal(deal.id, shareUrl, "clipboard");
    onCopied();
    setTimeout(() => setCopied(false), 1800);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: deal.title,
          text: deal.subtitle ?? `${deal.title} lifetime deal`,
          url: shareUrl,
        });
        analytics.shareDeal(deal.id, shareUrl, "native");
      } catch {
        // user cancelled
      }
      return;
    }
    copyLink();
  };

  const links = [
    { label: "X / Twitter", href: `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`, Icon: XIcon },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, Icon: FacebookIcon },
    { label: "WhatsApp", href: `https://wa.me/?text=${text}%20${encodedUrl}`, Icon: MessageCircle },
    { label: "Telegram", href: `https://t.me/share/url?url=${encodedUrl}&text=${text}`, Icon: Send },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="w-full max-w-md rounded-t-3xl glass p-6 pb-8 sm:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-white">
              Share “{deal.title}”
            </h3>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleNativeShare}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-3 font-semibold text-white cta-glow transition hover:brightness-110"
          >
            {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            {copied ? "Link copied!" : "Copy deal link"}
          </button>

          <div className="grid grid-cols-4 gap-3">
            {links.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 rounded-2xl bg-white/5 px-2 py-3 text-xs font-medium text-white/85 transition hover:bg-white/10"
                onClick={() => analytics.shareDeal(deal.id, shareUrl, label.toLowerCase())}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-400/30 text-white">
                  <Icon className="h-5 w-5" />
                </span>
                {label}
              </a>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
