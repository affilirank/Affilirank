#!/usr/bin/env python3
"""
Scene image generator for AffiliRank videos.
Creates professional dark-themed slides with gradients, text overlays, and shapes.
"""

import math
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# ─── CONFIG ──────────────────────────────────────────────────────────────────

W, H = 1920, 1080
SCENE_DIR = Path("tmp/video-scenes")

# Colors
VOID = (10, 15, 30)        # Dark background
PURPLE = (124, 58, 237)
CYAN = (34, 211, 238)
VIOLET = (168, 85, 247)
WHITE = (255, 255, 255)
WHITE_DIM = (200, 210, 230)
GOLD = (255, 200, 50)
RED_SOFT = (220, 80, 80)
GREEN = (34, 197, 94)

# Font paths (Linux)
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

def get_font(size, bold=True):
    path = FONT_BOLD if bold else FONT_REGULAR
    try:
        return ImageFont.truetype(path, size)
    except:
        return ImageFont.load_default()


# ─── DRAWING HELPERS ────────────────────────────────────────────────────────

def gradient_bg(draw, top_color=VOID, bottom_color=(15, 20, 40)):
    """Vertical gradient background."""
    for y in range(H):
        t = y / H
        r = int(top_color[0] * (1 - t) + bottom_color[0] * t)
        g = int(top_color[1] * (1 - t) + bottom_color[1] * t)
        b = int(top_color[2] * (1 - t) + bottom_color[2] * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))


def radial_glow(img, cx, cy, radius, color, alpha=40):
    """Add a radial glow effect."""
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for r in range(radius, 0, -2):
        a = int(alpha * (r / radius) ** 0.5)
        c = color + (a,)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)
    img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"))


def draw_grid(draw, spacing=60, color=(255, 255, 255, 8)):
    """Subtle grid pattern."""
    for x in range(0, W, spacing):
        draw.line([(x, 0), (x, H)], fill=color[:3], width=1)
    for y in range(0, H, spacing):
        draw.line([(0, y), (W, y)], fill=color[:3], width=1)


def centered_text(draw, text, y, font, fill=WHITE, max_width=1400):
    """Draw centered text, wrapping if needed."""
    lines = wrap_text(text, font, max_width)
    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font)
        tw = bbox[2] - bbox[0]
        x = (W - tw) // 2
        draw.text((x, y + i * (bbox[3] - bbox[1] + 10)), line, font=font, fill=fill)


def wrap_text(text, font, max_width):
    """Word-wrap text to fit within max_width."""
    words = text.split()
    lines = []
    current = ""
    for word in words:
        test = f"{current} {word}".strip()
        bbox = font.getbbox(test)
        if bbox[2] - bbox[0] > max_width and current:
            lines.append(current)
            current = word
        else:
            current = test
    if current:
        lines.append(current)
    return lines


def draw_pill(draw, x, y, w, h, color, text="", font=None):
    """Rounded rectangle pill with optional text."""
    r = h // 2
    draw.rounded_rectangle([x, y, x + w, y + h], radius=r, fill=color)
    if text and font:
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text((x + (w - tw) // 2, y + (h - th) // 2 - 2), text, font=font, fill=WHITE)


def draw_button(draw, x, y, w, h, text, font, gradient=True):
    """CTA button with gradient-like effect."""
    # Shadow
    draw.rounded_rectangle([x + 4, y + 4, x + w + 4, y + h + 4], radius=16, fill=(0, 0, 0, 80)[:3])
    # Button
    draw.rounded_rectangle([x, y, x + w, y + h], radius=16, fill=PURPLE)
    # Highlight
    draw.rounded_rectangle([x + 2, y + 2, x + w - 2, y + h // 2], radius=14, fill=CYAN, )
    # Text
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((x + (w - tw) // 2, y + (h - th) // 2 - 2), text, font=font, fill=WHITE)


# ─── SCENE GENERATORS ───────────────────────────────────────────────────────

def make_hook(scene):
    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)
    gradient_bg(draw, (8, 10, 25), (15, 8, 35))
    draw_grid(draw, 80, (255, 255, 255, 6))
    radial_glow(img, W // 2, H // 2 - 50, 500, PURPLE, 30)
    radial_glow(img, W // 2, H // 2, 300, CYAN, 15)
    draw = ImageDraw.Draw(img)
    
    font_big = get_font(72)
    font_small = get_font(28, bold=False)
    
    centered_text(draw, scene["overlay_text"], H // 2 - 60, font_big, fill=WHITE)
    
    # Decorative line
    lw = 400
    lx = (W - lw) // 2
    ly = H // 2 + 40
    draw.rounded_rectangle([lx, ly, lx + lw, ly + 4], radius=2, fill=CYAN)
    
    centered_text(draw, "AffiliRank", H // 2 + 80, font_small, fill=WHITE_DIM)
    
    return img


def make_pain(scene):
    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)
    gradient_bg(draw, (15, 5, 5), (25, 10, 15))
    draw_grid(draw, 80, (255, 255, 255, 4))
    
    # Red warning glow
    radial_glow(img, W // 2, H // 2, 400, RED_SOFT, 25)
    draw = ImageDraw.Draw(img)
    
    font_big = get_font(64)
    font_mid = get_font(36)
    font_small = get_font(24, bold=False)
    
    # Big X icon
    cx, cy = W // 2, H // 2 - 120
    draw.text((cx - 30, cy - 50), "✗", font=get_font(100), fill=RED_SOFT)
    
    centered_text(draw, scene["overlay_text"], H // 2 + 30, font_big, fill=WHITE)
    
    # Pain points
    pain_items = [
        "Hours writing blog posts from scratch",
        "Manual SEO optimization for every article", 
        "Waiting weeks for Google to index",
        "Eighty percent of time wasted on content"
    ]
    y_start = H // 2 + 130
    font_item = get_font(22, bold=False)
    for i, item in enumerate(pain_items):
        draw.text((W // 2 - 300, y_start + i * 40), f"✗  {item}", font=font_item, fill=WHITE_DIM)
    
    return img


def make_pain_hamster(scene):
    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)
    gradient_bg(draw, (12, 8, 25), (20, 12, 30))
    
    # Split screen
    draw.line([(W // 2, 0), (W // 2, H)], fill=(255, 255, 255, 30)[:3], width=2)
    
    font_big = get_font(56)
    font_mid = get_font(32)
    font_small = get_font(20, bold=False)
    
    # Left: hamster wheel concept
    draw.text((100, 100), "THE OLD WAY", font=font_mid, fill=RED_SOFT)
    # Circular arrows (simplified)
    cx, cy = W // 4, H // 2
    for angle in range(0, 360, 30):
        x1 = cx + int(120 * math.cos(math.radians(angle)))
        y1 = cy + int(120 * math.sin(math.radians(angle)))
        x2 = cx + int(120 * math.cos(math.radians(angle + 20)))
        y2 = cy + int(120 * math.sin(math.radians(angle + 20)))
        draw.arc([cx - 120, cy - 120, cx + 120, cy + 120], angle, angle + 25, fill=PURPLE, width=3)
    draw.text((cx - 60, cy - 15), "LOOP", font=font_mid, fill=WHITE)
    draw.text((100, H - 200), "Content creation\nSEO optimization\nManual publishing\nWaiting for results", font=font_small, fill=WHITE_DIM)
    
    # Right: dashboards
    draw.text((W // 2 + 100, 100), "THE RESULT", font=font_mid, fill=GREEN)
    # Fake chart going down
    points = [(W // 2 + 200, 300), (W // 2 + 400, 350), (W // 2 + 600, 380), 
              (W // 2 + 800, 400), (W // 2 + 1000, 420), (W // 2 + 1200, 450),
              (W // 2 + 1400, 480), (W // 2 + 1600, 500)]
    for i in range(len(points) - 1):
        draw.line([points[i], points[i + 1]], fill=RED_SOFT, width=3)
    draw.text((W // 2 + 100, H - 200), "Zero traffic\nZero sales\nZero commissions", font=font_small, fill=WHITE_DIM)
    
    centered_text(draw, scene["overlay_text"], 40, font_big, fill=WHITE)
    
    return img


def make_pain_generic(scene):
    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)
    gradient_bg(draw, (10, 10, 20), (18, 15, 25))
    
    font_big = get_font(56)
    font_mid = get_font(28)
    font_small = get_font(20, bold=False)
    
    # Row of identical website mockups
    for i in range(5):
        x = 120 + i * 340
        y = 200
        draw.rounded_rectangle([x, y, x + 300, y + 400], radius=8, fill=(30, 35, 50))
        draw.rounded_rectangle([x, y, x + 300, y + 50], radius=8, fill=(40, 45, 60))
        # Fake content lines
        for j in range(6):
            draw.rounded_rectangle([x + 20, y + 70 + j * 35, x + 280, y + 90 + j * 35], 
                                   radius=4, fill=(50, 55, 70))
        # Big red X over each
        draw.text((x + 120, y + 150), "✗", font=get_font(80), fill=RED_SOFT)
    
    centered_text(draw, scene["overlay_text"], H // 2 + 180, font_big, fill=WHITE)
    centered_text(draw, "Google sees right through generic templates", H // 2 + 260, font_small, fill=WHITE_DIM)
    
    return img


def make_solution(scene):
    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)
    gradient_bg(draw, (8, 12, 30), (15, 10, 35))
    radial_glow(img, W // 2, H // 2, 500, PURPLE, 40)
    radial_glow(img, W // 2, H // 2, 300, CYAN, 20)
    draw = ImageDraw.Draw(img)
    
    font_big = get_font(80)
    font_mid = get_font(36)
    
    # Logo placeholder
    cx, cy = W // 2, H // 2 - 80
    draw.ellipse([cx - 60, cy - 60, cx + 60, cy + 60], fill=PURPLE)
    draw.text((cx - 25, cy - 20), "▶", font=get_font(50), fill=WHITE)
    
    centered_text(draw, "AffiliRank", cy + 100, font_big, fill=WHITE)
    
    # Tagline
    centered_text(draw, scene["overlay_text"], cy + 210, font_mid, fill=CYAN)
    
    # Decorative dots
    for i in range(20):
        x = cx + int(250 * math.cos(math.radians(i * 18)))
        y = cy + int(250 * math.sin(math.radians(i * 18)))
        draw.ellipse([x - 3, y - 3, x + 3, y + 3], fill=CYAN)
    
    return img


def make_feature(scene, color=PURPLE):
    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)
    gradient_bg(draw, (8, 10, 25), (12, 15, 35))
    draw_grid(draw, 80, (255, 255, 255, 5))
    
    # Accent glow
    radial_glow(img, W // 2, H // 3, 400, color, 30)
    draw = ImageDraw.Draw(img)
    
    font_big = get_font(56)
    font_mid = get_font(28)
    font_small = get_font(22, bold=False)
    
    # Feature card
    card_w, card_h = 1200, 500
    cx = (W - card_w) // 2
    cy = (H - card_h) // 2
    draw.rounded_rectangle([cx, cy, cx + card_w, cy + card_h], radius=20, fill=(20, 25, 45))
    draw.rounded_rectangle([cx, cy, cx + card_w, cy + 4], radius=2, fill=color)
    
    # Feature text
    centered_text(draw, scene["overlay_text"], cy + 80, font_big, fill=WHITE)
    
    # Feature details
    if "stream" in scene["id"]:
        items = ["Paste one JVZoo link", "Deal stream publishes automatically", "Every CTA carries your affiliate tag", "Every view is monetized"]
    elif "blog" in scene["id"]:
        items = ["Keyword-optimized articles", "Auto-generated for every deal", "No blank screen paralysis", "Ranks in Google automatically"]
    elif "pages" in scene["id"]:
        items = ["Product schema markup", "Rich snippets in search", "Prices and ratings displayed", "SEO-optimized landing pages"]
    elif "analytics" in scene["id"]:
        items = ["GA4 + Meta Pixel", "Track every click and view", "Conversion funnel tracking", "Know what's working"]
    else:
        items = ["Professional feature", "Automated workflow", "Lifetime access"]
    
    for i, item in enumerate(items):
        draw.text((cx + 80, cy + 200 + i * 55), f"→  {item}", font=font_small, fill=WHITE_DIM)
    
    return img


def make_social(scene):
    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)
    gradient_bg(draw, (8, 10, 30), (20, 10, 35))
    
    # Multiple glows for aurora effect
    radial_glow(img, W // 3, H // 3, 500, PURPLE, 35)
    radial_glow(img, W * 2 // 3, H // 3, 400, CYAN, 25)
    radial_glow(img, W // 2, H // 2, 300, VIOLET, 20)
    draw = ImageDraw.Draw(img)
    
    font_big = get_font(64)
    font_mid = get_font(32)
    font_small = get_font(24, bold=False)
    
    centered_text(draw, scene["overlay_text"], H // 2 - 80, font_big, fill=WHITE)
    
    # Testimonial stars
    stars = "★ ★ ★ ★ ★"
    centered_text(draw, stars, H // 2 + 20, font_mid, fill=GOLD)
    
    centered_text(draw, "Deploy once. Rank forever.", H // 2 + 80, font_small, fill=CYAN)
    
    return img


def make_cta(scene):
    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)
    gradient_bg(draw, (8, 8, 25), (15, 10, 30))
    radial_glow(img, W // 2, H // 2, 500, PURPLE, 45)
    radial_glow(img, W // 2, H // 2 + 100, 300, CYAN, 25)
    draw = ImageDraw.Draw(img)
    
    font_huge = get_font(72)
    font_big = get_font(56)
    font_mid = get_font(32)
    font_small = get_font(24, bold=False)
    
    # Price
    centered_text(draw, "$97", H // 2 - 120, font_mid, fill=RED_SOFT)
    # Strikethrough
    bbox = draw.textbbox((0, 0), "$97", font=font_mid)
    tw = bbox[2] - bbox[0]
    draw.line([(W // 2 - tw // 2, H // 2 - 100), (W // 2 + tw // 2, H // 2 - 100)], fill=RED_SOFT, width=3)
    
    centered_text(draw, "$37", H // 2 - 60, font_huge, fill=CYAN)
    
    # CTA button
    btn_w, btn_h = 600, 80
    btn_x = (W - btn_w) // 2
    btn_y = H // 2 + 60
    draw_button(draw, btn_x, btn_y, btn_w, btn_h, "Get Instant Access", font_mid)
    
    centered_text(draw, "One-time payment · Lifetime access", H // 2 + 180, font_small, fill=WHITE_DIM)
    
    return img


def make_bundle_value(scene):
    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)
    gradient_bg(draw, (8, 10, 25), (15, 15, 30))
    draw_grid(draw, 60, (255, 255, 255, 4))
    radial_glow(img, W // 2, H // 2, 400, PURPLE, 30)
    draw = ImageDraw.Draw(img)
    
    font_big = get_font(56)
    font_mid = get_font(28)
    font_small = get_font(22, bold=False)
    
    centered_text(draw, scene["overlay_text"], 100, font_big, fill=WHITE)
    
    # Value stack
    items = [
        ("SEO Blog Module", "$197", PURPLE),
        ("Unlimited Deals", "$97", VIOLET),
        ("Exit-Intent Popup", "$67", CYAN),
        ("Analytics Module", "$47", GREEN),
        ("Deal Detail Pages", "$97", PURPLE),
        ("Pro Video Mode", "$47", VIOLET),
    ]
    
    y_start = 250
    for i, (label, price, color) in enumerate(items):
        y = y_start + i * 70
        draw.rounded_rectangle([300, y, 1300, y + 55], radius=10, fill=(25, 30, 50))
        draw.rounded_rectangle([300, y, 305, y + 55], radius=2, fill=color)
        draw.text((340, y + 12), label, font=font_small, fill=WHITE)
        draw.text((1200, y + 12), price, font=font_mid, fill=WHITE_DIM)
    
    # Total
    draw.rounded_rectangle([300, y_start + 440, 1300, y_start + 500], radius=10, fill=(40, 30, 60))
    draw.text((340, y_start + 450), "Total Value", font=font_mid, fill=WHITE)
    draw.text((1100, y_start + 450), "$552+", font=font_big, fill=GOLD)
    
    return img


def make_bundle_price(scene):
    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)
    gradient_bg(draw, (8, 8, 25), (20, 15, 35))
    radial_glow(img, W // 2, H // 2, 600, GOLD, 20)
    radial_glow(img, W // 2, H // 2, 300, PURPLE, 30)
    draw = ImageDraw.Draw(img)
    
    font_huge = get_font(96)
    font_big = get_font(56)
    font_mid = get_font(36)
    font_small = get_font(24, bold=False)
    
    centered_text(draw, "$552", H // 2 - 200, font_mid, fill=RED_SOFT)
    # Strikethrough
    bbox = draw.textbbox((0, 0), "$552", font=font_mid)
    tw = bbox[2] - bbox[0]
    draw.line([(W // 2 - tw // 2, H // 2 - 170), (W // 2 + tw // 2, H // 2 - 170)], fill=RED_SOFT, width=3)
    
    centered_text(draw, "$267", H // 2 - 80, font_huge, fill=GOLD)
    centered_text(draw, "Use code SAVE100", H // 2 + 60, font_mid, fill=CYAN)
    
    # CTA
    btn_w, btn_h = 600, 80
    btn_x = (W - btn_w) // 2
    btn_y = H // 2 + 140
    draw_button(draw, btn_x, btn_y, btn_w, btn_h, "Upgrade to Bundle", font_mid)
    
    centered_text(draw, "One payment · Everything included · Forever", H // 2 + 260, font_small, fill=WHITE_DIM)
    
    return img


def make_unlock(scene):
    """Generic unlock scene with feature details."""
    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)
    gradient_bg(draw, (8, 10, 25), (15, 12, 35))
    draw_grid(draw, 60, (255, 255, 255, 5))
    
    # Accent glow
    radial_glow(img, W // 4, H // 2, 400, CYAN, 25)
    draw = ImageDraw.Draw(img)
    
    font_big = get_font(52)
    font_mid = get_font(28)
    font_small = get_font(22, bold=False)
    
    # Left column: feature name
    draw.text((120, 150), scene["overlay_text"], font=font_big, fill=WHITE)
    
    # Right column: details
    if "blog" in scene["id"]:
        details = [
            "Auto-generates review articles",
            "Keyword research built-in",
            "SEO-optimized structure",
            "Google-indexed content",
            "No writing required"
        ]
    elif "unlimited" in scene["id"]:
        details = [
            "Remove the 10-deal cap",
            "Add hundreds of deals",
            "Scale without limits",
            "Stream grows with you"
        ]
    elif "exit" in scene["id"]:
        details = [
            "Timed popup on exit",
            "Countdown urgency",
            "Double conversion rate",
            "Zero extra traffic needed"
        ]
    elif "analytics" in scene["id"]:
        details = [
            "GA4 integration",
            "Meta Pixel tracking",
            "Event-level data",
            "Conversion funnels"
        ]
    elif "dealpages" in scene["id"]:
        details = [
            "SEO-optimized pages",
            "Product schema markup",
            "Rich snippets in Google",
            "Individual deal URLs"
        ]
    elif "video" in scene["id"]:
        details = [
            "MP4 support",
            "iFrame embeds",
            "GIF animations",
            "Beyond YouTube/Vimeo"
        ]
    else:
        details = ["Premium feature", "Lifetime access"]
    
    for i, d in enumerate(details):
        draw.text((700, 200 + i * 55), f"✓  {d}", font=font_small, fill=WHITE_DIM)
    
    # Unlock icon
    draw.text((120, H - 200), "🔓", font=get_font(60), fill=CYAN)
    
    return img


# ─── SCENE DISPATCHER ───────────────────────────────────────────────────────

SCENE_GENERATORS = {
    "hook": make_hook,
    "pain": make_pain,
    "solution": make_solution,
    "feature": make_feature,
    "social": make_social,
    "cta": make_cta,
    "value": make_bundle_value,
    "price": make_bundle_price,
    "unlock": make_unlock,
}


def generate_scene(scene):
    """Generate a single scene image."""
    generator = SCENE_GENERATORS.get(scene["scene_type"], make_hook)
    
    # Special overrides for specific scenes
    if scene["id"] == "pain2":
        img = make_pain_hamster(scene)
    elif scene["id"] == "pain3":
        img = make_pain_generic(scene)
    elif scene["id"] == "feature_blog":
        img = make_feature(scene, CYAN)
    elif scene["id"] == "feature_pages":
        img = make_feature(scene, GREEN)
    elif scene["id"] == "feature_analytics":
        img = make_feature(scene, VIOLET)
    elif scene["id"] == "unlock_blog":
        img = make_unlock(scene)
    elif scene["id"] == "unlock_unlimited":
        img = make_unlock(scene)
    elif scene["id"] == "unlock_exit":
        img = make_unlock(scene)
    elif scene["id"] == "unlock_analytics":
        img = make_unlock(scene)
    elif scene["id"] == "unlock_dealpages":
        img = make_unlock(scene)
    elif scene["id"] == "unlock_video":
        img = make_unlock(scene)
    else:
        img = generator(scene)
    
    out_path = SCENE_DIR / f"{scene['id']}.png"
    img.save(out_path, "PNG")
    print(f"  [img] {scene['id']}.png")
    return out_path


# ─── MAIN ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(Path(__file__).parent))
    
    # Import scene data from make-video.py
    import importlib.util
    spec = importlib.util.spec_from_file_location("make_video", str(Path(__file__).parent / "make-video.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    EXPLAINER_SCENES = mod.EXPLAINER_SCENES
    BUNDLE_SCENES = mod.BUNDLE_SCENES
    
    video_type = sys.argv[1] if len(sys.argv) > 1 else "explainer"
    scenes = EXPLAINER_SCENES if video_type == "explainer" else BUNDLE_SCENES
    
    SCENE_DIR.mkdir(parents=True, exist_ok=True)
    
    print(f"\nGenerating {len(scenes)} scene images for {video_type} video...")
    for scene in scenes:
        generate_scene(scene)
    print(f"\nDone! Images saved to {SCENE_DIR}/")
