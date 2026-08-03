"use client";

import { useEffect, useRef, useState } from "react";

interface UseInViewOptions {
  /** Expand the observed viewport by this margin so signals fire *before* the element is on screen. */
  rootMargin?: string;
  /** Whether to check the intersectionRatio against the threshold (default true). */
  ratioCheck?: boolean;
}

/**
 * Returns a ref and whether the target element is ≥ `threshold` visible.
 * Pass a `rootMargin` (e.g. "400px 0px 400px 0px") to trigger early,
 * before the element actually enters the viewport.
 */
export function useInView<T extends Element>(
  threshold = 0.7,
  { rootMargin = "0px", ratioCheck = true }: UseInViewOptions = {}
) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (ratioCheck) {
            setInView(
              entry.isIntersecting && entry.intersectionRatio >= threshold
            );
          } else {
            setInView(entry.isIntersecting);
          }
        }
      },
      { threshold: ratioCheck ? threshold : 0, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, ratioCheck]);

  return { ref, inView };
}
