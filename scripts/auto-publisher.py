#!/usr/bin/env python3
"""
AffiliRank Auto-Publish Worker

Polls the Supabase `products` table for deals with auto_post_status='pending'
(or 'failed' with a retry budget), generates an original faceless video
(1080x1920 Short or 1280x720 standard) + thumbnail from the deal's own data,
then uploads to the connected YouTube channel via the stored OAuth token.

Strike-proof by design: NEVER re-uploads the vendor's VSL/webinar — every
video is freshly rendered (product image + text overlays + AI voiceover).

Run on a machine with ffmpeg + edge-tts (this box). Loop or cron it.

Env required:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY   (service role key — full read/write)
  JVZOO_AFFILIATE_ID          (for funnel link fallback, e.g. 3582897)
  SITE_URL                    (default https://affilirank.com)
"""
import asyncio
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.request
import urllib.parse
from pathlib import Path

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
AFF_ID = os.environ.get("JVZOO_AFFILIATE_ID", "")
SITE_URL = os.environ.get("SITE_URL", "https://affilirank.com")
WORK = Path(os.environ.get("WORK_DIR", "/tmp/affilirank-autopublish"))
MAX_FAILURES = int(os.environ.get("MAX_FAILURES", "2"))

REST = f"{SUPABASE_URL}/rest/v1"


def db_headers():
    return {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
    }


def rest(path, method="GET", body=None):
    url = f"{REST}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=db_headers())
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{method} {path} -> HTTP {e.code}: {e.read()[:300]}")


def fmt_price(price, currency):
    if price is None:
        return ""
    sym = {"USD": "$", "EUR": "€", "GBP": "£"}.get(currency or "USD", "$")
    if price == int(price):
        return f"{sym}{int(price)}"
    return f"{sym}{price:.2f}"


def short_name(title):
    return (re.split(r"\s+[—|–|:|-]\s+", title or "")[0] or title or "").strip()


def strip_tags(html):
    text = re.sub(r"<[^>]+>", " ", html or "")
    return re.sub(r"\s+", " ", text).strip()


# ─── Video generation (ffmpeg + edge-tts) ────────────────────────────────


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"cmd failed: {' '.join(str(c) for c in cmd)}\n{r.stderr[-500:]}")
    return r


def audio_duration(path):
    r = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True,
    )
    return float(r.stdout.strip())


async def gen_tts(text, out, rate="-5%"):
    import edge_tts
    await edge_tts.Communicate(text, "en-US-GuyNeural", rate=rate).save(str(out))


def wrap_text(text, width):
    words = text.split()
    lines, line = [], ""
    for w in words:
        if len(line) + len(w) + 1 <= width:
            line = f"{line} {w}".strip()
        else:
            lines.append(line)
            line = w
    if line:
        lines.append(line)
    return lines


def build_description(deal):
    name = short_name(deal["title"])
    desc = strip_tags(deal.get("description"))
    summary = (desc[:300] + "...") if desc and len(desc) > 300 else (desc or f"Full review of {name} — the real dashboard, key features, pricing and bonuses.")
    price = fmt_price(deal.get("price"), deal.get("currency"))
    original = fmt_price(deal.get("original_price"), deal.get("currency"))
    highlights = [strip_tags(h) for h in (deal.get("highlights") or []) if strip_tags(h)]
    coupon = deal.get("coupon_code")
    affiliate = (deal.get("affiliate_url") or "").strip()

    lines = [f"{name} — Full Review ({time.strftime('%Y')}) | Lifetime Deal on JVZoo", ""]
    lines.append(summary)
    lines.append("In this review: the real dashboard, key features, honest pricing and the best deal on " + name + ".")
    lines.append("")
    if price:
        lines.append(f"💰 TODAY: {price} one-time" + (f" (regularly {original})" if original else ""))
        lines.append("")
    if highlights:
        lines.append("✅ WHAT YOU GET")
        for h in highlights[:5]:
            lines.append(f"• {h}")
        lines.append("")
    lines.append(f"🔗 GET {name.upper()} HERE:")
    lines.append(affiliate)
    lines.append("")
    funnel = deal.get("funnel_links") or []
    bundle = (deal.get("bundle_url") or "").strip()
    if not bundle:
        for fl in funnel:
            if fl.get("url") != affiliate and fl.get("url") != bundle:
                bundle = fl.get("url") or ""
                break
    if bundle:
        lines.append("🚀 BEST VALUE — The Full Bundle:")
        lines.append(bundle)
        lines.append("")
    for fl in funnel:
        label = fl.get("label") or "Upgrade"
        url = (fl.get("url") or "").strip()
        if url and url != affiliate and url != bundle:
            lines.append(f"⚡ {label}:")
            lines.append(url)
    if coupon:
        lines.append("")
        lines.append(f"🎟 Use coupon code {coupon} at checkout to lock in the discount.")
    lines.append("")
    lines.append(f"🔁 More lifetime deals: {SITE_URL}")
    lines.append("")
    tags = ["lifetimedeal", "jvzoo", "affiliatemarketing", "make-money-online", "ai-tools"]
    name_tag = re.sub(r"[^a-z0-9]+", "", name.lower())[:20]
    if name_tag:
        tags.insert(0, name_tag)
    lines.append("#" + " #".join(tags))
    return "\n".join(lines)


DEMO_ASSETS = {}
_ASSETS_PATH = Path(__file__).resolve().parent / "deal-assets.json"
if _ASSETS_PATH.exists():
    try:
        DEMO_ASSETS = json.loads(_ASSETS_PATH.read_text())
    except Exception:
        DEMO_ASSETS = {}

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
YELLOW = "0xFFB300"
GRAY = "0x9CA3AF"
GREEN = "0x34D399"


def img_dims(path):
    r = subprocess.run(
        ["ffprobe", "-v", "quiet", "-select_streams", "v:0",
         "-show_entries", "stream=width,height", "-of", "csv=s=x:p=0", str(path)],
        capture_output=True, text=True,
    )
    try:
        w, h = r.stdout.strip().split("x")
        return int(w), int(h)
    except Exception:
        return 16, 9


def download_image(url, dest, min_bytes=1500):
    if not url or not str(url).startswith("http"):
        return False
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=20) as r:
            data = r.read()
        if len(data) < min_bytes:
            return False
        if data[:3] == b"\xff\xd8\xff" or data[:4] == b"\x89PNG":
            dest.write_bytes(data)
            return True
    except Exception:
        pass
    return False


def fetch_images(deal, demo_images, out_dir, want=3):
    """Resolve up to `want` working product screenshots (demo images first,
    hero as fallback). Handles Vimeo CDN size-variant URLs."""
    cands = [u for u in (demo_images or [])]
    hero = deal.get("hero_image")
    if hero and hero not in cands:
        cands.append(hero)
    got = []
    for u in cands:
        if len(got) >= want:
            break
        variants = []
        su = str(u)
        if "-d_128" in su:
            variants.append(su.replace("-d_128", "-d_1280x720"))
        variants.append(su)
        for v in variants:
            dest = out_dir / f"img{len(got)}.png"
            if download_image(v, dest):
                got.append(dest)
                break
    return got


def gradient_bg(out, W, H):
    run(["ffmpeg", "-y", "-f", "lavfi", "-i",
         f"gradients=s={W}x{H}:c0=0x0b1026:c1=0x1e1b4b:c2=0x3b1d8f:c3=0x0f0a2a",
         "-frames:v", "1", str(out)])
    return out


def wrap_for_draw(text, max_chars):
    lines = wrap_text(strip_tags(text), max_chars)
    return "\n".join(lines)


def drawtext(file_path, size, color, y, font="white", box="black@0.55",
             w=0, spacing=12, boxw=18):
    return (f"drawtext=textfile={file_path}:fontfile={FONT}:fontsize={size}:"
            f"fontcolor={color}:line_spacing={spacing}:x=(w-text_w)/2:y={y}:"
            f"box=1:boxcolor={box}:boxborderw={boxw}")


def fit_card(src, out, box_w, box_h):
    iw, ih = img_dims(src)
    scale = min(box_w / iw, box_h / ih)
    w = max(2, int(iw * scale))
    h = max(2, int(ih * scale))
    run(["ffmpeg", "-y", "-i", str(src), "-vf",
         f"scale={w}:{h},pad={w+16}:{h+16}:8:8:white", "-frames:v", "1", str(out)])
    return out


def compose_title_card(deal, card, out_png, W, H, price_chip, brand=True):
    name = short_name(deal["title"])
    bg = gradient_bg(out_png.parent / "tbg.png", W, H)
    title_lines = wrap_for_draw(name, 20 if W < 1280 else 46)
    ttl = out_png.parent / "ttl.txt"
    ttl.write_text(title_lines)
    bdg = out_png.parent / "bdg.txt"
    bdg.write_text("★ LIFETIME DEAL REVIEW")
    pc = out_png.parent / "pc.txt"
    pc.write_text(price_chip or "ONE-TIME")

    if card and card.exists():
        fit = fit_card(card, out_png.parent / "tcard.png", int(W * 0.82), int(H * 0.40))
        cw, ch = img_dims(fit)
        cardY = int(H * 0.30 - ch / 2)
        fc = (
            f"[0:v][1:v]overlay=(W-w)/2:{cardY}[v1];"
            f"[v1]{drawtext(bdg, int(H*0.028), YELLOW, int(H*0.655), box='black@0.35', boxw=14)},"
            f"{drawtext(ttl, int(H*0.052), 'white', int(H*0.71), box='black@0.30', boxw=16, spacing=16)},"
            f"{drawtext(pc, int(H*0.034), YELLOW, int(H*0.85), box='black@0.40', boxw=14)}[v]"
        )
        run(["ffmpeg", "-y", "-i", str(bg), "-i", str(fit), "-filter_complex", fc,
             "-map", "[v]", "-frames:v", "1", "-update", "1", str(out_png)])
    else:
        run(["ffmpeg", "-y", "-i", str(bg), "-vf",
             f"{drawtext(bdg, int(H*0.028), YELLOW, int(H*0.36), box='black@0.35', boxw=14)},"
             f"{drawtext(ttl, int(H*0.05), 'white', int(H*0.42), box='black@0.30', boxw=16, spacing=16)},"
             f"{drawtext(pc, int(H*0.032), YELLOW, int(H*0.56), box='black@0.40', boxw=14)}",
             "-frames:v", "1", "-update", "1", str(out_png)])
    return out_png


def compose_shot_card(img, out_png, W, H, label, caption):
    fit = fit_card(img, out_png.parent / "scard.png", int(W * 0.86), int(H * 0.42))
    cw, ch = img_dims(fit)
    cardY = int(H * 0.30 - ch / 2)
    lbl = out_png.parent / "lbl.txt"
    lbl.write_text(label)
    cap = out_png.parent / "cap.txt"
    cap.write_text(wrap_for_draw(caption, 26 if W < 1280 else 46))
    capY = int(H * 0.80)
    capW = int(W * 0.88)
    fc = (
        f"[0:v]split=2[b0][b1];"
        f"[b0]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
        f"boxblur=18:2,eq=brightness=-0.18:contrast=1.05[bg];"
        f"[b1]scale={cw}:{ch},pad={cw+16}:{ch+16}:8:8:white[card];"
        f"[bg][card]overlay=(W-w)/2:{cardY}[v1];"
        f"[v1]{drawtext(lbl, int(H*0.022), YELLOW, int(H*0.10), box='black@0.35', boxw=12)},"
        f"{drawtext(cap, int(H*0.031), 'white', capY, box='black@0.55', w=capW, spacing=12)}[v]"
    )
    run(["ffmpeg", "-y", "-i", str(img), "-filter_complex", fc, "-map", "[v]",
         "-frames:v", "1", "-update", "1", str(out_png)])
    return out_png


def compose_price_card(deal, out_png, W, H):
    bg = gradient_bg(out_png.parent / "pbg.png", W, H)
    price = fmt_price(deal.get("price"), deal.get("currency"))
    original = fmt_price(deal.get("original_price"), deal.get("currency"))
    coupon = deal.get("coupon_code")
    t = lambda n, s: (out_png.parent / f"{n}.txt").write_text(s)

    t("ptd", "TODAY ONLY")
    t("ppr", price or "LIFETIME DEAL")
    t("plt", "One-Time • Lifetime Access")
    t("por", f"Regularly {original}" if original else "")
    t("pcp", f"Coupon: {coupon}" if coupon else "14-Day Money-Back Guarantee")
    t("pcap", wrap_for_draw(f"Grab {short_name(deal['title'])} while the launch price lasts.", 26))

    dt = [drawtext(out_png.parent / "ptd.txt", int(H*0.026), YELLOW, int(H*0.24), box='black@0.35', boxw=14)]
    dt.append(drawtext(out_png.parent / "ppr.txt", int(H*0.088), YELLOW, int(H*0.34), box='black@0.0', boxw=0, spacing=4))
    dt.append(drawtext(out_png.parent / "plt.txt", int(H*0.026), 'white', int(H*0.50), box='black@0.25', boxw=12))
    if original:
        dt.append(drawtext(out_png.parent / "por.txt", int(H*0.022), GRAY, int(H*0.60), box='black@0.25', boxw=12))
    dt.append(drawtext(out_png.parent / "pcp.txt", int(H*0.024), GREEN, int(H*0.70), box='black@0.25', boxw=12))
    dt.append(drawtext(out_png.parent / "pcap.txt", int(H*0.028), 'white', int(H*0.83), box='black@0.55', boxw=16, w=int(W*0.9)))
    run(["ffmpeg", "-y", "-i", str(bg), "-vf", ",".join(dt), "-frames:v", "1", str(out_png)])
    return out_png


def compose_cta_card(deal, out_png, W, H):
    bg = gradient_bg(out_png.parent / "cbg.png", W, H)
    name = short_name(deal["title"])
    aff = (deal.get("affiliate_url") or "").replace("https://", "")
    t = lambda n, s: (out_png.parent / f"{n}.txt").write_text(s)

    t("cgo", wrap_for_draw(f"Get {name}", 22 if W < 1280 else 60))
    t("curl", wrap_for_draw(aff, 30 if W < 1280 else 60))
    t("cbd", "Before The Deal Expires")
    t("ccap", "Full review + link in the description below.")

    dt = [
        drawtext(out_png.parent / "cgo.txt", int(H*0.052), 'white', int(H*0.28), box='black@0.30', boxw=16, spacing=14),
        drawtext(out_png.parent / "curl.txt", int(H*0.024), YELLOW, int(H*0.48), box='black@0.35', boxw=12, spacing=10),
        drawtext(out_png.parent / "cbd.txt", int(H*0.026), GREEN, int(H*0.60), box='black@0.25', boxw=12),
        drawtext(out_png.parent / "ccap.txt", int(H*0.028), 'white', int(H*0.83), box='black@0.55', boxw=16, w=int(W*0.9)),
    ]
    run(["ffmpeg", "-y", "-i", str(bg), "-vf", ",".join(dt), "-frames:v", "1", str(out_png)])
    return out_png


def make_video(deal, out_dir, format_, demo_images=None):
    """Render an original faceless video for a deal. format_: 'short' | 'standard'."""
    out_dir.mkdir(parents=True, exist_ok=True)
    name = short_name(deal["title"])
    price = fmt_price(deal.get("price"), deal.get("currency"))
    highlights = [strip_tags(h) for h in (deal.get("highlights") or []) if strip_tags(h)]
    desc = strip_tags(deal.get("description")) or ""

    if format_ == "short":
        W, H = 1080, 1920
    else:
        W, H = 1280, 720

    imgs = fetch_images(deal, demo_images, out_dir, want=3)
    card0 = imgs[0] if imgs else None
    shot1 = imgs[1] if len(imgs) > 1 else card0
    shot2 = imgs[2] if len(imgs) > 2 else (card0 or shot1)

    hook = f"{name}. Full review right now."
    what = (desc[:130] or f"{name} — the full breakdown.") + ("..." if len(desc) > 130 else "")
    feat_text = (f"Key features: {highlights[0]}" if highlights else
                 f"Everything you need, in one dashboard.")
    feat_text = feat_text[:120]
    if price:
        why = (f"Normally {deal.get('original_price') and fmt_price(deal.get('original_price'), deal.get('currency'))}, "
               f"today you pay just {price} one-time.")
        why = f"Today you pay just {price} one-time." if not deal.get("original_price") else why
    else:
        why = "Grab it while the one-time lifetime price is still available."
    cta = "Click the link in the description to get it before the deal expires."

    title_png = compose_title_card(deal, card0, out_dir / "s1.png", W, H, price or "LIFETIME DEAL")
    s2_png = compose_shot_card(shot1, out_dir / "s2.png", W, H, "WHAT IT DOES", what)
    s3_png = compose_shot_card(shot2, out_dir / "s3.png", W, H, "KEY FEATURES", feat_text)
    s4_png = compose_price_card(deal, out_dir / "s4.png", W, H)
    s5_png = compose_cta_card(deal, out_dir / "s5.png", W, H)

    scenes = [
        ("s1", title_png, hook, 8),
        ("s2", s2_png, what, 9),
        ("s3", s3_png, feat_text, 9),
        ("s4", s4_png, why, 8),
        ("s5", s5_png, cta, 8),
    ]

    segs = []
    for sid, png, tts_text, sdur in scenes:
        mp3 = out_dir / f"{sid}.mp3"
        asyncio.run(gen_tts(tts_text, mp3))
        adur = audio_duration(mp3)
        clip_dur = max(sdur, adur + 0.6)
        D = int(clip_dur * 30)
        seg = out_dir / f"{sid}.mp4"
        run(["ffmpeg", "-y", "-loop", "1", "-i", str(png),
             "-vf", f"scale={W+60}:{H+60},zoompan=z='min(zoom+0.0007,1.06)':d={D}:s={W}x{H}:fps=30,"
                    f"fade=t=in:st=0:d=0.4,fade=t=out:st={clip_dur-0.5}:d=0.5",
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
             "-t", f"{clip_dur:.2f}", str(seg)])
        aout = out_dir / f"{sid}_a.mp4"
        run(["ffmpeg", "-y", "-i", str(seg), "-i", str(mp3),
             "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", str(aout)])
        mp3.unlink(missing_ok=True)
        seg.unlink(missing_ok=True)
        segs.append(aout)

    listf = out_dir / "concat.txt"
    listf.write_text("".join(f"file '{p}'\n" for p in segs))
    video = out_dir / "video.mp4"
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listf),
         "-c", "copy", str(video)])
    for s in segs:
        s.unlink(missing_ok=True)
    return video


def make_thumbnail(deal, out_dir, face_url=None, format_="short"):
    """Title-card style thumbnail (1080x1920 for shorts, 1280x720 otherwise),
    so the thumbnails finally make sense: product shot + name + price."""
    W, H = (1080, 1920) if format_ == "short" else (1280, 720)
    price = fmt_price(deal.get("price"), deal.get("currency"))
    hero = deal.get("hero_image")
    card = out_dir / "thumb_card.png"
    # Prefer the real product-UI frame from the webinar demo; only fall back to
    # hero_image (which may hold a previous AI thumbnail).
    frame = Path("/tmp/affilirank-thumbs/frames") / f"{deal.get('slug') or deal['id']}.jpg"
    if frame.exists():
        card = frame
    elif hero and hero.startswith("http"):
        download_image(hero, card)
    if not card.exists():
        card = None
    return compose_title_card(deal, card, out_dir / "thumb.png", W, H,
                              (price + " ONE-TIME") if price else "LIFETIME DEAL")


# ─── YouTube upload (resumable) ──────────────────────────────────────────


def upload_video(access_token, title, description, video_path, thumb_path, privacy="unlisted"):
    """Upload via the YouTube resumable upload API; returns (video_id, url)."""
    meta = json.dumps({
        "snippet": {
            "title": title[:100],
            "description": description[:5000],
            "categoryId": "22",
        },
        "status": {"privacyStatus": privacy, "selfDeclaredMadeForKids": False},
    })

    # 1) Initialize the resumable session — body is the JSON metadata only.
    upload_url = (
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable"
        "&part=snippet,status"
    )
    init_req = urllib.request.Request(upload_url, data=meta.encode(), method="POST", headers={
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=UTF-8",
    })
    try:
        with urllib.request.urlopen(init_req, timeout=60) as r:
            resumable = r.headers["Location"]
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"upload init HTTP {e.code}: {e.read()[:400]}")

    # 2) Stream the video bytes to the session URI.
    size = video_path.stat().st_size
    put_req = urllib.request.Request(resumable, data=video_path.read_bytes(), method="PUT", headers={
        "Content-Type": "video/mp4",
        "Content-Length": str(size),
    })
    try:
        with urllib.request.urlopen(put_req, timeout=1200) as r:
            resp = json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"upload HTTP {e.code}: {e.read()[:400]}")

    vid = resp.get("id")
    return vid, f"https://www.youtube.com/watch?v={vid}"


def set_thumbnail(access_token, video_id, thumb_path):
    boundary = "----affilirankthumb" + str(int(time.time() * 1000))
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="thumb.png"\r\n'
        f"Content-Type: image/png\r\n\r\n"
    ).encode() + thumb_path.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
    url = f"https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId={video_id}"
    req = urllib.request.Request(url, data=body, method="POST", headers={
        "Authorization": f"Bearer {access_token}",
        "Content-Type": f"multipart/form-data; boundary={boundary}",
    })
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status
    except urllib.error.HTTPError as e:
        print(f"  [warn] thumbnail failed HTTP {e.code}: {e.read()[:200]}")
        return None


def get_youtube_auth():
    rows = rest("/settings?select=*&id=eq.1&limit=1")
    if not rows:
        raise RuntimeError("No settings row found (run the SQL migration first)")
    auth = (rows[0] or {}).get("youtube_auth")
    if not auth:
        raise RuntimeError("YouTube not connected — connect a channel in Admin > Auto-Publish first")
    return auth


def refresh_token(auth):
    body = urllib.parse.urlencode({
        "client_id": os.environ.get("GOOGLE_CLIENT_ID", ""),
        "client_secret": os.environ.get("GOOGLE_CLIENT_SECRET", ""),
        "refresh_token": auth["refresh_token"],
        "grant_type": "refresh_token",
    }).encode()
    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=body, method="POST", headers={
        "Content-Type": "application/x-www-form-urlencoded",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"token refresh failed HTTP {e.code}: {e.read()[:300]}")


def get_valid_token(auth):
    if time.time() * 1000 >= auth.get("expires_at", 0):
        refreshed = refresh_token(auth)
        auth["access_token"] = refreshed["access_token"]
        auth["expires_at"] = time.time() * 1000 + (refreshed.get("expires_in", 3600) * 1000)
        rest("/settings?id=eq.1", "PATCH", {"youtube_auth": auth})
    return auth["access_token"]


def set_deal_status(deal_id, status, video_id=None, url=None):
    patch = {"auto_post_status": status}
    if video_id:
        patch["youtube_video_id"] = video_id
    if url:
        patch["youtube_url"] = url
    rest(f"/products?id=eq.{urllib.parse.quote(deal_id)}", "PATCH", patch)


def fetch_pending():
    rows = rest("/products?select=*&auto_post_status=eq.pending&limit=5")
    return rows or []


def make_ai_thumbnail(deal, out_dir):
    """AI thumbnail via the purchaser's own Gemini key (from Supabase settings).

    Falls back to the ffmpeg design engine by returning None if no key is set
    or the API call fails — the caller keeps its existing thumbnail.
    """
    try:
        path = Path(__file__).resolve().parent / "make-ai-thumbnails.py"
        spec = importlib.util.spec_from_file_location("make_ai_thumbnails", path)
        mod = importlib.util.module_from_spec(spec)
        sys.modules["make_ai_thumbnails"] = mod
        spec.loader.exec_module(mod)
        if not getattr(mod, "KEY", ""):
            print("  no Gemini key — using design-engine thumbnail")
            return None
        av = mod.WORK / "avatar.png"
        if not av.exists():
            download_image(mod.AVATAR_URL, av, min_bytes=2000)
        out = out_dir / "thumb.png"
        # Always feed the real product-UI frame (from the webinar demo) as the
        # hero card so AI regeneration never consumes a previous AI thumbnail
        # stored in hero_image.
        frame = mod.FRAMES / f"{deal.get('slug') or deal['id']}.jpg"
        thumb_image = frame if frame.exists() else None
        mod.make_one(deal, av, deal.get("slug") or deal["id"],
                     thumb_image=thumb_image, out=out)
        print(f"  thumb: {out} (ai)")
        return out
    except Exception as e:
        print(f"  [warn] AI thumbnail failed: {e} — using design engine")
        return None


def process_deal(deal, format_, face_url=None, face_enabled=True):
    name = short_name(deal["title"])
    print(f"▶ {name}")
    out_dir = WORK / (deal["slug"] or deal["id"])
    shutil.rmtree(out_dir, ignore_errors=True)

    demo = (DEMO_ASSETS.get(deal.get("slug") or "") or {}).get("demo_images") or []
    video = make_video(deal, out_dir, format_, demo_images=demo)
    thumb = make_ai_thumbnail(deal, out_dir) or make_thumbnail(deal, out_dir, None, format_=format_)
    print(f"  video: {video} ({video.stat().st_size/1e6:.1f} MB)")

    auth = get_youtube_auth()
    token = get_valid_token(auth)

    title = f"{name} — Lifetime Deal Review ({time.strftime('%Y')})"
    description = build_description(deal)
    vid, url = upload_video(token, title, description, video, thumb, privacy="public")
    print(f"  uploaded: {url}")
    set_thumbnail(token, vid, thumb)
    set_deal_status(deal["id"], "posted", vid, url)
    shutil.rmtree(out_dir, ignore_errors=True)
    return url


def main():
    if not (SUPABASE_URL and SERVICE_KEY):
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    format_ = "short"
    face_enabled = True
    try:
        s = rest("/settings?select=autopublish&id=eq.1&limit=1")
        autopublish = (s[0] or {}).get("autopublish") or {}
        format_ = autopublish.get("format", "short")
        face_enabled = autopublish.get("profile_in_thumbnails", True)
        gemini_key = (autopublish.get("gemini_api_key") or "").strip()
        if gemini_key and not os.environ.get("GEMINI_API_KEY"):
            os.environ["GEMINI_API_KEY"] = gemini_key
            print(f"  Gemini key loaded from site settings "
                  f"({gemini_key[:6]}…{gemini_key[-4:]})")
        if autopublish.get("enabled") is False and os.environ.get("FORCE") != "1":
            print("Auto-publish is disabled in settings (FORCE=1 overrides).")
    except Exception as e:
        print(f"[warn] could not read settings: {e}")

    pending = fetch_pending()
    if not pending:
        print("No pending deals.")
        return

    failures = 0
    for deal in pending:
        try:
            process_deal(deal, format_, face_enabled=face_enabled)
        except Exception as e:
            failures += 1
            print(f"  [error] {e}")
            try:
                current = (rest(f"/products?select=auto_post_status&id=eq.{urllib.parse.quote(deal['id'])}&limit=1") or [{}])[0]
                if (current.get("auto_post_status") or "pending") != "pending":
                    set_deal_status(deal["id"], "failed")
            except Exception:
                pass
            if failures >= MAX_FAILURES:
                print("Too many failures, stopping.")
                sys.exit(1)
    print("Done.")


if __name__ == "__main__":
    main()
