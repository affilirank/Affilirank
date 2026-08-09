#!/usr/bin/env python3
"""Scroll-stopping 1280x720 thumbnails for every deal (no API key needed).

Real product-UI screenshot (frame from the live-demo clip) as the hero card,
violet/blurred backdrop, big bold title, yellow LIFETIME DEAL badge, giant
price chip, a red WATCH button, and the channel profile pic (round, white
ring) with the channel name.

Usage:
  python3 make-thumbnails.py [deals_dir]
"""
import importlib.util
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
_AP_PATH = Path(__file__).resolve().parent / "auto-publisher.py"
_AP_SPEC = importlib.util.spec_from_file_location("auto_publisher", _AP_PATH)
_AP_MOD = importlib.util.module_from_spec(_AP_SPEC)
sys.modules["auto_publisher"] = _AP_MOD
_AP_SPEC.loader.exec_module(_AP_MOD)
from auto_publisher import (  # noqa: E402
    run, img_dims, fmt_price, short_name, download_image, wrap_for_draw, FONT,
)

W, H = 1280, 720
YELLOW = "0xFFB300"
WHITE = "white"
BLACK = "black"
RED = "0xFF2D2D"
DEALS_DIR = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent / "deals"
MANIFEST = Path(__file__).resolve().parent / "webinar-assets.json"
VENDOR = Path("/tmp/opencode/vendor-videos")
AVATAR_URL = "https://yt3.ggpht.com/ueD5KKXNK3ssj2ur5emr-Nait7q7uD7moGK3bHowvQ4ydmqx6qTTB8l-F0SY23EY6ajcwO8p5Pw=s800-c-k-c0x00ffffff-no-rj"
CHANNEL = "Daniel Brown | CEO"
WORK = Path("/tmp/affilirank-thumbs")
FRAMES = WORK / "frames"
L = 46


def _resolve_src(src):
    """Resolve a webinar-assets demo src to a local file, checking the main
    vendor dir first, then the deals2 subdir (newer demo downloads)."""
    for base in (VENDOR, VENDOR / "deals2"):
        p = base / src
        if p.exists():
            return p
    return None


def ensure_frames(manifest):
    """Extract one real product-UI frame per deal from its first demo clip."""
    FRAMES.mkdir(parents=True, exist_ok=True)
    for slug, cfg in (manifest or {}).items():
        demos = cfg.get("demos") or []
        if not demos:
            continue
        d = demos[0]
        src = _resolve_src(d["src"])
        if not src:
            print(f"  no source {d['src']}")
            continue
        mid = (d["start"] + d["end"]) / 2
        out = FRAMES / f"{slug}.jpg"
        if out.exists() and out.stat().st_size > 20000:
            continue
        run(["ffmpeg", "-v", "error", "-y", "-ss", str(mid),
             "-i", str(src), "-frames:v", "1", "-q:v", "2", str(out)])
        print(f"  frame {out.name}")


def round_avatar(src, out, size=76):
    """Square avatar -> circular PNG with a white ring."""
    ring = 6
    total = size + ring * 2
    run(["ffmpeg", "-y", "-i", str(src),
         "-vf", f"scale={size}:{size},crop={size}:{size},format=rgba,"
                f"geq=lum='lum(X,Y)':a='if(lte(sqrt(pow(X-{size/2},2)+pow(Y-{size/2},2)),{size/2-1}),255,0)'",
         "-frames:v", "1", "-update", "1", str(out)])
    rimg = out.with_name(out.stem + "_ring.png")
    run(["ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c=white:s={total}x{total}",
         "-i", str(out), "-filter_complex",
         f"[1:v]scale={size}:{size}[a];[0:v][a]overlay={ring}:{ring}",
         "-frames:v", "1", "-update", "1", str(rimg)])
    return rimg


def dt(txt, size, color, y, box="black@0.35", bw=12, x=L, sp=12):
    p = WORK / f"t{abs(hash(txt))}_{size}_{y}.txt"
    p.write_text(txt)
    return (f"drawtext=textfile={p}:fontfile={FONT}:fontsize={size}:"
            f"fontcolor={color}:line_spacing={sp}:x={x}:y={y}:"
            f"box=1:boxcolor={box}:boxborderw={bw}")


def prepare_source(src_path, out_png):
    """Download or copy the image source to a local file."""
    if str(src_path).startswith("http"):
        local = out_png.parent / "src_img"
        if not download_image(src_path, local, min_bytes=3000):
            return None
        return local
    p = Path(src_path)
    return p if p.exists() else None


def make_thumb(deal, avatar_ring, out_png, thumb_image=None):
    out_png.parent.mkdir(parents=True, exist_ok=True)
    name = short_name(deal["title"])
    price = fmt_price(deal.get("price"), deal.get("currency"))
    hero = deal.get("hero_image")

    card_src = thumb_image or hero
    card_w = card_h = 0
    card = None
    src = prepare_source(card_src, out_png)
    if src:
        iw, ih = img_dims(src)
        bw, bh = int(W * 0.42), int(H * 0.78)
        sc = min((bw - 30) / max(iw, 2), (bh - 30) / max(ih, 2))
        card_w, card_h = max(2, int(iw * sc)), max(2, int(ih * sc))
        card = out_png.parent / "card.png"
        run(["ffmpeg", "-y", "-i", str(src), "-vf",
             f"scale={card_w}:{card_h},format=rgb24",
             "-frames:v", "1", "-update", "1", str(card)])

    # blurred backdrop from same source
    backdrop = None
    if src:
        backdrop = out_png.parent / "bd.png"
        run(["ffmpeg", "-y", "-i", str(src), "-vf",
             f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
             f"boxblur=34:3,eq=brightness=-0.36:saturation=1.22",
             "-frames:v", "1", "-update", "1", str(backdrop)])

    # base gradient for depth
    bg = out_png.parent / "bg.png"
    run(["ffmpeg", "-y", "-f", "lavfi", "-i",
         f"gradients=s={W}x{H}:c0=0x14062e:c1=0x2a0f63:c2=0x6d28d9:c3=0x170b33:r=45",
         "-frames:v", "1", "-update", "1", str(bg)])

    card_x = W - int(W * 0.42) + 10
    card_y = (H - card_h) // 2
    ax, ay = L, H - 110

    inputs = ["-i", str(bg)]
    fc = ""
    idx = 1
    if backdrop:
        inputs += ["-i", str(backdrop)]
        fc += f"[0:v][1:v]overlay=0:0[bg0];"
        prev = "[bg0]"
    else:
        prev = "[0:v]"
    if card:
        inputs += ["-i", str(card)]
        fc += (f"{prev}[{idx}:v]overlay={card_x}:{card_y}[c0];"
               f"[c0]drawbox=x={card_x-8}:y={card_y-8}:w={card_w+16}:h={card_h+16}:"
               f"t=6:color=white[v1];")
        idx += 1
        prev = "[v1]"
    inputs += ["-i", str(avatar_ring)]
    fc += f"{prev}[{idx}:v]overlay={ax}:{ay}[v2];"
    prev = "[v2]"

    btx, bty = 480, H - 74
    texts = [
        dt("★ LIFETIME DEAL ★", 22, BLACK, 44, box=YELLOW, bw=16, x=L),
        dt(wrap_for_draw(name.upper(), 19), 38, WHITE, 118, box="black@0.45", bw=12, x=L, sp=16),
        dt("ONLY", 20, WHITE, 466, box="black@0.0", bw=0, x=L),
        dt(price or "LIFETIME DEAL", 92, YELLOW, 492, box="black@0.0", bw=0, x=L),
        dt("ONE-TIME  ·  LAUNCH PRICE", 18, WHITE, 622, box="black@0.35", bw=8, x=L),
        dt("▶  WATCH FULL REVIEW", 24, WHITE, 668, box=RED, bw=12, x=btx, sp=6),
        dt(CHANNEL, 22, WHITE, ay + 32, box="black@0.30", bw=8, x=ax + 92),
    ]
    fc += prev + ",".join(texts) + "[v]"

    run(["ffmpeg", "-y", *inputs, "-filter_complex", fc,
         "-map", "[v]", "-frames:v", "1", "-update", "1", str(out_png)])
    return out_png


def main():
    WORK.mkdir(parents=True, exist_ok=True)
    manifest = {}
    if MANIFEST.exists():
        manifest = json.loads(MANIFEST.read_text())
    ensure_frames(manifest)
    av = WORK / "avatar.png"
    download_image(AVATAR_URL, av, min_bytes=2000)
    avatar_ring = round_avatar(av, WORK / "avatar_circle.png")
    for f in sorted(DEALS_DIR.glob("*.json")):
        deal = json.loads(f.read_text())
        slug = deal.get("slug") or f.stem
        frame = FRAMES / f"{slug}.jpg"
        thumb_image = frame if frame.exists() else None
        out = Path("/tmp/affilirank-review") / slug / "thumb.png"
        try:
            make_thumb(deal, avatar_ring, out, thumb_image=thumb_image)
            print(f"OK {slug} card={thumb_image is not None}")
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"FAIL {slug}: {e}")


if __name__ == "__main__":
    main()
