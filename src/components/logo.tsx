import { cn } from "@/lib/utils";
import { SITE_NAME, SITE_BRAND_TAG, SITE_LOGO_URL, SHOW_PRODUCT_PAGE } from "@/lib/constants";

/**
 * Brand logo.
 *
 * Concept: an infinite loop (lifetime / forever) merged with a play button
 * (video sales letters) and a subtle stacked "bundle" of gift boxes tucked
 * into the lower crossing — lifetime software deals + VSLs.
 *
 * Electric purple → cyan gradient on dark, neon-glow drop shadow.
 */
export function Logo({
  size = 32,
  className,
  withWordmark = false,
}: {
  size?: number;
  className?: string;
  withWordmark?: boolean;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-2.5 select-none", className)}
      aria-label={SITE_NAME}
    >
      {SITE_LOGO_URL ? (
        // Reseller-provided logo — replaces the built-in mark everywhere.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={SITE_LOGO_URL}
          alt=""
          aria-hidden
          width={size}
          height={size}
          style={{ width: size, height: size }}
          className="shrink-0 rounded-lg object-contain"
        />
      ) : !SHOW_PRODUCT_PAGE ? (
        // White-label: blank logo slot so resellers can make it their own.
        <span
          aria-hidden
          style={{ width: size, height: size }}
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-dashed border-white/30 bg-white/5"
        >
          <span className="px-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-white/40">
            Your logo
          </span>
        </span>
      ) : (
        <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ltd-grad" x1="0" y1="0" x2="64" y2="64">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="55%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id="ltd-grad-bright" x1="0" y1="0" x2="64" y2="64">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#67e8f9" />
          </linearGradient>
        </defs>

        {/* glow underlay */}
        <path
          d="M27 17a15 15 0 1 0 10 0"
          stroke="url(#ltd-grad)"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
          opacity="0.28"
          filter="blur(2px)"
        />

        {/* infinite loop — two overlapping stroked circles */}
        <circle
          cx="27"
          cy="32"
          r="13"
          stroke="url(#ltd-grad)"
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
        />
        <circle
          cx="37"
          cy="32"
          r="13"
          stroke="url(#ltd-grad)"
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
        />

        {/* center play badge (fast-forward) */}
        <circle cx="32" cy="32" r="10.5" fill="#0a0a12" />
        <circle
          cx="32"
          cy="32"
          r="10.5"
          stroke="url(#ltd-grad-bright)"
          strokeWidth="2.2"
          fill="none"
        />
        <path
          d="M28.2 26.8 L37 32 L28.2 37.2 Z"
          fill="url(#ltd-grad-bright)"
          strokeLinejoin="round"
        />

        {/* stacked gift bundle — lower crossing */}
        <rect x="27.5" y="44" width="3.6" height="4" rx="1" fill="#22d3ee" />
        <rect x="32" y="44" width="4.2" height="5.4" rx="1" fill="#a855f7" />
        <rect x="37.2" y="44" width="3" height="3.4" rx="1" fill="#7c3aed" />
      </svg>
      )}

      {withWordmark && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[15px] font-bold tracking-tight text-white">
            {SITE_NAME === "AffiliRank" ? (
              <>
                Affili
                <span className="bg-gradient-to-r from-violet-400 to-cyan-300 bg-clip-text text-transparent">
                  Rank
                </span>
              </>
            ) : (
              <Wordmark name={SITE_NAME} />
            )}
          </span>
          <span className="mt-1 text-[8px] font-semibold uppercase tracking-[0.28em] text-white/40">
            {SITE_BRAND_TAG}
          </span>
        </span>
      )}
    </span>
  );
}

function Wordmark({ name }: { name: string }) {
  const words = name.trim().split(/\s+/);
  const last = words.pop() ?? name;
  const rest = words.join(" ");
  return (
    <>
      {rest && <span className="text-white">{rest} </span>}
      <span className="bg-gradient-to-r from-violet-400 to-cyan-300 bg-clip-text text-transparent">
        {last}
      </span>
    </>
  );
}
