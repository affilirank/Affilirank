"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Rocket,
  Pause,
  Trash2,
  Search,
  ListPlus,
  Timer,
  Star,
  FileText,
} from "lucide-react";
import type { BlogPost, Deal } from "@/lib/types";
import { cn, formatPrice, timeAgo, categoryLabel } from "@/lib/utils";
import { adminApi } from "@/components/admin/client";

/**
 * Every deal (published + drafts) with one-click publish/unpublish, edit and
 * delete. Publishing from here updates the live stream instantly (Realtime).
 */
export function ProductList({
  deals,
  onTogglePublish,
  onEdit,
  onDelete,
}: {
  deals: Deal[];
  onTogglePublish: (deal: Deal) => void;
  onEdit: (deal: Deal) => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [onlyLive, setOnlyLive] = useState(false);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);

  useEffect(() => {
    adminApi
      .listBlogs()
      .then(setBlogs)
      .catch(() => {});
  }, [deals]);

  const blogByDeal = useMemo(
    () => new Map(blogs.map((b) => [b.deal_id ?? "", b])),
    [blogs]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return deals.filter((d) => {
      if (onlyLive && !d.published) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.subtitle?.toLowerCase().includes(q) ||
        d.category?.toLowerCase().includes(q)
      );
    });
  }, [deals, query, onlyLive]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search deals…"
            className="h-10 w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-violet-400/60"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={onlyLive}
            onChange={(e) => setOnlyLive(e.target.checked)}
            className="h-4 w-4 accent-violet-500"
          />
          Live only
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl glass py-16 text-center">
          <ListPlus className="h-8 w-8 text-white/30" />
          <p className="text-sm text-white/55">
            {deals.length === 0
              ? "No deals yet — ingest your first JVZoo URL."
              : "No deals match your search."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-panel">
          <div className="hidden grid-cols-[minmax(0,1.6fr)_110px_120px_110px_150px_96px] gap-3 border-b border-white/10 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white/40 sm:grid">
            <span>Deal</span>
            <span>Category</span>
            <span>Price</span>
            <span>Status</span>
            <span>Updated</span>
            <span className="text-right">Actions</span>
          </div>

          <ul className="divide-y divide-white/5">
            {filtered.map((deal) => (
              <li
                key={deal.id}
                className={cn(
                  "grid grid-cols-1 gap-3 px-4 py-3.5 transition hover:bg-white/[0.03] sm:grid-cols-[minmax(0,1.6fr)_110px_120px_110px_150px_96px] sm:items-center",
                  !deal.published && "opacity-75"
                )}
              >
                {/* Deal */}
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-black">
                    {deal.hero_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={deal.hero_image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] font-bold text-white/25">
                        {deal.title.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-white">
                        {deal.title}
                      </p>
                      {deal.featured && (
                        <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                      )}
                    </div>
                    {deal.deal_tag && (
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-rose-300">
                        {deal.deal_tag}
                      </p>
                    )}
                  </div>
                </div>

                {/* Category */}
                <span className="text-xs text-white/55 sm:block">
                  {categoryLabel(deal.category)}
                </span>

                {/* Price */}
                <span className="text-xs font-semibold text-white/80 sm:block">
                  {formatPrice(deal.price, deal.currency) ?? "—"}
                </span>

                {/* Status */}
                <div className="flex flex-col gap-1 sm:block">
                  <span
                    className={cn(
                      "inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      deal.published
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-amber-500/15 text-amber-300"
                    )}
                  >
                    {deal.published ? "Live" : "Draft"}
                  </span>
                  {deal.countdown_enabled && deal.expiration_date && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-cyan-300/80">
                      <Timer className="h-3 w-3" />
                      {timeAgo(deal.expiration_date)} left
                    </span>
                  )}
                </div>

                {/* Updated */}
                <span className="text-xs text-white/40 sm:block">
                  {timeAgo(deal.updated_at)}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1.5 sm:justify-end">
                  {blogByDeal.get(deal.id) && (
                    <a
                      href={`/blog/${blogByDeal.get(deal.id)!.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View generated blog"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/70 transition hover:bg-cyan-500/20 hover:text-cyan-200"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => onEdit(deal)}
                    title="Edit"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/70 transition hover:bg-violet-500/20 hover:text-violet-200"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onTogglePublish(deal)}
                    title={deal.published ? "Unpublish" : "Publish now"}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg transition",
                      deal.published
                        ? "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                        : "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                    )}
                  >
                    {deal.published ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Rocket className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => onDelete(deal.id)}
                    title="Delete"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/60 transition hover:bg-rose-500/20 hover:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
