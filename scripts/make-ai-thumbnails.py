#!/usr/bin/env python3
"""AI scroll-stopping thumbnails via the Gemini image-generation API.

Uses the deal's real product-UI screenshot (frame from the webinar demo) plus
the channel profile pic as inputs, and prompts Gemini to composite a high-CTR
16:9 thumbnail with exact title / price / badge text.

Needs GEMINI_API_KEY in scripts/.env.autopublish (also readable from env).
Falls back to the ffmpeg composer (make-thumbnails.py) per deal if the API
call fails or no key is set.

Usage:
  python3 make-ai-thumbnails.py [deals_dir]
"""
import base64
import importlib.util
import json
import os
import sys
import urllib.request
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))


def load_env():
    envf = SCRIPTS / ".env.autopublish"
    if envf.exists():
        for line in envf.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


load_env()
KEY = os.environ.get("GEMINI_API_KEY", "")
MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image")
FALLBACK_MODEL = "gemini-2.5-flash-image"
API = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

_AP_SPEC = importlib.util.spec_from_file_location("auto_publisher", SCRIPTS / "auto-publisher.py")
_AP_MOD = importlib.util.module_from_spec(_AP_SPEC)
sys.modules["auto_publisher"] = _AP_MOD
_AP_SPEC.loader.exec_module(_AP_MOD)
from auto_publisher import run, fmt_price, short_name, download_image, rest  # noqa: E402

DEALS_DIR = Path(sys.argv[1]) if len(sys.argv) > 1 else SCRIPTS / "deals"
MANIFEST = SCRIPTS / "webinar-assets.json"
FRAMES = Path("/tmp/affilirank-thumbs") / "frames"
AVATAR_URL = "https://yt3.ggpht.com/ueD5KKXNK3ssj2ur5emr-Nait7q7uD7moGK3bHowvQ4ydmqx6qTTB8l-F0SY23EY6ajcwO8p5Pw=s800-c-k-c0x00ffffff-no-rj"
CHANNEL = "Daniel Brown | CEO"
WORK = Path("/tmp/affilirank-ai-thumbs")
WORK.mkdir(parents=True, exist_ok=True)


def fetch_gemini_key_from_settings():
    """Pull the purchaser's own Gemini key out of Supabase settings.

    Every white-label customer stores their key in their own settings row, so
    no central/shared key is ever needed on the machine running the worker.
    """
    try:
        rows = rest("/settings?select=autopublish&id=eq.1&limit=1")
        autopublish = (rows[0] or {}).get("autopublish") or {}
        return (autopublish.get("gemini_api_key") or "").strip()
    except Exception:
        return ""


if not KEY:
    KEY = fetch_gemini_key_from_settings()


def _inline(path):
    b = Path(path).read_bytes()
    mime = "image/png" if path.suffix.lower() in (".png",) else "image/jpeg"
    return {"inline_data": {"mime_type": mime, "data": base64.b64encode(b).decode()}}


GIG_EXPRESSIONS = [
    "excited, eyes wide open, big smile, mouth slightly open in surprise",
    "curious, one eyebrow raised, intrigued half-smile",
    "blown away, jaw slightly dropped, amazed expression",
    "smiling confidently, one eyebrow raised, nodding in approval",
]


def build_prompt(deal, name, price, expression):
    title = name.upper()
    return (
        "Create a high-energy, scroll-stopping YouTube thumbnail (16:9) for a software "
        "review. Use IMAGE 2 (a real person's photo) as a BIG reaction \"gig\" photo — "
        "a large chest-up shot of the person filling roughly the LEFT 45% of the frame, "
        "shown from mid-chest up with an arm raised. Keep the person's exact face from "
        "IMAGE 2, but give them this expression: " + expression + ".\n\n"
        "The person is pointing with their raised hand toward the product-name headline "
        "text on the RIGHT side of the thumbnail, as if saying \"look at this!\".\n\n"
        "Use IMAGE 1 (the product's real user interface screenshot) as a clean rounded "
        "card with a thin white border, tucked in the RIGHT portion UNDER the headline "
        "text, partially behind the headline, blended into the background.\n\n"
        "Compose it as:\n"
        "- Background: vibrant violet-to-deep-purple diagonal gradient, with the product "
        "UI blurred for depth.\n"
        "- Top-LEFT above the person: a yellow rounded pill badge with bold black text "
        "reading exactly: ★ LIFETIME DEAL ★\n"
        "- RIGHT side: huge bold white uppercase headline with strong black outline, "
        "max 2 lines, reading exactly: " + title + "\n"
        "- Below the headline, small white label \"ONLY\", then a giant bold yellow price "
        f"with black outline reading exactly: {price}\n"
        f"- Under the price, small white text reading exactly: ONE-TIME · LAUNCH PRICE\n"
        "- Top-RIGHT corner: a red rounded button with bold white text reading exactly: "
        "▶ WATCH FULL REVIEW\n\n"
        "Rules: spell every piece of text EXACTLY as given, no typos, no invented words, "
        "no watermarks. The person's face must clearly match IMAGE 2. High contrast, "
        "punchy, modern SaaS-review style, crisp sharp edges, everything legible at "
        "small size."
    )


def gen_image(prompt, images, model):
    parts = [{"text": prompt}] + images
    body = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
            "imageConfig": {"aspectRatio": "16:9"},
        },
    }
    req = urllib.request.Request(
        API.format(model=model),
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": KEY,
        },
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        resp = json.loads(r.read().decode())
    for cand in resp.get("candidates", []):
        for part in cand.get("content", {}).get("parts", []):
            if "inlineData" in part:
                return base64.b64decode(part["inlineData"]["data"])
    raise RuntimeError("no image in Gemini response")


def save_final(data, out_png):
    raw = WORK / (out_png.stem + "_ai_raw.png")
    raw.write_bytes(data)
    run(["ffmpeg", "-y", "-i", str(raw),
         "-vf", "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720",
         "-q:v", "2", "-update", "1", str(out_png)])


def make_one(deal, avatar_path, slug, thumb_image=None, out=None):
    name = short_name(deal["title"])
    price = fmt_price(deal.get("price"), deal.get("currency")) or "LIFETIME DEAL"
    out = out or Path("/tmp/affilirank-review") / slug / "thumb.png"
    out.parent.mkdir(parents=True, exist_ok=True)

    images = []
    if thumb_image and Path(thumb_image).exists():
        images.append(_inline(thumb_image))
    elif deal.get("hero_image", "").startswith("http"):
        h = out.parent / "hero.png"
        if download_image(deal["hero_image"], h, min_bytes=3000):
            images.append(_inline(h))
    images.append(_inline(avatar_path))

    expression = GIG_EXPRESSIONS[len(slug) % len(GIG_EXPRESSIONS)]
    prompt = build_prompt(deal, name, price, expression)
    data = gen_image(prompt, images, MODEL)
    save_final(data, out)
    return out


def main():
    if not KEY:
        print("No GEMINI_API_KEY in scripts/.env.autopublish — add it and rerun.")
        sys.exit(1)
    manifest = {}
    if MANIFEST.exists():
        manifest = json.loads(MANIFEST.read_text())
    av = WORK / "avatar.png"
    download_image(AVATAR_URL, av, min_bytes=2000)

    # make the ffmpeg composer available for per-deal fallback
    spec = importlib.util.spec_from_file_location("mt", SCRIPTS / "make-thumbnails.py")
    mt = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mt)
    avatar_ring = mt.round_avatar(av, mt.WORK / "avatar_circle.png")

    for f in sorted(DEALS_DIR.glob("*.json")):
        deal = json.loads(f.read_text())
        slug = deal.get("slug") or f.stem
        frame = FRAMES / f"{slug}.jpg"
        thumb_image = frame if frame.exists() else None
        try:
            make_one(deal, av, slug, thumb_image=thumb_image)
            print(f"OK {slug} (ai)")
        except Exception as e:
            print(f"AI FAIL {slug}: {e} — falling back to ffmpeg composer")
            try:
                mt.make_thumb(deal, avatar_ring, Path("/tmp/affilirank-review") / slug / "thumb.png",
                              thumb_image=thumb_image)
                print(f"OK {slug} (ffmpeg)")
            except Exception as e2:
                import traceback
                traceback.print_exc()
                print(f"FAIL {slug}: {e2}")


if __name__ == "__main__":
    main()
