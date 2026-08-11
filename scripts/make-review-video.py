#!/usr/bin/env python3
"""
AffiliRank review-video renderer (1280x720 horizontal, 2-4 min).

Builds a real review-style video per deal:
  hook/title card → live product-demo clips (from the vendor webinar/feature
  videos, used with permission) → narrated review over screenshots → price → CTA.

Demo clips play the presenter's own audio at full volume — no narration speaks
over them. The review segment at the end carries the voiceover + captions.
Voiceover is ElevenLabs (falls back to edge-tts). Each deal's structure comes
from `webinar-assets.json`; any deal without live clips falls back to
screenshot feature cards.

Usage:
  python3 make-review-video.py <deal.json|deal_slug> <out_dir>
"""
import asyncio
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

VENDOR_VIDEO_DIR = Path(__import__("os").environ.get("VENDOR_VIDEO_DIR", "/tmp/opencode/vendor-videos"))
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
YELLOW = "0xFFB300"
GRAY = "0x9CA3AF"
GREEN = "0x34D399"
RED = "0xFF5252"

import importlib.util

sys.path.insert(0, str(Path(__file__).resolve().parent))
_AP_PATH = Path(__file__).resolve().parent / "auto-publisher.py"
_AP_SPEC = importlib.util.spec_from_file_location("auto_publisher", _AP_PATH)
_AP_MOD = importlib.util.module_from_spec(_AP_SPEC)
sys.modules["auto_publisher"] = _AP_MOD
_AP_SPEC.loader.exec_module(_AP_MOD)
from auto_publisher import (  # noqa: E402
    short_name, strip_tags, fmt_price, run, audio_duration, img_dims,
    gradient_bg, wrap_for_draw, drawtext, download_image, gen_tts,
)


def fit_card(src, out, box_w, box_h):
    iw, ih = img_dims(src)
    scale = min(box_w / iw, box_h / ih)
    w = max(2, int(iw * scale))
    h = max(2, int(ih * scale))
    run(["ffmpeg", "-y", "-i", str(src), "-vf",
         f"scale={w}:{h},pad={w+16}:{h+16}:8:8:white", "-frames:v", "1", str(out)])
    return out


# ─── Card renders (Ken Burns) ───────────────────────────────────────────────


def ken_burns_card(png, out_mp4, W, H, dur, audio_mp3=None):
    D = int(dur * 30)
    seg = out_mp4
    run(["ffmpeg", "-y", "-loop", "1", "-i", str(png),
         "-vf", f"scale={W+60}:{H+60},zoompan=z='min(zoom+0.0007,1.06)':d={D}:s={W}x{H}:fps=30,"
                f"setsar=1,"
                f"fade=t=in:st=0:d=0.4,fade=t=out:st={dur-0.5}:d=0.5",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
         "-t", f"{dur:.2f}", str(seg)])
    if audio_mp3:
        aout = seg.with_name(seg.stem + "_a.mp4")
        run(["ffmpeg", "-y", "-i", str(seg), "-i", str(audio_mp3),
             "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
             "-ar", "48000", "-ac", "2", "-shortest", str(aout)])
        seg.unlink(missing_ok=True)
        return aout
    return seg


def compose_title(deal, card, out_png, W, H):
    name = short_name(deal["title"])
    bg = gradient_bg(out_png.parent / "tbg.png", W, H)
    ttl = out_png.parent / "ttl.txt"
    ttl.write_text(wrap_for_draw(name, 40))
    bdg = out_png.parent / "bdg.txt"
    bdg.write_text("★ FULL REVIEW  ·  LIFETIME DEAL")
    tag = out_png.parent / "tag.txt"
    tag.write_text("Real demo inside")
    if card and card.exists():
        fit = fit_card(card, out_png.parent / "tcard.png", int(W * 0.72), int(H * 0.46))
        cw, ch = img_dims(fit)
        cardY = int(H * 0.20 - ch / 2)
        fc = (
            f"[0:v][1:v]overlay=(W-w)/2:{cardY}[v1];"
            f"[v1]{drawtext(bdg, int(H*0.036), YELLOW, int(H*0.68), box='black@0.35', boxw=14)},"
            f"{drawtext(ttl, int(H*0.055), 'white', int(H*0.76), box='black@0.30', boxw=16, spacing=16)},"
            f"{drawtext(tag, int(H*0.028), GREEN, int(H*0.90), box='black@0.35', boxw=14)}[v]"
        )
        run(["ffmpeg", "-y", "-i", str(bg), "-i", str(fit), "-filter_complex", fc,
             "-map", "[v]", "-frames:v", "1", "-update", "1", str(out_png)])
    else:
        run(["ffmpeg", "-y", "-i", str(bg), "-vf",
             f"{drawtext(bdg, int(H*0.036), YELLOW, int(H*0.42), box='black@0.35', boxw=14)},"
             f"{drawtext(ttl, int(H*0.05), 'white', int(H*0.50), box='black@0.30', boxw=16, spacing=16)},"
             f"{drawtext(tag, int(H*0.028), GREEN, int(H*0.68), box='black@0.35', boxw=14)}",
             "-frames:v", "1", "-update", "1", str(out_png)])
    return out_png


def compose_pain(pain, out_png, W, H, idx):
    bg = gradient_bg(out_png.parent / f"painbg{idx}.png", W, H)
    x = out_png.parent / f"pain{idx}.txt"
    x.write_text(wrap_for_draw(pain, 44))
    lbl = out_png.parent / f"painlbl{idx}.txt"
    lbl.write_text("THE PROBLEM")
    fc = (
        f"[0:v]{drawtext(lbl, int(H*0.034), RED, int(H*0.30), box='black@0.35', boxw=14)},"
        f"{drawtext(x, int(H*0.045), 'white', int(H*0.42), box='black@0.35', boxw=18, spacing=14)}[v]"
    )
    run(["ffmpeg", "-y", "-i", str(bg), "-filter_complex", fc,
         "-map", "[v]", "-frames:v", "1", str(out_png)])
    return out_png


def compose_stats(stats, out_png, W, H):
    bg = gradient_bg(out_png.parent / "sbg.png", W, H)
    lbl = out_png.parent / "slbl.txt"
    lbl.write_text("WHY IT MATTERS")
    t = lambda n, s: (out_png.parent / n).write_text(wrap_for_draw(s, 40))
    fs = int(H * 0.038)
    base = int(H * 0.42)
    gap = int(H * 0.10)
    dt = [drawtext(lbl, int(H*0.034), YELLOW, int(H*0.24), box='black@0.35', boxw=14)]
    for i, s in enumerate(stats[:4]):
        f = out_png.parent / f"stat{i}.txt"
        f.write_text(f"▸  {s}")
        dt.append(drawtext(f, fs, "white", base + i * gap, box='black@0.30', boxw=12))
    run(["ffmpeg", "-y", "-i", str(bg), "-vf", ",".join(dt),
         "-frames:v", "1", str(out_png)])
    return out_png


def compose_price(deal, out_png, W, H):
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
    dt = [drawtext(out_png.parent / "ptd.txt", int(H*0.030), YELLOW, int(H*0.26), box='black@0.35', boxw=14)]
    dt.append(drawtext(out_png.parent / "ppr.txt", int(H*0.10), YELLOW, int(H*0.36), box='black@0.0', boxw=0, spacing=4))
    dt.append(drawtext(out_png.parent / "plt.txt", int(H*0.030), "white", int(H*0.53), box='black@0.25', boxw=12))
    if original:
        dt.append(drawtext(out_png.parent / "por.txt", int(H*0.026), GRAY, int(H*0.63), box='black@0.25', boxw=12))
    dt.append(drawtext(out_png.parent / "pcp.txt", int(H*0.028), GREEN, int(H*0.73), box='black@0.25', boxw=12))
    run(["ffmpeg", "-y", "-i", str(bg), "-vf", ",".join(dt), "-frames:v", "1", str(out_png)])
    return out_png


def compose_cta(deal, out_png, W, H):
    bg = gradient_bg(out_png.parent / "cbg.png", W, H)
    name = short_name(deal["title"])
    aff = (deal.get("affiliate_url") or "").replace("https://", "")
    t = lambda n, s: (out_png.parent / f"{n}.txt").write_text(s)
    t("cgo", wrap_for_draw(f"Get {name}", 46))
    t("curl", wrap_for_draw(aff, 44))
    t("cbd", "Before The Deal Expires")
    t("ccap", "Full review + link in the description below.")
    dt = [
        drawtext(out_png.parent / "cgo.txt", int(H*0.062), "white", int(H*0.28), box='black@0.30', boxw=16, spacing=14),
        drawtext(out_png.parent / "curl.txt", int(H*0.028), YELLOW, int(H*0.48), box='black@0.35', boxw=12, spacing=10),
        drawtext(out_png.parent / "cbd.txt", int(H*0.030), GREEN, int(H*0.60), box='black@0.25', boxw=12),
        drawtext(out_png.parent / "ccap.txt", int(H*0.032), "white", int(H*0.83), box='black@0.55', boxw=16, w=int(W*0.9)),
    ]
    run(["ffmpeg", "-y", "-i", str(bg), "-vf", ",".join(dt), "-frames:v", "1", str(out_png)])
    return out_png


# ─── Demo clip render ──────────────────────────────────────────────────────


def clip_scene(src, start, end, label, caption, out_mp4, W, H, vo_mp3=None):
    dur = round(end - start, 2)
    lblf = out_mp4.parent / "clabel.txt"
    lblf.write_text(label)
    capf = out_mp4.parent / "ccap.txt"
    capf.write_text(wrap_for_draw(caption, 52))
    caph = int(H * 0.16)
    lbl_y = H - caph + 20
    cap_y = H - caph + int(H * 0.085)
    vf = (
        f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
        f"fps=30,setsar=1,format=yuv420p,"
        f"eq=contrast=1.04:saturation=1.06,"
        f"drawbox=x=0:y=ih-{caph}:w=iw:h={caph}:color=black@0.62:t=fill,"
        f"drawtext=textfile={lblf}:fontfile={FONT}:fontsize={int(H*0.032)}:"
        f"fontcolor={YELLOW}:x=40:y={lbl_y}:box=0,"
        f"drawtext=textfile={capf}:fontfile={FONT}:fontsize={int(H*0.028)}:"
        f"fontcolor=white:line_spacing=8:x=40:y={cap_y}:box=0,"
        f"fade=t=in:st=0:d=0.4,fade=t=out:st={dur-0.5}:d=0.5"
    )
    run(["ffmpeg", "-y", "-ss", f"{start}", "-t", f"{dur}", "-i", str(src),
         "-vf", vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
         "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2", str(out_mp4)])
    if vo_mp3 and vo_mp3.exists():
        aout = out_mp4.with_name(out_mp4.stem + "_a.mp4")
        run(["ffmpeg", "-y", "-i", str(out_mp4), "-i", str(vo_mp3),
             "-filter_complex", f"[0:a]volume=0.18[a0];[a0][1:a]amix=inputs=2:duration=first:dropout_transition=0,aresample=48000,pan=stereo|c0=c0|c1=c1[a]",
             "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
             "-ar", "48000", "-ac", "2", str(aout)])
        out_mp4.unlink(missing_ok=True)
        return aout
    return out_mp4


# ─── Assembler ─────────────────────────────────────────────────────────────


def asyncio_run(coro):
    try:
        asyncio.run(coro)
    except RuntimeError:
        loop = asyncio.new_event_loop()
        loop.run_until_complete(coro)
        loop.close()


def render(deal, assets, out_dir):
    W, H = 1280, 720
    out_dir.mkdir(parents=True, exist_ok=True)
    name = short_name(deal["title"])
    demos = assets.get("demos") or []
    imgs = []
    for u in (assets.get("demo_images") or []) + ([deal.get("hero_image")] if deal.get("hero_image") else []):
        if not u:
            continue
        dest = out_dir / f"img{len(imgs)}.png"
        if download_image(u, dest):
            imgs.append(dest)
        if len(imgs) >= 3:
            break
    card0 = imgs[0] if imgs else None
    shots = imgs[1:] or (imgs or [])

    review = assets.get("review") or {}
    segs = []

    def add_card(png, tts_text, min_dur):
        mp3 = out_dir / f"seg{len(segs)}.mp3"
        asyncio_run(gen_tts(tts_text, mp3))
        dur = max(min_dur, audio_duration(mp3) + 0.8)
        segs.append(ken_burns_card(png, out_dir / f"seg{len(segs)}.mp4", W, H, dur, mp3))
        mp3.unlink(missing_ok=True)

    def add_clip(demo):
        src = VENDOR_VIDEO_DIR / demo["src"]
        if not src.exists():
            print(f"  [warn] missing demo source {src}, skipping clip")
            return
        segs.append(clip_scene(src, demo["start"], demo["end"], demo["label"],
                               demo["caption"], out_dir / f"seg{len(segs)}.mp4", W, H))

    # 1) Title hook — short narration, presenter not speaking yet
    title_png = compose_title(deal, card0, out_dir / "s_title.png", W, H)
    add_card(title_png, f"{name}. A full review with a real product demo. Watch it in action, then an honest breakdown of the features, the price, and what you actually get.", 7.0)

    # 2) Live demo clips — presenter's own audio at full volume, no VO over them
    if demos:
        for d in demos[:6]:
            add_clip(d)
    else:
        for i, shot in enumerate(shots[:3]):
            lbl = "WHAT IT DOES" if i == 0 else "IN ACTION"
            png = fit_card(shot, out_dir / f"s_shot{i}.png", int(W * 0.86), int(H * 0.62))
            add_card(png, f"{name} in action. {lbl.lower()} demo straight from the dashboard.", 6.5)

    # 3) Narrated review segment — voiceover + captions over screenshots
    def review_card(idx, label, text, shot):
        png = fit_card(shot, out_dir / f"s_r{idx}.png", int(W * 0.86), int(H * 0.60))
        cap_lbl = out_dir / f"r{idx}_lbl.txt"
        cap_lbl.write_text(label)
        cap_txt = out_dir / f"r{idx}_txt.txt"
        cap_txt.write_text(wrap_for_draw(text, 52))
        cap = out_dir / f"r{idx}_cap.png"
        run(["ffmpeg", "-y", "-i", str(png), "-vf",
             f"drawbox=x=0:y=ih-{int(H*0.14)}:w=iw:h={int(H*0.14)}:color=black@0.62:t=fill,"
             f"drawtext=textfile={cap_lbl}:fontfile={FONT}:fontsize={int(H*0.032)}:"
             f"fontcolor={YELLOW}:x=(w-text_w)/2:y=h-{int(H*0.13)}:box=0,"
             f"drawtext=textfile={cap_txt}:fontfile={FONT}:fontsize={int(H*0.030)}:"
             f"fontcolor=white:line_spacing=8:x=(w-text_w)/2:y=h-{int(H*0.085)}:box=0",
             "-frames:v", "1", str(cap)])
        return cap

    shot0 = shots[0] if shots else card0
    shot1 = shots[1] if len(shots) > 1 else shot0
    if review.get("what") and shot0:
        add_card(review_card(1, "WHAT IT DOES", review["what"], shot0),
                 review.get("what_vo") or review["what"], 8.0)
    if review.get("why") and shot1:
        add_card(review_card(2, "WHY IT HELPS YOUR BUSINESS", review["why"], shot1),
                 review.get("why_vo") or review["why"], 8.0)

    # 4) Price
    price_png = compose_price(deal, out_dir / "s_price.png", W, H)
    price = fmt_price(deal.get("price"), deal.get("currency"))
    original = fmt_price(deal.get("original_price"), deal.get("currency"))
    if price and original:
        why = f"Normally {original}, today you pay just {price} one-time. That is launch pricing while it lasts."
    elif price:
        why = f"Today you pay just {price} one-time for lifetime access."
    else:
        why = "One-time lifetime price, while the launch pricing lasts."
    add_card(price_png, why, 8.0)

    # 5) CTA
    cta_png = compose_cta(deal, out_dir / "s_cta.png", W, H)
    add_card(cta_png, "Get the full details and the exact link in the description. Grab it before the deal expires.", 8.0)

    # 7) Concat (filter-based re-encode: normalizes fps/pix_fmt/sample-rate,
    #    avoids the timestamp gaps the -c copy demuxer left behind)
    ins = []
    for p in segs:
        ins += ["-i", str(p)]
    n = len(segs)
    fc = "".join(f"[{i}:v][{i}:a]" for i in range(n))
    fc += f"concat=n={n}:v=1:a=1[v][a]"
    video = out_dir / "video.mp4"
    run(["ffmpeg", "-y", *ins, "-filter_complex", fc, "-map", "[v]", "-map", "[a]",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2",
         "-movflags", "+faststart", str(video)])
    for s in segs:
        s.unlink(missing_ok=True)
    return video


def make_thumbnail(deal, assets, out_dir, W=1280, H=720):
    price = fmt_price(deal.get("price"), deal.get("currency"))
    hero = deal.get("hero_image")
    card = out_dir / "thumb_card.png"
    if hero and hero.startswith("http"):
        download_image(hero, card)
    if not card.exists():
        card = None
    return compose_title(deal, card, out_dir / "thumb.png", W, H)


if __name__ == "__main__":
    deal_path = sys.argv[1]
    out = Path(sys.argv[2])
    assets_path = Path(__file__).resolve().parent / "webinar-assets.json"
    manifest = json.loads(assets_path.read_text()) if assets_path.exists() else {}
    deal = json.load(open(deal_path))
    slug = deal.get("slug") or ""
    assets = manifest.get(slug, {})
    v = render(deal, assets, out)
    th = make_thumbnail(deal, assets, out)
    print(f"video: {v} ({v.stat().st_size/1e6:.1f} MB) thumb: {th}")
