"use client";

import { Timer } from "lucide-react";
import { useCountdown } from "@/hooks/use-countdown";
import { cn } from "@/lib/utils";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Live countdown timer for flash sales. Renders a compact pill with a
 * pulsing glow; turns red and reads "Ended" once expired.
 */
export function CountdownTimer({
  expirationDate,
  enabled = true,
  compact = false,
  className,
}: {
  expirationDate: string;
  enabled?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const cd = useCountdown(enabled ? expirationDate : null);

  if (!cd) return null;

  if (cd.expired) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-300 backdrop-blur-md",
          className
        )}
      >
        <Timer className="h-3.5 w-3.5" />
        Deal ended
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-black/50 px-3 py-1 font-mono text-xs font-semibold text-cyan-200 backdrop-blur-md",
          className
        )}
      >
        <Timer className="h-3.5 w-3.5 animate-pulse text-cyan-300" />
        {cd.days > 0 && `${cd.days}d `}
        {pad(cd.hours)}:{pad(cd.minutes)}:{pad(cd.seconds)}
      </div>
    );
  }

  const cells = [
    { label: "Days", value: cd.days },
    { label: "Hrs", value: pad(cd.hours) },
    { label: "Min", value: pad(cd.minutes) },
    { label: "Sec", value: pad(cd.seconds) },
  ];

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-200/80">
        <Timer className="h-3 w-3 animate-pulse text-cyan-300" />
        {cd.days === 0 ? "Ends in" : "Limited time"}
      </div>
      <div className="flex items-center gap-1.5">
        {cells.map((c, i) => (
          <div key={c.label} className="flex items-center gap-1.5">
            <div className="flex min-w-12 flex-col items-center rounded-xl border border-cyan-400/25 bg-black/55 px-2 py-1.5 backdrop-blur-md">
              <span className="font-mono text-lg font-bold tabular-nums text-white">
                {c.value}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-white/50">
                {c.label}
              </span>
            </div>
            {i < cells.length - 1 && (
              <span className="font-mono text-lg font-bold text-cyan-300/70">
                :
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
