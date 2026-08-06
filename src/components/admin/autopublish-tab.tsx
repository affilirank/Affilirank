"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MonitorPlay,
  Unplug,
  Play,
  ListVideo,
  CheckCircle2,
  Loader2,
  Clock,
  AlertTriangle,
  ExternalLink,
  Video,
} from "lucide-react";
import type { AutopublishSettings } from "@/lib/youtube";
import { cn } from "@/lib/utils";

type DealStatus = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  hero_image: string | null;
  auto_post_status: string | null;
  youtube_video_id: string | null;
  youtube_url: string | null;
};

type StatusPayload = {
  configured: boolean;
  connected: boolean;
  channel: { id: string; title: string; avatar: string | null } | null;
  connected_at: string | null;
  settings: AutopublishSettings;
  deals: DealStatus[];
};

/**
 * Admin "Auto-Publish" tab — connect a YouTube channel, tune the engine,
 * and enqueue deals for the worker to turn into original faceless videos.
 */
export function AutopublishTab() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/youtube/status");
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    if (res.ok) setStatus(await res.json());
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const notify = useCallback((msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  }, []);

  const connect = useCallback(async () => {
    setBusy("connect");
    try {
      const res = await fetch("/api/admin/youtube/connect");
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Connect failed");
      if (body.authUrl) location.href = body.authUrl;
    } catch (e) {
      notify(e instanceof Error ? e.message : "Connect failed");
    } finally {
      setBusy(null);
    }
  }, [notify]);

  const disconnect = useCallback(async () => {
    if (!confirm("Disconnect this YouTube channel? Existing videos stay up.")) return;
    setBusy("disconnect");
    try {
      const res = await fetch("/api/admin/youtube/disconnect", { method: "DELETE" });
      if (!res.ok) throw new Error("Disconnect failed");
      notify("YouTube disconnected");
      await refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Disconnect failed");
    } finally {
      setBusy(null);
    }
  }, [notify, refresh]);

  const saveSettings = useCallback(
    async (patch: Partial<AutopublishSettings>) => {
      if (!status) return;
      setBusy("settings");
      try {
        const res = await fetch("/api/admin/youtube/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...status.settings, ...patch }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? "Save failed");
        setStatus({ ...status, settings: body.settings });
        notify("Settings saved");
      } catch (e) {
        notify(e instanceof Error ? e.message : "Save failed");
      } finally {
        setBusy(null);
      }
    },
    [status, notify]
  );

  const enqueue = useCallback(
    async (dealId: string | null) => {
      setBusy(dealId ? `deal:${dealId}` : "all");
      try {
        const res = await fetch("/api/admin/youtube/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dealId }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? "Enqueue failed");
        notify(
          dealId
            ? "Deal queued — video will be created + posted"
            : `${body.enqueued ?? 0} deal(s) queued for auto-posting`
        );
        await refresh();
      } catch (e) {
        notify(e instanceof Error ? e.message : "Enqueue failed");
      } finally {
        setBusy(null);
      }
    },
    [notify, refresh]
  );

  if (!status) {
    return (
      <div className="glass rounded-3xl p-6 text-sm text-white/50">
        Loading auto-publish…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notice && (
        <div className="glass rounded-2xl px-4 py-3 text-sm font-medium text-white">
          {notice}
        </div>
      )}

      {!status.configured && (
        <section className="rounded-3xl border border-dashed border-amber-400/30 bg-amber-400/5 p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-amber-200">
            <MonitorPlay className="h-5 w-5" /> Google API setup required
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-white/55">
            The Auto-Publish engine needs a Google Cloud OAuth client to upload
            videos to your channel. Two env vars must be set:
            <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">GOOGLE_CLIENT_ID</code>
            and
            <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">GOOGLE_CLIENT_SECRET</code>.
          </p>
          <ol className="mt-4 space-y-2 text-sm text-white/70">
            <li>
              1. Go to{" "}
              <a className="text-cyan-300 underline" href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">console.cloud.google.com</a>{" "}
              and create a project (or reuse one).
            </li>
            <li>
              2. Enable the <strong>YouTube Data API v3</strong> under APIs &amp; Services.
            </li>
            <li>
              3. Create an <strong>OAuth client ID</strong> (Application type: Web application) under Credentials.
            </li>
            <li>
              4. Add this authorized redirect URI:{" "}
              <code className="break-all rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-cyan-200">
                {window.location.origin}/api/admin/youtube/callback
              </code>
            </li>
            <li>
              5. Copy the client ID + secret into the Vercel project env vars and redeploy.
            </li>
          </ol>
        </section>
      )}

      {status.configured && !status.connected && (
        <section className="glass rounded-3xl p-6 text-center">
          <MonitorPlay className="mx-auto h-12 w-12 text-rose-400" />
          <h2 className="mt-3 font-display text-lg font-bold">
            Connect your YouTube channel
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-white/55">
            Grant upload access once. The engine will post original faceless
            deal videos to this channel automatically — no vendor videos, no
            copyright strikes.
          </p>
          <button
            onClick={connect}
            disabled={busy === "connect"}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-40"
          >
            {busy === "connect" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MonitorPlay className="h-4 w-4" />
            )}
            Connect YouTube Channel
          </button>
        </section>
      )}

      {status.connected && (
        <>
          {/* Channel + status */}
          <section className="glass rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {status.channel?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={status.channel.avatar}
                    alt={status.channel.title}
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-rose-400/50"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600">
                    <MonitorPlay className="h-6 w-6 text-white" />
                  </div>
                )}
                <div>
                  <h2 className="font-display text-lg font-bold">
                    {status.channel?.title ?? "Connected channel"}
                  </h2>
                  <p className="mt-0.5 text-xs text-white/45">
                    {status.channel?.id}
                    {status.connected_at
                      ? ` · connected ${new Date(status.connected_at).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                </span>
                <button
                  onClick={disconnect}
                  disabled={busy === "disconnect"}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-400/20 disabled:opacity-40"
                >
                  <Unplug className="h-3.5 w-3.5" /> Disconnect
                </button>
              </div>
            </div>
          </section>

          {/* Settings */}
          <section className="glass rounded-3xl p-6">
            <h2 className="font-display text-lg font-bold">Engine settings</h2>
            <p className="mt-0.5 text-sm text-white/55">
              The worker polls this site&apos;s deals and posts videos on this
              schedule. Videos are always original and strike-proof.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
                <div>
                  <p className="text-sm font-semibold text-white">Enabled</p>
                  <p className="text-xs text-white/45">Turn the engine on/off</p>
                </div>
                <button
                  role="switch"
                  aria-checked={status.settings.enabled}
                  onClick={() => saveSettings({ enabled: !status.settings.enabled })}
                  disabled={busy === "settings"}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition",
                    status.settings.enabled
                      ? "bg-gradient-to-r from-violet-600 to-cyan-500"
                      : "bg-white/15"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                      status.settings.enabled ? "left-[22px]" : "left-0.5"
                    )}
                  />
                </button>
              </label>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
                <div>
                  <p className="text-sm font-semibold text-white">Interval</p>
                  <p className="text-xs text-white/45">How often to post</p>
                </div>
                <select
                  value={status.settings.interval}
                  onChange={(e) =>
                    saveSettings({ interval: e.target.value as AutopublishSettings["interval"] })
                  }
                  disabled={busy === "settings"}
                  className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs font-semibold text-white outline-none focus:border-violet-400/50"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="manual">Manual only</option>
                </select>
              </label>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
                <div>
                  <p className="text-sm font-semibold text-white">Format</p>
                  <p className="text-xs text-white/45">Video orientation</p>
                </div>
                <select
                  value={status.settings.format}
                  onChange={(e) =>
                    saveSettings({ format: e.target.value as AutopublishSettings["format"] })
                  }
                  disabled={busy === "settings"}
                  className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs font-semibold text-white outline-none focus:border-violet-400/50"
                >
                  <option value="short">Short (9:16)</option>
                  <option value="standard">Standard (16:9)</option>
                </select>
              </label>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
                <div>
                  <p className="text-sm font-semibold text-white">Face in thumbs</p>
                  <p className="text-xs text-white/45">Channel avatar on thumbnails</p>
                </div>
                <button
                  role="switch"
                  aria-checked={status.settings.profile_in_thumbnails ?? true}
                  onClick={() =>
                    saveSettings({ profile_in_thumbnails: !(status.settings.profile_in_thumbnails ?? true) })
                  }
                  disabled={busy === "settings"}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition",
                    status.settings.profile_in_thumbnails ?? true
                      ? "bg-gradient-to-r from-rose-500 to-red-600"
                      : "bg-white/15"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                      status.settings.profile_in_thumbnails ?? true ? "left-[22px]" : "left-0.5"
                    )}
                  />
                </button>
              </label>
            </div>
          </section>
        </>
      )}

      {/* Deals queue */}
      <section className="glass rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">Deal videos</h2>
            <p className="mt-0.5 text-sm text-white/55">
              Queue deals to be rendered + posted. Published deals with no
              video yet can be queued in one click.
            </p>
          </div>
          <button
            onClick={() => enqueue(null)}
            disabled={busy === "all" || !status.connected}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-40"
          >
            {busy === "all" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ListVideo className="h-4 w-4" />
            )}
            Queue all published deals
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {status.deals.length === 0 && (
            <p className="text-sm text-white/40">No deals yet.</p>
          )}
          {status.deals.map((deal) => {
            const st = deal.auto_post_status;
            return (
              <div
                key={deal.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {deal.hero_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={deal.hero_image}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                      <Video className="h-4 w-4 text-white/40" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {deal.title}
                    </p>
                    <p className="text-xs text-white/40">
                      {deal.published ? "Published" : "Draft"}
                      {deal.youtube_video_id ? " · has video" : " · no video yet"}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {st === "pending" && (
                    <span className="flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/30">
                      <Clock className="h-3.5 w-3.5" /> Queued
                    </span>
                  )}
                  {st === "posted" && deal.youtube_url && (
                    <a
                      href={deal.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30 transition hover:bg-emerald-400/20"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Posted
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {st === "failed" && (
                    <span className="flex items-center gap-1.5 rounded-full bg-rose-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-300 ring-1 ring-rose-400/30">
                      <AlertTriangle className="h-3.5 w-3.5" /> Failed
                    </span>
                  )}
                  {(!st || st === "failed") && status.connected && (
                    <button
                      onClick={() => enqueue(deal.id)}
                      disabled={busy === `deal:${deal.id}`}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                    >
                      {busy === `deal:${deal.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                      Queue
                    </button>
                  )}
                  {st === "posted" && status.connected && (
                    <button
                      onClick={() => enqueue(deal.id)}
                      disabled={busy === `deal:${deal.id}`}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                    >
                      <Play className="h-3.5 w-3.5" /> Re-post
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
