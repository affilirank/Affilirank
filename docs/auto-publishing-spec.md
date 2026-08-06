# AffiliRank — Auto-Publishing Engine Spec

## 1. What it does
Turns every scraped JVZoo deal into a **strike-proof original YouTube video + Short** automatically:
- Generates a faceless video (product image + text overlays + AI voiceover) from the scraped title / image / price / video data — **not** a re-upload of the vendor's video (avoids copyright strikes).
- Renders an AI thumbnail (title + product image + price-badge overlay).
- Writes a keyword-optimized title + description that embeds the JVZoo affiliate link.
- Uploads to the user's connected YouTube channel on a schedule.
- Same engine later exports TikTok / Reels / Shorts versions.

## 2. Why this wins
- **Every deal becomes a ranking asset** — a YouTube video targeting the deal name + "review" keywords, funneling into the affiliate link.
- **Undeniable demo:** visitor adds one link → a full video + thumbnail appears automatically.
- **Strike-proof:** original content, not vendor re-uploads.

## 3. System pieces

### 3.1 YouTube OAuth (one-time connect)
- Google Cloud project with **YouTube Data API v3** enabled, OAuth client (Web app).
- User connects their channel in Admin → **Auto-Publish** tab → "Connect YouTube".
- Store `{ access_token, refresh_token, channel_id }` per deployment in Supabase `settings` JSON or a new `youtube_auth` table (encrypt tokens; refresh server-side with a `google_refresh_token` env).

### 3.2 Video generator (reuse `scripts/make-video-v3.py` pattern)
- Inputs: deal title, product image, price, tagline, affiliate URL.
- Frames: branded intro (logo + "Today's deal"), product image with zoom, price card, countdown CTA.
- Voiceover: edge-tts narration of a 3–4 sentence script (hook → what it is → why now → CTA).
- Burn captions (we already have this pipeline).
- Output: 30–45s MP4 at 1080x1920 for Shorts + 1280x720 for standard upload.

### 3.3 Thumbnail renderer
- 1280x720 PNG: gradient background + product image + big title + price badge (e.g., "🔥 $79 → $37").
- Use a tiny Node script (sharp or canvas) — no external API needed.

### 3.4 Description template
```
{Deal name} — Full Review + Bonuses

{2-3 sentence auto-summary from scraped data}

🔥 Get it here: {JVZoo affiliate link}
🚀 More deals: {site url}

#affiliatemarketing #jvzoo #deals #{tags}
```

### 3.5 Upload & schedule
- Admin Auto-Publish tab: toggle "Auto-publish new deals", interval (every new deal / daily digest), Shorts vs standard, target channel.
- On new deal publish → enqueue job → generate → upload → save YouTube video ID + URL back to the deal row.
- New `jobs` table (id, deal_id, type, status, created_at) or reuse the existing events table.
- Cron via Vercel Cron (`vercel.json` `crons`) to drain the queue.

## 4. Backend/admin changes
- **New API route:** `/api/admin/youtube/connect` (OAuth start/callback), `/api/youtube/status`, `/api/admin/autopublish` (settings CRUD).
- **New lib:** `src/lib/youtube.ts` (token refresh, upload via resumable upload, thumbnail bytes).
- **Admin UI:** new **Auto-Publish** tab in the dashboard (connect channel, toggle, schedule, per-deal video status, "Post now" button).
- **Deal row:** add `youtubeVideoId`, `youtubeUrl`, `autoPostStatus`.

## 5. OTO / monetization framing
- This is the flagship upgrade story: "Your deal stream promotes itself."
- Offer as: included in Bundle now, later an **Auto-Publish OTO** or bundled into the DFY service.

## 6. Build order
1. YouTube OAuth connect + token refresh
2. Video + thumbnail generator (reuse v3 pipeline)
3. Upload + save back to deal
4. Schedule + queue + cron
5. Admin Auto-Publish tab UI
6. Shorts/TikTok/Reels export
