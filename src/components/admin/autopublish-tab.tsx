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
  Download,
  Link2,
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
  /** Credentials came from Vercel env vars (host-managed), not the dashboard. */
  envConfigured: boolean;
  google_auth: {
    client_id: string;
    client_secret_set: boolean;
  } | null;
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
  const [geminiKey, setGeminiKey] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");

  useEffect(() => {
    if (status && status.settings.gemini_api_key !== geminiKey) {
      setGeminiKey(status.settings.gemini_api_key ?? "");
    }
    if (status && status.google_auth?.client_id !== googleClientId) {
      setGoogleClientId(status.google_auth?.client_id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

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

  const saveGeminiKey = useCallback(async () => {
    await saveSettings({ gemini_api_key: geminiKey.trim() });
  }, [saveSettings, geminiKey]);

  const saveGoogleCreds = useCallback(async () => {
    setBusy("google");
    try {
      const res = await fetch("/api/admin/youtube/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          google_auth: {
            client_id: googleClientId.trim(),
            client_secret: googleClientSecret.trim(),
          },
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Save failed");
      setGoogleClientSecret("");
      notify(
        status?.google_auth?.client_id || status?.envConfigured
          ? "Credentials updated"
          : "Credentials saved — connect your channel below"
      );
      await refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }, [googleClientId, googleClientSecret, notify, refresh, status]);

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

      {/* Google API credentials — set from the dashboard, no Vercel redeploy */}
      <section className="glass rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <MonitorPlay className="h-5 w-5" /> Google API credentials
          </h2>
          {status.configured && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
              <CheckCircle2 className="h-3.5 w-3.5" /> Configured
            </span>
          )}
          {!status.configured && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/30">
              <AlertTriangle className="h-3.5 w-3.5" /> Needs credentials
            </span>
          )}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-white/55">
          Paste the OAuth client ID + secret from your Google Cloud project.
          They are stored securely in this site&apos;s settings — no server
          env vars, no redeploy.
          {status.envConfigured && (
            <>
              {" "}
              Your host has also configured credentials via environment
              variables; anything you save here is used when those aren&apos;t
              set.
            </>
          )}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">
              OAuth client ID
            </label>
            <input
              type="text"
              value={googleClientId}
              onChange={(e) => setGoogleClientId(e.target.value)}
              placeholder="1234567890-abc.apps.googleusercontent.com"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 font-mono text-xs text-white outline-none placeholder:text-white/30 focus:border-violet-400/50"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">
              OAuth client secret
            </label>
            <input
              type="password"
              value={googleClientSecret}
              onChange={(e) => setGoogleClientSecret(e.target.value)}
              placeholder={
                status.google_auth?.client_secret_set
                  ? "•••••••••• (saved — leave blank to keep)"
                  : "GOCSPX-…"
              }
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 font-mono text-xs text-white outline-none placeholder:text-white/30 focus:border-violet-400/50"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={saveGoogleCreds}
            disabled={
              busy === "google" ||
              !googleClientId.trim() ||
              !googleClientSecret.trim()
            }
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-40"
          >
            {busy === "google" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Save credentials
          </button>
          {status.google_auth?.client_secret_set && (
            <span className="text-xs text-white/45">
              Client ID {status.google_auth.client_id} · secret saved
            </span>
          )}
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-white/50">
            One-time Google Cloud setup
          </p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-white/70">
            <li>
              Go to{" "}
              <a
                className="text-cyan-300 underline"
                href="https://console.cloud.google.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                console.cloud.google.com
              </a>{" "}
              and create a project (or reuse one).
            </li>
            <li>
              Enable the <strong>YouTube Data API v3</strong> under APIs &amp;
              Services.
            </li>
            <li>
              Create an <strong>OAuth client ID</strong> (Application type: Web
              application) under Credentials.
            </li>
            <li>
              Add this authorized redirect URI:{" "}
              <code className="break-all rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-cyan-200">
                {window.location.origin}/api/admin/youtube/callback
              </code>
            </li>
            <li>
              Paste the client ID + secret into the fields above and click{" "}
              <strong>Save credentials</strong>.
            </li>
          </ol>
        </div>
      </section>

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

      {/* AI thumbnails — available before Google/YouTube setup */}
      <section className="glass rounded-3xl p-6">
        <h2 className="font-display text-lg font-bold">AI thumbnails</h2>
        <p className="mt-0.5 text-sm text-white/55">
          Paste your own Google Gemini API key. It powers scroll-stopping
          thumbnails with your profile pic — every white-label customer
          brings their own key. Without one, the built-in design engine is
          used instead.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder="Paste your Gemini API key (AIza…)"
            className="w-full max-w-sm rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-violet-400/50"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            onClick={saveGeminiKey}
            disabled={busy === "settings" || geminiKey.trim() === (status.settings.gemini_api_key ?? "")}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-40"
          >
            {busy === "settings" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {status.settings.gemini_api_key ? "Update key" : "Save key"}
          </button>
          {status.settings.gemini_api_key && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
              <CheckCircle2 className="h-3.5 w-3.5" /> Key saved
            </span>
          )}
        </div>
        <p className="mt-3 text-xs text-white/40">
          Get a free key at{" "}
          <a
            className="text-cyan-300 underline"
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
          >
            aistudio.google.com/apikey
          </a>{" "}
          (no credit card). The worker picks this up automatically on its
          next run.
        </p>
      </section>

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
                  {(st === "posted" || deal.hero_image) && (
                    <>
                      <a
                        href={`/api/admin/youtube/thumbnail?slug=${encodeURIComponent(
                          deal.slug
                        )}&variant=thumb`}
                        title="Download the rendered YouTube thumbnail"
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                      >
                        <Download className="h-3.5 w-3.5" /> Thumb
                      </a>
                      <a
                        href={`/api/admin/youtube/thumbnail?slug=${encodeURIComponent(
                          deal.slug
                        )}&variant=og`}
                        title="Download the 1200x630 share image"
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                      >
                        <Download className="h-3.5 w-3.5" /> OG
                      </a>
                      <button
                        onClick={() => {
                          if (!deal.hero_image) return;
                          navigator.clipboard
                            .writeText(deal.hero_image)
                            .then(() => notify("Share image link copied"))
                            .catch(() => notify("Could not copy link"));
                        }}
                        title="Copy the live share image link (Facebook reads this on the next scrape)"
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                      >
                        <Link2 className="h-3.5 w-3.5" /> Copy link
                      </button>
                    </>
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
