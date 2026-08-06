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
    return (title.split("|")[0] or title).strip()


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
    summary = (desc[:280] + "...") if desc and len(desc) > 280 else (desc or f"Full review of {name} — lifetime deal, pricing, features and bonuses.")
    price = fmt_price(deal.get("price"), deal.get("currency"))
    original = fmt_price(deal.get("original_price"), deal.get("currency"))

    lines = [f"{name} — Full Review + Bonuses", ""]
    if summary:
        lines.append(summary)
        lines.append("")
    lines.append("🔥 Get it here: " + (deal.get("affiliate_url") or ""))
    if deal.get("bundle_url"):
        lines.append("🚀 Best value — Get The Bundle: " + deal["bundle_url"])
    for fl in deal.get("funnel_links") or []:
        label = fl.get("label") or "Upgrade"
        url = fl.get("url") or ""
        if url and url != deal.get("affiliate_url"):
            lines.append(f"⚡ {label}: {url}")
    lines.append("")
    lines.append(f"💰 Price: {price}" + (f" (regularly {original})" if original else ""))
    lines.append(f"More lifetime deals: {SITE_URL}")
    lines.append("")
    tags = ["affiliatemarketing", "jvzoo", "lifetimedeal", "onlinemarketing", "make-money-online"]
    name_tag = re.sub(r"[^a-z0-9]+", "", name.lower())[:20]
    if name_tag:
        tags.insert(0, name_tag)
    lines.append("#" + " #".join(tags))
    return "\n".join(lines)


def make_video(deal, out_dir, format_):
    """Render an original faceless video for a deal. format_: 'short' | 'standard'."""
    out_dir.mkdir(parents=True, exist_ok=True)
    name = short_name(deal["title"])
    hero = deal.get("hero_image")
    price = fmt_price(deal.get("price"), deal.get("currency"))
    original = fmt_price(deal.get("original_price"), deal.get("currency"))

    if format_ == "short":
        W, H, dur = 1080, 1920, 42
    else:
        W, H, dur = 1280, 720, 42

    # Narrations (hook -> what -> why now -> CTA)
    hook = f"{name}. Get the full breakdown right here."
    what = f"{name} is live as a lifetime deal on JVZoo right now."
    why = (f"Normally {original}, today you pay just {price} one-time." if price
           else "Grab it while the one-time lifetime price is still available.")
    cta = "Click the link below to get it before the deal expires."

    scenes = [
        ("s1", hook, 8),
        ("s2", what, 10),
        ("s3", why, 10),
        ("s4", cta, 14),
    ]

    audio_paths = {}
    for sid, text, _ in scenes:
        mp3 = out_dir / f"{sid}.mp3"
        asyncio.run(gen_tts(text, mp3))
        audio_paths[sid] = mp3

    # Background image — fetch the product hero, else a gradient fallback
    bg = out_dir / "bg.png"
    if hero and hero.startswith("http"):
        try:
            req = urllib.request.Request(hero, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=20) as r:
                bg.write_bytes(r.read())
        except Exception:
            bg.unlink(missing_ok=True)
    if not bg.exists() or bg.stat().st_size < 1000:
        run(["ffmpeg", "-y", "-f", "lavfi", "-i",
             f"color=c=0x14162e:s={W}x{H}:d=1", "-frames:v", "1", str(bg)])

    # Build per-scene clips with Ken Burns + text overlays
    segs = []
    offset = 0.0
    for sid, text, sdur in scenes:
        mp3 = audio_paths[sid]
        adur = audio_duration(mp3)
        clip_dur = max(sdur, adur + 0.6)
        zoom = f"1.0+{0.15/clip_dur/30:.6f}"
        vf = (
            f"zoompan=z='if(eq(on,1),1.0,{zoom})':d={int(clip_dur*30)}:s={W}x{H}:fps=30,"
            f"fade=t=in:st=0:d=0.5,fade=t=out:st={clip_dur-0.6}:d=0.6"
        )
        # Overlay title text + price for CTA scene
        if sid == "s4" and price:
            vf += f",drawtext=text='{price}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize={int(H*0.11)}:fontcolor=0xFFB300:x=(w-text_w)/2:y=h*0.58:borderw=4:bordercolor=black@0.7"
        seg = out_dir / f"{sid}.mp4"
        run(["ffmpeg", "-y", "-loop", "1", "-i", str(bg), "-i", str(mp3),
             "-vf", vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
             "-c:a", "aac", "-b:a", "160k", "-pix_fmt", "yuv420p",
             "-t", f"{clip_dur:.2f}", "-shortest", str(seg)])
        segs.append(seg)
        offset += clip_dur

    # Concat all scenes
    listf = out_dir / "concat.txt"
    listf.write_text("".join(f"file '{p}'\n" for p in segs))
    video = out_dir / "video.mp4"
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listf),
         "-c", "copy", str(video)])

    for p in audio_paths.values():
        p.unlink(missing_ok=True)
    for s in segs:
        s.unlink(missing_ok=True)
    return video


def make_thumbnail(deal, out_dir, face_url=None):
    """1280x720 PNG thumbnail: product image + title + price badge, plus an
    optional circular channel-avatar overlay (top-left) to boost CTR."""
    out_dir.mkdir(parents=True, exist_ok=True)
    W, H = 1280, 720
    name = short_name(deal["title"])[:60]
    price = fmt_price(deal.get("price"), deal.get("currency"))
    hero = deal.get("hero_image")

    bg = out_dir / "thumb_bg.png"
    if hero and hero.startswith("http"):
        try:
            req = urllib.request.Request(hero, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=20) as r:
                bg.write_bytes(r.read())
        except Exception:
            pass
    if not bg.exists() or bg.stat().st_size < 1000:
        run(["ffmpeg", "-y", "-f", "lavfi", "-i",
             f"gradients=s={W}x{H}:c0=0x1e1b4b:c1=0x0891b2", "-frames:v", "1", str(bg)])

    face = out_dir / "face.png"
    if face_url and face_url.startswith("http"):
        try:
            req = urllib.request.Request(face_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=20) as r:
                face.write_bytes(r.read())
        except Exception:
            face.unlink(missing_ok=True)
        if face.exists() and face.stat().st_size < 1000:
            face.unlink(missing_ok=True)

    thumb = out_dir / "thumb.png"
    if face.exists():
        # [bg0] blurred product shot + title + price
        bg_vf = (
            f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=8:2,"
            f"drawtext=text='{name}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize=56:fontcolor=white:x=(w-text_w)/2:y=h*0.68:borderw=4:bordercolor=black@0.8"
        )
        if price:
            bg_vf += (
                f",drawtext=text='{price} ONE-TIME':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize=44:fontcolor=0xFFB300:x=(w-text_w)/2:y=h*0.82:borderw=4:bordercolor=black@0.8"
            )
        fc = (
            f"[0:v]{bg_vf}[bg0];"
            f"color=c=white:s=212x212,format=rgba,"
            f"geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(hypot(X-106,Y-106),100),255,0)'[ring];"
            f"[1:v]scale=192:192:force_original_aspect_ratio=increase,crop=192:192,format=rgba,"
            f"geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(hypot(X-96,Y-96),92),255,0)'[face];"
            f"[bg0][ring]overlay=x=24:y=24[bg1];"
            f"[bg1][face]overlay=x=34:y=34"
        )
        run(["ffmpeg", "-y", "-i", str(bg), "-i", str(face),
             "-filter_complex", fc, "-frames:v", "1", str(thumb)])
    else:
        vf = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=8:2"
        vf += f",drawtext=text='{name}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize=56:fontcolor=white:x=(w-text_w)/2:y=h*0.68:borderw=4:bordercolor=black@0.8"
        if price:
            vf += f",drawtext=text='{price} ONE-TIME':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize=44:fontcolor=0xFFB300:x=(w-text_w)/2:y=h*0.82:borderw=4:bordercolor=black@0.8"
        run(["ffmpeg", "-y", "-i", str(bg), "-vf", vf, "-frames:v", "1", str(thumb)])
    return thumb


# ─── YouTube upload (resumable) ──────────────────────────────────────────


def upload_video(access_token, title, description, video_path, thumb_path, privacy="unlisted"):
    """Upload via the YouTube resumable upload API; returns (video_id, url)."""
    boundary = "----affilirank" + str(int(time.time() * 1000))
    meta = json.dumps({
        "snippet": {
            "title": title[:100],
            "description": description[:5000],
            "categoryId": "22",
        },
        "status": {"privacyStatus": privacy, "selfDeclaredMadeForKids": False},
    })

    def field(name, value):
        return (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
            f"{value}\r\n"
        ).encode()

    def file_field(name, filename, path, ctype):
        return (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'
            f"Content-Type: {ctype}\r\n\r\n"
        ).encode() + path.read_bytes() + b"\r\n"

    body = (
        field("metadata", meta)
        + file_field("file", video_path.name, video_path, "video/mp4")
        + f"--{boundary}--\r\n".encode()
    )

    upload_url = (
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable"
        "&part=snippet,status"
    )
    init_req = urllib.request.Request(upload_url, data=body, method="POST", headers={
        "Authorization": f"Bearer {access_token}",
        "Content-Type": f"multipart/related; boundary={boundary}",
        "Content-Length": str(len(body)),
    })
    try:
        with urllib.request.urlopen(init_req, timeout=60) as r:
            resumable = r.headers["Location"]
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"upload init HTTP {e.code}: {e.read()[:400]}")

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


def process_deal(deal, format_, face_url=None, face_enabled=True):
    name = short_name(deal["title"])
    print(f"▶ {name}")
    out_dir = WORK / (deal["slug"] or deal["id"])
    shutil.rmtree(out_dir, ignore_errors=True)

    if face_enabled and not face_url:
        try:
            face_url = (get_youtube_auth() or {}).get("channel_avatar")
        except Exception:
            face_url = None

    video = make_video(deal, out_dir, format_)
    thumb = make_thumbnail(deal, out_dir, face_url)
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
