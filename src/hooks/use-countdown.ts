"use client";

import { useEffect, useMemo, useState } from "react";

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function diff(targetIso: string, now: number): CountdownParts {
  const target = new Date(targetIso).getTime();
  const delta = Math.max(0, target - now);
  return {
    days: Math.floor(delta / 86_400_000),
    hours: Math.floor((delta % 86_400_000) / 3_600_000),
    minutes: Math.floor((delta % 3_600_000) / 60_000),
    seconds: Math.floor((delta % 60_000) / 1000),
    expired: delta <= 0,
  };
}

/** Ticking countdown for a deal's expiration date. */
export function useCountdown(expirationIso: string | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return useMemo(
    () => (expirationIso ? diff(expirationIso, now) : null),
    [expirationIso, now]
  );
}
