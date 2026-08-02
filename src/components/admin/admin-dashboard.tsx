"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Link2,
  List,
  KeyRound,
  ExternalLink,
  LogOut,
  RotateCcw,
  Database,
} from "lucide-react";
import type { Deal, DealDraft, ScrapeResult } from "@/lib/types";
import { Logo } from "@/components/logo";
import { UrlIngest } from "@/components/admin/url-ingest";
import { ProductFormPanel } from "@/components/admin/product-form";
import { ProductList } from "@/components/admin/product-list";
import { LicensesTab } from "@/components/admin/licenses-tab";
import { adminApi, draftFromScrape } from "@/components/admin/client";
import { cn } from "@/lib/utils";

type Tab = "overview" | "ingest" | "deals" | "licenses";

/**
 * Admin portal shell: stat overview, one-click URL ingestion + auto-scrape,
 * manual override editor, and one-click publish for every deal.
 */
export function AdminDashboard({
  initialDeals,
  mockMode,
}: {
  initialDeals: Deal[];
  mockMode: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [blogCount, setBlogCount] = useState(0);
  const [editing, setEditing] = useState<{ id: string; draft: DealDraft } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [list, blogs] = await Promise.all([
      adminApi.listDeals(),
      adminApi.listBlogs().catch(() => []),
    ]);
    setDeals(list);
    setBlogCount(blogs.length);
  }, []);

  const notify = useCallback((msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const stats = useMemo(() => {
    const published = deals.filter((d) => d.published);
    const now = Date.now();
    const expiring = deals.filter(
      (d) =>
        d.published &&
        d.countdown_enabled &&
        d.expiration_date &&
        new Date(d.expiration_date).getTime() - now > 0 &&
        new Date(d.expiration_date).getTime() - now < 3 * 86_400_000
    );
    const countdownActive = deals.filter(
      (d) =>
        d.published &&
        d.countdown_enabled &&
        d.expiration_date &&
        new Date(d.expiration_date).getTime() > now
    );
    return {
      total: deals.length,
      published: published.length,
      drafts: deals.length - published.length,
      expiring: expiring.length,
      countdownActive: countdownActive.length,
    };
  }, [deals]);

  const handleScrapeReady = useCallback(
    (result: ScrapeResult) => {
      setEditing({ id: "new", draft: draftFromScrape(result) });
      setTab("ingest");
      notify("Metadata parsed — review and publish");
    },
    [notify]
  );

  const handleSave = useCallback(
    async (draft: DealDraft, id?: string, publish?: boolean) => {
      setBusy(true);
      try {
        const finalDraft = { ...draft, published: publish ?? draft.published };
        if (id && id !== "new") {
          await adminApi.updateDeal(id, finalDraft);
          notify(publish ? "Deal published to the stream" : "Deal updated");
        } else {
          await adminApi.createDeal(finalDraft);
          notify(publish ? "Deal published to the stream" : "Draft saved");
        }
        setEditing(null);
        await refresh();
        setTab("deals");
      } catch (e) {
        notify(e instanceof Error ? e.message : "Save failed");
      } finally {
        setBusy(false);
      }
    },
    [notify, refresh]
  );

  const handleTogglePublish = useCallback(
    async (deal: Deal) => {
      await adminApi.updateDeal(deal.id, { published: !deal.published });
      notify(deal.published ? "Deal unpublished" : "Deal live on the stream");
      await refresh();
    },
    [notify, refresh]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this deal permanently?")) return;
      await adminApi.deleteDeal(id);
      notify("Deal deleted");
      await refresh();
    },
    [notify, refresh]
  );

  const handleReset = useCallback(async () => {
    if (!confirm("Reset to the built-in demo deals? This removes everything.")) return;
    await adminApi.resetAll();
    notify("Reset to demo data");
    await refresh();
  }, [notify, refresh]);

  const handleLogout = useCallback(async () => {
    await adminApi.logout();
    router.push("/admin/login");
    router.refresh();
  }, [router]);

  const tabs: { key: Tab; label: string; Icon: typeof LayoutDashboard }[] = [
    { key: "overview", label: "Overview", Icon: LayoutDashboard },
    { key: "ingest", label: "Ingest Deal", Icon: Link2 },
    { key: "deals", label: "All Deals", Icon: List },
    { key: "licenses", label: "Licenses", Icon: KeyRound },
  ];

  return (
    <div className="min-h-[100svh] bg-void pb-20 text-white">
      {/* Top bar */}
      <header className="glass sticky top-0 z-30 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo size={30} />
            <div className="hidden sm:block">
              <p className="font-display text-sm font-bold leading-none">
                Admin Portal
              </p>
              <p className="mt-0.5 text-[11px] text-white/45">
                Manage the deal stream
              </p>
            </div>
            {mockMode && (
              <span
                title="Running without Supabase — data lives in a local JSON store"
                className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300"
              >
                <Database className="h-3 w-3" /> Demo store
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold text-white/75 transition hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View site
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
            >
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-6xl px-4 pb-3 sm:px-6">
          <nav className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {tabs.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition",
                  tab === key
                    ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Notice */}
      {notice && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full glass px-5 py-2.5 text-sm font-medium shadow-xl">
          {notice}
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        {tab === "overview" && (
          <Overview
            stats={stats}
            blogCount={blogCount}
            mockMode={mockMode}
            onScrapeReady={handleScrapeReady}
            onReset={handleReset}
            onGoIngest={() => setTab("ingest")}
          />
        )}

        {tab === "ingest" && (
          <UrlIngest onScrapeReady={handleScrapeReady} />
        )}

        {tab === "deals" && (
          <ProductList
            deals={deals}
            onTogglePublish={handleTogglePublish}
            onEdit={(deal) => setEditing({ id: deal.id, draft: dealToDraft(deal) })}
            onDelete={handleDelete}
          />
        )}

        {tab === "licenses" && <LicensesTab />}
      </main>

      {/* Editor panel */}
      {editing && (
        <ProductFormPanel
          id={editing.id}
          initial={editing.draft}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function dealToDraft(deal: Deal): DealDraft {
  return {
    title: deal.title,
    subtitle: deal.subtitle,
    description: deal.description,
    highlights: deal.highlights,
    category: deal.category,
    hero_image: deal.hero_image,
    video_url: deal.video_url,
    video_type: deal.video_type,
    deal_tag: deal.deal_tag,
    tag_style: deal.tag_style,
    coupon_code: deal.coupon_code,
    price: deal.price,
    original_price: deal.original_price,
    currency: deal.currency,
    affiliate_url: deal.affiliate_url,
    source_url: deal.source_url,
    expiration_date: deal.expiration_date,
    countdown_enabled: deal.countdown_enabled,
    featured: deal.featured,
    sort_order: deal.sort_order,
    published: deal.published,
  };
}

function Overview({
  stats,
  blogCount,
  mockMode,
  onScrapeReady,
  onReset,
  onGoIngest,
}: {
  stats: { total: number; published: number; drafts: number; expiring: number; countdownActive: number };
  blogCount: number;
  mockMode: boolean;
  onScrapeReady: (r: ScrapeResult) => void;
  onReset: () => void;
  onGoIngest: () => void;
}) {
  const cards = [
    { label: "Total deals", value: stats.total, accent: "text-white" },
    { label: "Live on stream", value: stats.published, accent: "text-emerald-300" },
    { label: "Drafts", value: stats.drafts, accent: "text-amber-300" },
    { label: "SEO articles", value: blogCount, accent: "text-cyan-300" },
  ];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="glass rounded-2xl p-4">
            <p className={cn("font-display text-3xl font-extrabold", c.accent)}>
              {c.value}
            </p>
            <p className="mt-1 text-xs font-medium text-white/50">{c.label}</p>
          </div>
        ))}
      </section>

      <section className="glass rounded-3xl p-6">
        <h2 className="font-display text-lg font-bold">Publish a new deal</h2>
        <p className="mt-1 text-sm text-white/55">
          Paste a JVZoo URL — the scraper pulls the title, image, VSL video,
          pricing and your affiliate tag automatically. Then review &amp; hit
          publish. Publishing also auto-creates an SEO blog review for the
          product at <span className="text-cyan-300">/blog</span>.
        </p>
        <div className="mt-4">
          <UrlIngest onScrapeReady={onScrapeReady} compact />
        </div>
        <button
          onClick={onGoIngest}
          className="mt-4 text-sm font-semibold text-violet-300 transition hover:text-violet-200"
        >
          Open full ingest tool →
        </button>
      </section>

      <section className="glass rounded-3xl p-6">
        <h2 className="font-display text-lg font-bold">Storage mode</h2>
        <p className="mt-1 text-sm leading-relaxed text-white/55">
          {mockMode ? (
            <>
              Supabase isn&apos;t configured yet, so deals are stored in a local
              <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 text-xs">.data/store.json</code>
              file. Perfect for local dev — add your
              <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code>
              and
              <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 text-xs">SUPABASE_SERVICE_ROLE_KEY</code>
              for persistent, realtime production storage.
            </>
          ) : (
            <>Connected to Supabase — publishing updates open stream tabs in realtime.</>
          )}
        </p>
        {mockMode && (
          <button
            onClick={onReset}
            className="mt-4 flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/20"
          >
            <RotateCcw className="h-4 w-4" /> Reset to demo deals
          </button>
        )}
      </section>
    </div>
  );
}
