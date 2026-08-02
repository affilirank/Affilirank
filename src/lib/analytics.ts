"use client";

import { ANALYTICS_EVENTS } from "@/lib/constants";

/**
 * Lightweight analytics facade. Fires events to Google Analytics 4 (`gtag`)
 * and Meta Pixel (`fbq`) when their IDs are configured, and also records the
 * event in the `deal_events` table via the API when Supabase is enabled.
 * Safe no-ops everywhere else.
 */

type GtagWindow = Window & {
  gtag?: (cmd: string, action: string, params?: Record<string, unknown>) => void;
  fbq?: (cmd: string, action: string, params?: Record<string, unknown>) => void;
  dataLayer?: unknown[];
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function trackEvent(
  event: string,
  data: Record<string, unknown> = {}
) {
  if (!isBrowser()) return;
  const w = window as GtagWindow;

  if (w.gtag) {
    w.gtag("event", event, data);
  }
  if (w.fbq) {
    w.fbq("trackCustom", event, data);
  }

  // Fire-and-forget persistence to the events table (best effort).
  try {
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, data }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}

export const analytics = {
  ctaClick: (dealId: string, url: string) =>
    trackEvent(ANALYTICS_EVENTS.CTA_CLICK, { deal_id: dealId, url }),
  modalOpen: (dealId: string) =>
    trackEvent(ANALYTICS_EVENTS.MODAL_OPEN, { deal_id: dealId }),
  modalClose: (dealId: string) =>
    trackEvent(ANALYTICS_EVENTS.MODAL_CLOSE, { deal_id: dealId }),
  videoMilestone: (dealId: string, percent: number) =>
    trackEvent(ANALYTICS_EVENTS.VIDEO_MILESTONE, { deal_id: dealId, percent }),
  saveDeal: (dealId: string, saved: boolean) =>
    trackEvent(saved ? ANALYTICS_EVENTS.SAVE_DEAL : ANALYTICS_EVENTS.UNSAVE_DEAL, {
      deal_id: dealId,
    }),
  shareDeal: (dealId: string, url: string, method: string) =>
    trackEvent(ANALYTICS_EVENTS.SHARE_DEAL, { deal_id: dealId, url, method }),
  copyCoupon: (dealId: string) =>
    trackEvent(ANALYTICS_EVENTS.COPY_COUPON, { deal_id: dealId }),
  exitIntentShown: (dealId: string | null) =>
    trackEvent(ANALYTICS_EVENTS.EXIT_INTENT_SHOWN, { deal_id: dealId }),
  exitIntentCta: (dealId: string | null) =>
    trackEvent(ANALYTICS_EVENTS.EXIT_INTENT_CTA, { deal_id: dealId }),
  search: (query: string) =>
    trackEvent(ANALYTICS_EVENTS.SEARCH, { query }),
  filter: (category: string | null) =>
    trackEvent(ANALYTICS_EVENTS.FILTER, { category }),
};
