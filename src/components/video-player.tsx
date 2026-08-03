"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Play, Pause } from "lucide-react";
import type { Deal } from "@/lib/types";
import { analytics } from "@/lib/analytics";
import { BASE_VIDEO_TYPES } from "@/lib/license-format";
import { cn } from "@/lib/utils";

function isProOnlyType(type: string | null | undefined): boolean {
  return !!type && !(BASE_VIDEO_TYPES as readonly string[]).includes(type);
}

function buildEmbedUrl(deal: Deal): string {
  if (!deal.video_url) return "";
  if (deal.video_type === "youtube") {
    const sep = deal.video_url.includes("?") ? "&" : "?";
    return `${deal.video_url}${sep}autoplay=1&mute=1&playsinline=1&rel=0&loop=1&cc_load_policy=1`;
  }
  if (deal.video_type === "vimeo") {
    const sep = deal.video_url.includes("?") ? "&" : "?";
    return `${deal.video_url}${sep}autoplay=1&muted=1&playsinline=1&texttrack=1`;
  }
  return deal.video_url;
}

/**
 * Full-bleed VSL player. Autoplays (muted) when the card is in view,
 * pauses when scrolled away, and reports watch milestones to analytics.
 */
export function VideoPlayer({
  deal,
  inView,
  proVideo = false,
  className,
}: {
  deal: Deal;
  inView: boolean;
  proVideo?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const reported = useRef<Set<number>>(new Set());

  const handleTimeUpdate = useCallback(() => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    const pct = el.currentTime / el.duration;
    const milestone = [0.25, 0.5, 0.75, 1].find(
      (m) => pct >= m && !reported.current.has(m)
    );
    if (milestone !== undefined) {
      reported.current.add(milestone);
      analytics.videoMilestone(deal.id, milestone);
    }
  }, [deal.id]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (inView) {
      el.muted = true;
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [inView]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const syncMute = () => setMuted(el.muted);
    syncMute();
    el.addEventListener("volumechange", syncMute);
    return () => el.removeEventListener("volumechange", syncMute);
  }, []);

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  };

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
    setPaused(el.paused);
  };

  // ---- pro-only creative blocked without the "Pro video mode" license -----
  if (isProOnlyType(deal.video_type) && !proVideo) {
    return (
      <div className={cn("absolute inset-0 overflow-hidden bg-black", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={deal.hero_image ?? "/logo.svg"}
          alt={deal.title}
          className="h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/80" />
      </div>
    );
  }

  // ---- animated GIF source ------------------------------------------------
  if (deal.video_type === "gif" && deal.video_url) {
    return (
      <div className={cn("absolute inset-0 overflow-hidden bg-black", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={deal.video_url}
          alt={deal.title}
          className="h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/80" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />

        {inView && muted && !paused && (
          <button
            onClick={toggleMute}
            className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md transition hover:bg-black/70"
          >
            <VolumeX className="h-3.5 w-3.5" /> Preview
          </button>
        )}
      </div>
    );
  }

  // ---- <video> (mp4) source ---------------------------------------------
  if (deal.video_type === "mp4" && deal.video_url) {
    return (
      <div className={cn("absolute inset-0 overflow-hidden bg-black", className)}>
        <video
          ref={videoRef}
          src={deal.video_url}
          poster={deal.hero_image ?? undefined}
          loop
          playsInline
          preload="metadata"
          muted
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
          className="h-full w-full object-cover"
        />

        {/* bottom legibility gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/80" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />

        {/* tap-to-unmute hint */}
        {inView && muted && !paused && (
          <button
            onClick={toggleMute}
            className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md transition hover:bg-black/70"
          >
            <VolumeX className="h-3.5 w-3.5" /> Tap for sound
          </button>
        )}

        {/* center play/pause */}
        <button
          onClick={togglePlay}
          aria-label={paused ? "Play" : "Pause"}
          className="absolute inset-0 z-10 flex items-center justify-center"
        >
          <span
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full glass transition-all duration-200",
              paused
                ? "scale-100 bg-black/50 opacity-100"
                : "scale-75 opacity-0"
            )}
          >
            {paused ? (
              <Play className="ml-1 h-8 w-8 text-white" />
            ) : (
              <Pause className="h-8 w-8 text-white" />
            )}
          </span>
        </button>

        {/* volume toggle when playing */}
        {!paused && (
          <button
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            className="absolute bottom-3 right-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        )}
      </div>
    );
  }

  // ---- iframe embeds (youtube / vimeo / raw player) -----------------------
  if (deal.video_url && deal.video_type !== "mp4") {
    return (
      <div className={cn("absolute inset-0 overflow-hidden bg-black", className)}>
        <iframe
          src={inView ? buildEmbedUrl(deal) : undefined}
          title={deal.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="h-full w-full"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/80" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />
      </div>
    );
  }

  // ---- no video — hero image fallback --------------------------------------
  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-black", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={deal.hero_image ?? "/logo.svg"}
        alt={deal.title}
        className="h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/80" />
    </div>
  );
}
