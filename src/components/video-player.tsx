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
    return `${deal.video_url}${sep}autoplay=1&mute=1&playsinline=1&rel=0&loop=1&cc_load_policy=1&enablejsapi=1`;
  }
  if (deal.video_type === "vimeo") {
    const sep = deal.video_url.includes("?") ? "&" : "?";
    return `${deal.video_url}${sep}autoplay=1&muted=1&playsinline=1&texttrack=en-x-autogen&api=1`;
  }
  return deal.video_url;
}

/**
 * Poster cover shown while a video is loading/starting. Rendered as an opaque
 * thumbnail so the browser's native buffering spinner is never visible — the
 * cover fades out only once playback actually starts, then the video is
 * already playing underneath. Placed before the legibility gradients in the
 * DOM so they still darken it.
 */
function PosterCover({ deal, show }: { deal: Deal; show: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out",
        show ? "opacity-100" : "opacity-0"
      )}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={deal.hero_image ?? "/logo.svg"}
        alt=""
        className="h-full w-full object-cover"
      />
    </div>
  );
}

/**
 * Full-bleed VSL player. Shows the deal thumbnail as a poster, autoplays
 * (muted) when the card is in view, fades the poster only when the video is
 * actually playing (never exposes a buffering spinner), pauses when scrolled
 * away, and reports watch milestones to analytics.
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
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
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
      // Video was already buffered (e.g. card scrolled back) — skip the poster.
      if (el.readyState >= 3) setReady(true);
    } else {
      el.pause();
    }
  }, [inView]);

  // Reset the poster on scroll-away; re-arm the safety fallback when in view.
  useEffect(() => {
    if (!inView) {
      setReady(false);
      return;
    }
    const t = setTimeout(() => setReady(true), 8000);
    return () => clearTimeout(t);
  }, [inView]);

  // Detect real playback start for embedded players via their postMessage API
  // (enablejsapi=1 / api=1). Until then the poster covers any buffering.
  useEffect(() => {
    if (deal.video_type !== "youtube" && deal.video_type !== "vimeo") return;
    const onMessage = (ev: MessageEvent) => {
      const iframe = iframeRef.current;
      if (!iframe || ev.source !== iframe.contentWindow) return;
      let data: unknown = ev.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (!data || typeof data !== "object") return;
      const msg = data as { event?: string; info?: unknown };
      if (deal.video_type === "youtube") {
        const info = msg.info;
        const playing =
          msg.event === "onReady" ||
          (msg.event === "onStateChange" && Number(info) === 1) ||
          (msg.event === "infoDelivery" &&
            !!info &&
            typeof info === "object" &&
            (info as { playerState?: number }).playerState === 1);
        if (playing) setReady(true);
      } else if (deal.video_type === "vimeo") {
        if (msg.event === "ready" || msg.event === "play" || msg.event === "playing") {
          setReady(true);
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [deal.video_type]);

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
          preload="auto"
          muted
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
          onCanPlay={() => setReady(true)}
          onPlaying={() => setReady(true)}
          className="h-full w-full object-cover"
        />

        <PosterCover deal={deal} show={!ready} />

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
          ref={iframeRef}
          src={inView ? buildEmbedUrl(deal) : undefined}
          title={deal.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="h-full w-full"
        />

        <PosterCover deal={deal} show={!ready} />

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
