"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Deal, StreamFilters } from "@/lib/types";
import { analytics } from "@/lib/analytics";
import { useDealStream, useSavedDeals } from "@/hooks/use-deal-stream";

interface StreamContextValue {
  deals: Deal[];
  saved: Set<string>;
  toggleSaved: (deal: Deal) => void;
  filters: StreamFilters;
  setQuery: (q: string) => void;
  setCategory: (c: string | null) => void;
  clearFilters: () => void;
  activeDeal: Deal | null;
  openDeal: (deal: Deal) => void;
  closeDeal: () => void;
  currentDeal: Deal | null;
  setCurrentDeal: (deal: Deal | null) => void;
  showToast: (message: string) => void;
  toastMessage: string | null;
  proVideo: boolean;
}

const StreamContext = createContext<StreamContextValue | null>(null);

export function StreamProvider({
  initialDeals,
  features = [],
  children,
}: {
  initialDeals: Deal[];
  features?: string[];
  children: React.ReactNode;
}) {
  const { deals, refresh } = useDealStream(initialDeals);
  const { saved, toggle: rawToggle } = useSavedDeals();
  const proVideo = features.includes("pro-video");
  const [filters, setFilters] = useState<StreamFilters>({
    query: "",
    category: null,
  });
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [currentDeal, setCurrentDeal] = useState<Deal | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setQuery = useCallback((query: string) => {
    setFilters((f) => ({ ...f, query }));
    if (query.trim()) analytics.search(query);
  }, []);

  const setCategory = useCallback((category: string | null) => {
    setFilters((f) => ({ ...f, category }));
    analytics.filter(category);
  }, []);

  const clearFilters = useCallback(() => setFilters({ query: "", category: null }), []);

  const toggleSaved = useCallback(
    (deal: Deal) => {
      rawToggle(deal.id);
      analytics.saveDeal(deal.id, !saved.has(deal.id));
    },
    [rawToggle, saved]
  );

  const openDeal = useCallback((deal: Deal) => {
    setActiveDeal(deal);
    analytics.modalOpen(deal.id);
  }, []);

  const closeDeal = useCallback(() => {
    setActiveDeal((deal) => {
      if (deal) analytics.modalClose(deal.id);
      return null;
    });
  }, []);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), 2400);
  }, []);

  const value = useMemo<StreamContextValue>(
    () => ({
      deals,
      saved,
      toggleSaved,
      filters,
      setQuery,
      setCategory,
      clearFilters,
      activeDeal,
      openDeal,
      closeDeal,
      currentDeal,
      setCurrentDeal,
      showToast,
      toastMessage,
      proVideo,
    }),
    [
      deals,
      saved,
      toggleSaved,
      filters,
      setQuery,
      setCategory,
      clearFilters,
      activeDeal,
      openDeal,
      closeDeal,
      currentDeal,
      showToast,
      toastMessage,
      proVideo,
    ]
  );

  // Keep the provider useful even if nothing else consumes `refresh`.
  void refresh;

  return (
    <StreamContext.Provider value={value}>{children}</StreamContext.Provider>
  );
}

export function useStream() {
  const ctx = useContext(StreamContext);
  if (!ctx) throw new Error("useStream must be used within StreamProvider");
  return ctx;
}

/** Filters + sorts the stream's deals by the current query/category. */
export function useFilteredDeals(): Deal[] {
  const { deals, filters } = useStream();
  return useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const out = deals.filter((d) => {
      if (filters.category && d.category !== filters.category) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.subtitle?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q) ||
        d.category?.toLowerCase().includes(q)
      );
    });
    return out.sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.sort_order - b.sort_order;
    });
  }, [deals, filters]);
}
