# AffiliRank

A TikTok-style, dark neon **affiliate deal stream** for
[affilirank.com](https://affilirank.com). Full-screen vertical
deal cards autoplay vendor sales videos while an overlay shows the one-time
price, discount, countdown, and a JVZoo affiliate checkout button — plus an
admin portal that turns a pasted JVZoo product URL into a published deal in one
click.

Built with **Next.js 16 (App Router + Turbopack)**, **React 19**, **Tailwind CSS
4**, **Framer Motion**, and **Supabase** (optional — a zero-config mock store
runs out of the box).

## Features

- **Reels-style deal stream** — full-screen snap cards with in-view video
  autoplay, overlay title/subtitle/tag, and an action rail (Save, Share, Copy
  Coupon).
- **Auto-generated SEO blog** — publishing a deal instantly creates a
  keyword-packed review article (`/blog/[slug]`, index at `/blog`) built from
  the scraped data, with Article + FAQ + Breadcrumb schema and the affiliate
  URL linked throughout. Editing a deal regenerates its article.
- **Heavy on-site SEO** — `sitemap.xml` (deals + blog + static), `robots.txt`,
  `rss.xml` feed, canonical/OG/Twitter metadata on every page, and sitewide
  Organization/WebSite JSON-LD.
- **High-converting deal modal** — price breakdown, discount badge, live
  countdown, JVZoo affiliate CTA, without losing scroll position.
- **Exit-intent popup** — fires once per session with a targeted deal + countdown.
- **Header search + category chips** — filter the stream by category or text.
- **Admin portal** (`/admin`) — password login, single-input **JVZoo URL
  ingest**, automatic OG/JSON-LD metadata scraper with affiliate-tag append,
  manual override editor, and one-click publish/unpublish (which also creates
  the product's blog article).
- **Per-deal SEO** — dynamic OG/Twitter meta and JSON-LD Product markup on
  `/deals/[slug]`.
- **Analytics hooks** — GA4 + Meta Pixel events (view, video milestones,
  save, share, coupon copy, checkout click) plus a `/api/events` endpoint.
- **Supabase Realtime** — published deals appear on the stream without a refresh.

## Quick start

```bash
npm install
cp .env.example .env.local   # demo works with empty Supabase vars
npm run dev                  # http://localhost:3000
```

Open `http://localhost:3000` for the stream and `http://localhost:3000/admin`
for the dashboard. The default demo admin password is `lifetimedeals-demo-admin`
(from `.env.local`).

### Running without Supabase (mock mode)

When `NEXT_PUBLIC_SUPABASE_URL` is empty, the app runs in **mock mode**: deals
are read/written to a local JSON store at `.data/store.json`, pre-seeded with 8
demo deals (placeholder MP4s + picsum images). A "Demo store" badge shows in
the admin header. Everything works — ingest, editing, publishing — so you can
develop fully offline.

## Production setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migrations from `supabase/migrations/` in the **SQL editor**:
    - `0001_init.sql` — `products` table, RLS, realtime publication, seed rows.
    - `0002_events.sql` — `deal_events` analytics table.
    - `0003_blog_posts.sql` — `blog_posts` table (auto-generated SEO articles).
    - `0004_settings.sql` — `settings` table (activated license keys).
3. Copy the project URL, anon key, and service-role key into `.env.local`.

### 2. Environment variables

See [`.env.example`](.env.example) for the full list:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client + realtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side reads/writes (keep secret) |
| `ADMIN_PASSWORD` | Admin login password |
| `ADMIN_SECRET` | Random string signing the admin session cookie |
| `NEXT_PUBLIC_JVZOO_AFFILIATE_ID` | Your JVZoo id, auto-appended to scraped URLs |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4 |
| `NEXT_PUBLIC_FB_PIXEL_ID` | Meta Pixel |
| `NEXT_PUBLIC_SITE_URL` | Canonical/OG URL base |
| `UPSELL_URL_BLOG` … `UPSELL_URL_VIDEO` | Per-module checkout URLs (see Licensing) |
| `UPSELL_URL_BUNDLE` | Bundle checkout URL (full version) |
| `NEXT_PUBLIC_VSL_EMBED_URL` | Video sales letter embed on `/affilirank` |

### 3. Deploy to Vercel

```bash
vercel
```

Set the same env vars in the Vercel dashboard. `vercel.json` is already
configured (`rewrites` for `/_next/image`). The admin login gate is client-side
cookie based; server data routes enforce the same check via `isAdminAuthed()`.

## JVZoo affiliate links

Paste a JVZoo product URL (e.g. `https://www.jvzoo.com/b/12345/54321`) into the
admin **"Ingest a deal"** box. The scraper:

1. Fetches the sales page and extracts title, description, image, and video from
   `og:`/`twitter:` tags and embedded JSON-LD.
2. Stores the raw URL as `source_url` and a **normalized affiliate URL** as
   `affiliate_url`, injecting `NEXT_PUBLIC_JVZOO_AFFILIATE_ID` when missing.
3. Lets you review, override any field, and **Publish** — or save as draft.

Some pages block scraping (403/CAPTCHA). In that case the form still lets you
fill everything manually.

## Licensing (sell unlocks)

The app ships with the core deal stream **unlocked** and six advanced modules
**gated** behind RSA-signed license keys. A deployment unlocks features by
activating keys in the admin **Licenses** tab; buyers paste the key they
received. No license server needed.

### The six unlockable modules

| Module | Feature key | Gate |
| --- | --- | --- |
| SEO Blog module | `blog` | `/blog` + articles return 404 until unlocked |
| Unlimited deals | `unlimited-deals` | base cap of **10 deals** lifted |
| Exit-intent popup | `exit-intent` | popup renders only when unlocked |
| Analytics module | `analytics` | GA4 + Meta Pixel scripts load only when unlocked |
| Deal detail pages | `deal-pages` | `/deals/[slug]` returns 404 until unlocked |
| Pro video mode | `pro-video` | MP4/iframe/GIF creative blocked on base |

A **bundle** key (`tier: "bundle"`) grants all six features + unlimited deals.

### Minting keys (seller only)

The private key lives in `license-private.pem` (gitignored — **never commit or
deploy it**). Mint keys with:

```bash
npm run license:keys -- --tier bundle --buyer "customer@example.com"     # full version
npm run license:keys -- --tier upsell --features blog,analytics --buyer "x@y.com"
npm run license:keys -- --verify "payload.signature"                     # check a key
npm run license:keys -- --gen-keypair                                     # fresh keypair
```

If you regenerate the keypair, replace `LICENSE_PUBLIC_KEY` in
`src/lib/licensing.ts` with the new public key (the CLI prints it).

### How verification works

Keys are `base64url(payload) . base64url(RSA-SHA256 signature)`. The public key
is embedded in the source (`src/lib/licensing.ts`), so buyers cannot forge
keys even with the full source — only you can sign unlocks. Payloads carry a
tier, granted features, an optional buyer label, and optional expiry.

### Selling

Point each checkout at the matching env var (set on the seller's own
deployment): `UPSELL_URL_BLOG`, `UPSELL_URL_UNLIMITED`, `UPSELL_URL_EXIT`,
`UPSELL_URL_ANALYTICS`, `UPSELL_URL_DEALS`, `UPSELL_URL_VIDEO`, and
`UPSELL_URL_BUNDLE` for the full version. The `/affilirank` sales page (with a
VSL via `NEXT_PUBLIC_VSL_EMBED_URL`) surfaces these links automatically.

## Auto-generated SEO blog

Every published deal also gets a **search-optimized review article** generated
from the same scraped data — no extra work required:

- **How it triggers:** hitting **Publish to Stream** (ingest flow or the deals
  list) creates both the product *and* its article. Editing a deal regenerates
  the article so price changes, new highlights, and coupons stay in sync.
- **Where it lives:** `/blog` (index) and `/blog/[slug]` (article). A **Blog**
  link sits in the homepage header, and the admin product list shows a file
  icon that opens each deal's article.
- **What's in each article:** meta description, keyword list, structured
  sections (what it is, features, who it's for, pricing, why we love it),
  a FAQ block, reading-time estimate, and **affiliate CTA buttons that link to
  the deal's real affiliate URL** (with `rel="sponsored"` disclosure).
- **Schema:** every article emits `Article`, `FAQPage`, `BreadcrumbList` and
  (where a price exists) nested `Product` JSON-LD.
- **Feed & crawl:** `sitemap.xml` includes deals + blog + static pages,
  `robots.txt` blocks `/admin` and `/api`, and `rss.xml` exposes all articles
  for subscribers.
- **Regenerating:** the admin API accepts `POST /api/blogs` with `{ dealId }`
  to force-regenerate a single article.

## Scripts

```bash
npm run dev           # dev server
npm run build         # production build
npm run start         # serve production build
npm run lint          # ESLint
npm run license:keys  # mint/verify license keys (see Licensing)
```

## Project structure

```
src/
  app/                  # App Router pages + API routes
    api/products/       # public deal listing
    api/products/[id]/  # get/patch/delete one deal
    api/scrape/         # admin URL metadata scraper
    api/admin/          # login / logout / session / products
    api/events/         # analytics event ingest
    deals/[slug]/       # per-deal SEO page
    admin/              # /admin portal (login + protected dashboard)
  components/           # stream, deal card, video player, modals, header, toast…
  components/admin/     # dashboard, URL ingest, product form/list
  hooks/                # use-deal-stream, use-in-view, use-countdown
  lib/                  # types, data layer, mock store, auth, scraper, analytics
public/                 # logo, OG image, manifest
supabase/migrations/    # 0001_init.sql, 0002_events.sql
```
