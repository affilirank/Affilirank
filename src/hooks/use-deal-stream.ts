import { useCallback, useEffect, useRef, useState } from "react";
import type { Deal } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase";

/**
 * Keeps the deal stream live:
 *  - Polls `/api/products` every 45s (works everywhere).
 *  - When Supabase is configured, subscribes to realtime changes on the
 *    `products` table so publishing from /admin updates open tabs instantly.
 */
export function useDealStream(initial: Deal[]) {
  const [deals, setDeals] = useState<Deal[]>(initial);
  const initialRef = useRef(initial);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as Deal[];
        setDeals(data);
      }
    } catch {
      // keep current list on transient network errors
    }
  }, []);

  useEffect(() => {
    setDeals(initialRef.current);
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, 45_000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const client = createSupabaseBrowserClient();
    if (!client) return;

    const channel = client
      .channel("deals-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => refresh()
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [refresh]);

  return { deals, refresh };
}

export function useSavedDeals() {
  const [saved, setSaved] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem("ltd_saved") || "[]"));
    } catch {
      return new Set();
    }
  });

  const toggle = useCallback((id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem("ltd_saved", JSON.stringify([...next]));
      } catch {
        // storage unavailable
      }
      return next;
    });
  }, []);

  return { saved, toggle };
}
