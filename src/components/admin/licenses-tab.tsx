"use client";

import { useCallback, useEffect, useState } from "react";
import {
  KeyRound,
  Plus,
  Trash2,
  Crown,
  ShieldCheck,
  ShieldAlert,
  Unlock,
  Lock,
} from "lucide-react";
import {
  LICENSE_FEATURES,
  ALL_FEATURES,
  BUNDLE_ENV,
  decodeLicensePayload,
  licenseTierLabel,
} from "@/lib/license-format";
import type { LicenseState } from "@/lib/licensing";
import { cn } from "@/lib/utils";

type LicenseView = {
  keys: string[];
  state: LicenseState;
};

/**
 * Admin "Licenses" tab — activate RSA-signed keys (base / upsell / bundle).
 * Buyers paste keys here; the app derives the unlocked feature set from the
 * verified list. The seller mints keys offline with the private key.
 */
export function LicensesTab() {
  const [view, setView] = useState<LicenseView | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/licenses");
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    setView(await res.json());
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const notify = useCallback((msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  }, []);

  const activate = useCallback(async () => {
    if (!input.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: input.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Activation failed");
      setView(body);
      setInput("");
      notify("License key activated");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Activation failed");
    } finally {
      setBusy(false);
    }
  }, [input, notify]);

  const remove = useCallback(
    async (key: string) => {
      if (!confirm("Remove this license key? Its unlocks will be lost.")) return;
      setBusy(true);
      try {
        const res = await fetch("/api/admin/licenses", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });
        const body = await res.json();
        setView(body);
        notify("License key removed");
      } finally {
        setBusy(false);
      }
    },
    [notify]
  );

  if (!view) {
    return (
      <div className="glass rounded-3xl p-6 text-sm text-white/50">
        Loading licenses…
      </div>
    );
  }

  const { state } = view;
  const locked = ALL_FEATURES.filter((f) => !state.features.has(f));

  return (
    <div className="space-y-6">
      {notice && (
        <div className="glass rounded-2xl px-4 py-3 text-sm font-medium text-white">
          {notice}
        </div>
      )}
      {/* Current unlock state */}
      <section className="glass rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">License state</h2>
            <p className="mt-0.5 text-sm text-white/55">
              Activated keys resolve into the features below. Sell unlocks as
              upsells; a bundle key grants everything.
            </p>
          </div>
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider",
              state.tier === "bundle"
                ? "bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/30"
                : state.activeKeys.length
                  ? "bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/30"
                  : "bg-white/5 text-white/40 ring-1 ring-white/10"
            )}
          >
            {state.tier === "bundle" ? (
              <Crown className="h-3.5 w-3.5" />
            ) : (
              <KeyRound className="h-3.5 w-3.5" />
            )}
            {licenseTierLabel(state.tier)}
            {Number.isFinite(state.maxDeals)
              ? ` · ${state.maxDeals} deals`
              : " · unlimited deals"}
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_FEATURES.map((key) => {
            const def = LICENSE_FEATURES.find((f) => f.key === key);
            const unlocked = state.features.has(key);
            return (
              <div
                key={key}
                className={cn(
                  "flex items-start gap-2.5 rounded-xl border p-3",
                  unlocked
                    ? "border-emerald-400/20 bg-emerald-400/5"
                    : "border-white/10 bg-black/20"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg",
                    unlocked
                      ? "bg-emerald-400/15 text-emerald-300"
                      : "bg-white/5 text-white/30"
                  )}
                >
                  {unlocked ? (
                    <Unlock className="h-3.5 w-3.5" />
                  ) : (
                    <Lock className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {def?.label ?? key}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/45">
                    {def?.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {locked.length > 0 && (
          <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-400/5 p-4 text-sm text-white/70">
            <p className="font-semibold text-violet-200">
              Sell the remaining unlocks
            </p>
            <p className="mt-1 leading-relaxed">
              Point buyers at checkout with the{" "}
              <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 text-xs">
                UPSELL_URL_*
              </code>{" "}
              env vars (bundle:{" "}
              <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 text-xs">
                {BUNDLE_ENV}
              </code>
              ). Configured links appear below each locked feature.
            </p>
          </div>
        )}
      </section>

      {/* Activate a key */}
      <section className="glass rounded-3xl p-6">
        <h2 className="font-display text-lg font-bold">Activate a license key</h2>
        <p className="mt-1 text-sm text-white/55">
          Paste the key the buyer received after checkout. Verification is
          offline (RSA-signed) — the private key never touches this server.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && activate()}
            placeholder="AR-… paste license key here"
            className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 font-mono text-sm text-white placeholder-white/30 outline-none transition focus:border-violet-400/50"
          />
          <button
            onClick={activate}
            disabled={busy || !input.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> Activate
          </button>
        </div>
      </section>

      {/* Active keys */}
      <section className="glass rounded-3xl p-6">
        <h2 className="font-display text-lg font-bold">
          Active keys ({state.activeKeys.length})
        </h2>
        <div className="mt-3 space-y-2">
          {state.activeKeys.length === 0 && (
            <p className="text-sm text-white/40">No keys activated yet.</p>
          )}
          {state.activeKeys.map((key) => {
            const payload = decodeLicensePayload(key);
            return (
              <div
                key={key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" />
                    <code className="truncate font-mono text-xs text-white/80">
                      {payload?.id ?? key.slice(0, 24) + "…"}
                    </code>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/60">
                      {payload ? licenseTierLabel(payload.tier) : "—"}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-[11px] text-white/40">
                    {key}
                  </p>
                  <p className="mt-0.5 text-xs text-white/45">
                    {payload
                      ? [
                          payload.features === "*"
                            ? "all features"
                            : payload.features.join(", ") || "base",
                          payload.buyer ? ` · ${payload.buyer}` : "",
                          payload.exp ? ` · expires ${new Date(payload.exp).toLocaleString()}` : "",
                        ].join("")
                      : "unreadable payload"}
                  </p>
                </div>
                <button
                  onClick={() => remove(key)}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-400/20"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Invalid keys */}
      {state.invalidKeys.length > 0 && (
        <section className="glass rounded-3xl p-6 ring-1 ring-rose-400/20">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-rose-300">
            <ShieldAlert className="h-5 w-5" /> Invalid keys ({state.invalidKeys.length})
          </h2>
          <p className="mt-1 text-sm text-white/55">
            These keys failed signature verification — tampered, forged, or
            corrupted. Remove them.
          </p>
          <div className="mt-3 space-y-2">
            {state.invalidKeys.map((key) => (
              <div
                key={key}
                className="flex items-center justify-between gap-2 rounded-xl border border-rose-400/15 bg-rose-400/5 px-4 py-2.5"
              >
                <code className="truncate font-mono text-xs text-rose-200/80">
                  {key}
                </code>
                <button
                  onClick={() => remove(key)}
                  className="shrink-0 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-400/20"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Seller notes */}
      <section className="rounded-3xl border border-dashed border-white/10 p-6 text-sm text-white/50">
        <p className="font-semibold text-white/70">Seller only — minting keys</p>
        <p className="mt-1 leading-relaxed">
          Generate keys offline with{" "}
          <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">
            npm run license:keys
          </code>{" "}
          using the private key ({" "}
          <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">
            license-private.pem
          </code>
          ). Never commit or expose that file — it is what lets you sign unlocks.
        </p>
      </section>
    </div>
  );
}
