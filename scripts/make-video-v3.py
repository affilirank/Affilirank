#!/usr/bin/env python3
"""
AffiliRank Explainer Video — v3 Complete Rewrite
1920x1080, smooth Ken Burns, crossfade transitions, professional captions.
"""
import asyncio
import subprocess
import sys
from pathlib import Path

# ─── CONFIG ──────────────────────────────────────────────────────────────────

W, H = 1920, 1080
FPS = 30
SCENE_DIR = Path("tmp/video-scenes-v3")
OUTPUT_DIR = Path("public/videos")
SCENE_DIR.mkdir(parents=True, exist_ok=True)

# ─── SCENES ──────────────────────────────────────────────────────────────────
# Each scene: screenshot filename, narration, duration (seconds), zoom direction, overlay text

SCENES = [
    {
        "id": "hook",
        "screenshot": "home",
        "narration": "Stop building affiliate sites from scratch. There's a faster way to rank and earn.",
        "duration": 7,
        "zoom": "in",
        "zoom_start": 1.0,
        "zoom_end": 1.08,
        "pan": "center",
        "overlay": "AffiliRank",
        "overlay_pos": "center",
        "overlay_size": 80,
    },
    {
        "id": "deals",
        "screenshot": "deal_stream",
        "narration": "AffiliRank turns any JVZoo offer into a self-ranking deal stream. Every CTA carries your affiliate tag.",
        "duration": 9,
        "zoom": "in",
        "zoom_start": 1.0,
        "zoom_end": 1.10,
        "pan": "right",
        "overlay": "Deal Stream",
        "overlay_pos": "top",
        "overlay_size": 60,
    },
    {
        "id": "modal",
        "screenshot": "deal_stream",
        "narration": "Click any deal to see full details, pricing, and your affiliate link ready to go.",
        "duration": 8,
        "zoom": "in",
        "zoom_start": 1.05,
        "zoom_end": 1.15,
        "pan": "center",
        "overlay": "One-Click Details",
        "overlay_pos": "center",
        "overlay_size": 60,
    },
    {
        "id": "blog",
        "screenshot": "blog",
        "narration": "The SEO blog module writes keyword-optimized review articles for every deal. No more blank screens.",
        "duration": 9,
        "zoom": "in",
        "zoom_start": 1.0,
        "zoom_end": 1.08,
        "pan": "left",
        "overlay": "SEO Blog Module",
        "overlay_pos": "top",
        "overlay_size": 60,
    },
    {
        "id": "admin",
        "screenshot": "admin",
        "narration": "Manage everything from the admin dashboard. Products, deals, blog posts, all in one place.",
        "duration": 8,
        "zoom": "in",
        "zoom_start": 1.0,
        "zoom_end": 1.06,
        "pan": "center",
        "overlay": "Admin Dashboard",
        "overlay_pos": "top",
        "overlay_size": 60,
    },
    {
        "id": "funnel",
        "screenshot": "funnel",
        "narration": "The JVZoo funnel runs on autopilot. Upsells, downsells, order bumps. Just add your affiliate ID.",
        "duration": 9,
        "zoom": "in",
        "zoom_start": 1.0,
        "zoom_end": 1.10,
        "pan": "down",
        "overlay": "Sales Funnel",
        "overlay_pos": "top",
        "overlay_size": 60,
    },
    {
        "id": "sales",
        "screenshot": "affilirank_page",
        "narration": "The sales page converts visitors with a proven funnel. Fully customizable, ready to deploy.",
        "duration": 8,
        "zoom": "in",
        "zoom_start": 1.0,
        "zoom_end": 1.08,
        "pan": "center",
        "overlay": "Sales Page",
        "overlay_pos": "top",
        "overlay_size": 60,
    },
    {
        "id": "cta",
        "screenshot": "home",
        "narration": "One-time payment. Lifetime access. Get AffiliRank now and start ranking today.",
        "duration": 7,
        "zoom": "out",
        "zoom_start": 1.12,
        "zoom_end": 1.0,
        "pan": "center",
        "overlay": "Get AffiliRank",
        "overlay_pos": "center",
        "overlay_size": 72,
    },
]

# ─── SCREENSHOTS ─────────────────────────────────────────────────────────────

SCREENSHOT_URLS = {
    "home": "https://affilirank.com",
    "deal_stream": "https://affilirank.com/deals",
    "blog": "https://affilirank.com/blog",
    "admin": "https://affilirank.com/admin",
    "funnel": "https://affilirank.com/funnel",
    "affilirank_page": "https://affilirank.com/affilirank",
}


def capture_screenshots():
    """Take high-res screenshots of all pages."""
    print("[0/4] Capturing screenshots...")
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = browser.new_context(
            viewport={"width": W, "height": H},
            device_scale_factor=1,
        )
        page = ctx.new_page()

        for name, url in SCREENSHOT_URLS.items():
            out = SCENE_DIR / f"{name}.png"
            if out.exists():
                print(f"  [skip] {name}")
                continue
            try:
                page.goto(url, wait_until="networkidle", timeout=30000)
                page.wait_for_timeout(2000)

                # For admin, enter password
                if name == "admin":
                    try:
                        pw = page.locator("input[type='password'], input[placeholder*='password']").first
                        if pw.is_visible():
                            pw.fill("FE3DoiGiKnB8ekJNkevxmaq")
                            page.wait_for_timeout(300)
                            btn = page.locator("button[type='submit'], button:has-text('Login')").first
                            if btn.is_visible():
                                btn.click()
                                page.wait_for_timeout(2000)
                    except:
                        pass

                page.screenshot(path=str(out), full_page=False)
                print(f"  [ok] {name}")
            except Exception as e:
                print(f"  [fail] {name}: {e}")

        browser.close()


# ─── TTS ─────────────────────────────────────────────────────────────────────


def generate_tts():
    """Generate narration for all scenes."""
    print("\n[1/4] Generating TTS...")
    import edge_tts

    for scene in SCENES:
        mp3 = SCENE_DIR / f"{scene['id']}.mp3"
        if mp3.exists():
            print(f"  [skip] {scene['id']}")
            continue
        asyncio.run(
            edge_tts.Communicate(
                scene["narration"], "en-US-GuyNeural", rate="-5%"
            ).save(str(mp3))
        )
        print(f"  [ok] {scene['id']}")


def audio_duration(p):
    r = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(p)],
        capture_output=True, text=True,
    )
    return float(r.stdout.strip())


# ─── ANIMATED SCENES ────────────────────────────────────────────────────────


def make_scene(scene):
    """Create a single animated scene with smooth Ken Burns + overlay text."""
    screenshot = SCENE_DIR / f"{scene['screenshot']}.png"
    mp3 = SCENE_DIR / f"{scene['id']}.mp3"

    if not screenshot.exists() or not mp3.exists():
        return None

    dur = scene["duration"]
    total_frames = int(dur * FPS)

    # Ken Burns parameters — slow, subtle, cinematic
    zoom_start = scene["zoom_start"]
    zoom_end = scene["zoom_end"]
    pan = scene["pan"]

    # Zoom expression
    if scene["zoom"] == "in":
        zoom_expr = f"zoom+{(zoom_end - zoom_start) / total_frames:.8f}"
    else:
        zoom_expr = f"zoom-{(zoom_start - zoom_end) / total_frames:.8f}"

    # Pan expressions — subtle movement
    if pan == "center":
        x_expr = "iw/2-(iw/zoom/2)"
        y_expr = "ih/2-(ih/zoom/2)"
    elif pan == "right":
        x_expr = f"iw/2-(iw/zoom/2)+((iw/zoom)*{(zoom_end-1)/5:.6f})"
        y_expr = "ih/2-(ih/zoom/2)"
    elif pan == "left":
        x_expr = f"iw/2-(iw/zoom/2)-((iw/zoom)*{(zoom_end-1)/5:.6f})"
        y_expr = "ih/2-(ih/zoom/2)"
    elif pan == "down":
        x_expr = "iw/2-(iw/zoom/2)"
        y_expr = f"ih/2-(ih/zoom/2)+((ih/zoom)*{(zoom_end-1)/5:.6f})"
    else:
        x_expr = "iw/2-(iw/zoom/2)"
        y_expr = "ih/2-(ih/zoom/2)"

    zoompan = (
        f"zoompan=z='if(eq(on,1),{zoom_start},{zoom_expr})':"
        f"x='{x_expr}':y='{y_expr}':"
        f"d={total_frames}:s={W}x{H}:fps={FPS}"
    )

    # Overlay text — large, centered, with shadow
    text = scene.get("overlay", "")
    text_size = scene.get("overlay_size", 60)
    text_pos = scene.get("overlay_pos", "center")

    if text_pos == "center":
        text_y = "h/2-text_h/2"
    elif text_pos == "top":
        text_y = "h*0.1"
    else:
        text_y = "h*0.8"

    text_escaped = text.replace("'", "'\\''").replace(":", "\\:")

    # Text appears with fade-in, stays, fades-out
    drawtext = (
        f"drawtext=text='{text_escaped}':"
        f"fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:"
        f"fontsize={text_size}:fontcolor=white@0.9:"
        f"borderw=3:bordercolor=black@0.6:"
        f"x=(w-text_w)/2:y={text_y}:"
        f"alpha='if(lt(t,0.8),t/0.8,if(gt(t,{dur-0.8}),(({dur}-t)/0.8),1))'"
    )

    # Scene fades in and out (1s each)
    fade = f"fade=t=in:st=0:d=1,fade=t=out:st={dur-1}:d=1"

    vf = f"{zoompan},{drawtext},{fade}"

    out = SCENE_DIR / f"scene_{scene['id']}.mp4"

    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-i", str(screenshot),
        "-i", str(mp3),
        "-vf", vf,
        "-c:v", "libx264", "-preset", "slow", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-t", f"{dur:.2f}",
        "-shortest",
        str(out),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  [error] {scene['id']}: {result.stderr[-200:]}")
        return None

    return out


# ─── CAPTIONS ────────────────────────────────────────────────────────────────


def generate_captions():
    """Generate SRT with cumulative timestamps."""
    print("\n[3/4] Generating captions...")
    srt = []
    idx = 1
    offset = 0.0

    for scene in SCENES:
        mp3 = SCENE_DIR / f"{scene['id']}.mp3"
        if not mp3.exists():
            continue
        dur = audio_duration(mp3)
        words = scene["narration"].split()
        wps = len(words) / dur
        t = 0.0
        i = 0
        while i < len(words):
            chunk = words[i : i + 8]
            chunk_dur = len(chunk) / wps
            srt.append(f"{idx}")
            srt.append(f"{fmt_time(offset + t)} --> {fmt_time(offset + t + chunk_dur)}")
            srt.append(" ".join(chunk))
            srt.append("")
            idx += 1
            t += chunk_dur
            i += 8
        offset += scene["duration"] + 0.3  # Small gap between scenes

    srt_path = SCENE_DIR / "captions_v3.srt"
    srt_path.write_text("\n".join(srt))
    print(f"  {idx-1} caption blocks")
    return srt_path


def fmt_time(s):
    h = int(s // 3600)
    m = int((s % 3600) // 60)
    sec = int(s % 60)
    ms = int((s - int(s)) * 1000)
    return f"{h:02d}:{m:02d}:{sec:02d},{ms:03d}"


# ─── ASSEMBLY ────────────────────────────────────────────────────────────────


def assemble():
    # Capture screenshots
    capture_screenshots()

    # Generate TTS
    generate_tts()

    # Create animated scenes
    print("\n[2/4] Creating animated scenes...")
    segments = []
    for scene in SCENES:
        seg = make_scene(scene)
        if seg and seg.exists():
            segments.append(seg)
            print(f"  [ok] {scene['id']}")
        else:
            print(f"  [fail] {scene['id']}")

    if not segments:
        print("  [ERROR] No segments!")
        return

    # Concatenate with crossfade transitions
    print(f"\n[3/4] Concatenating {len(segments)} segments with crossfades...")

    # Use crossfade filter between segments
    if len(segments) == 1:
        concat = segments[0]
    else:
        # Build crossfade chain
        inputs = []
        for seg in segments:
            inputs.extend(["-i", str(seg)])

        # Crossfade duration
        xfade_dur = 1.0  # 1 second crossfade

        # Build filter complex
        filter_parts = []
        n = len(segments)

        if n == 2:
            filter_parts.append(
                f"[0:v][1:v]xfade=transition=fade:duration={xfade_dur}:offset={SCENES[0]['duration']-xfade_dur}[v]"
            )
            filter_parts.append(
                f"[0:a][1:a]acrossfade=d={xfade_dur}[a]"
            )
        else:
            # Chain crossfades
            filter_parts.append(
                f"[0:v][1:v]xfade=transition=fade:duration={xfade_dur}:offset={SCENES[0]['duration']-xfade_dur}[v01]"
            )
            filter_parts.append(
                f"[0:a][1:a]acrossfade=d={xfade_dur}[a01]"
            )

            for i in range(2, n):
                prev = f"v{i-1:02d}"
                curr = f"v{i:02d}" if i < n-1 else "v"
                prev_a = f"a{i-1:02d}"
                curr_a = f"a{i:02d}" if i < n-1 else "a"

                # Calculate offset: sum of previous scene durations minus crossfades
                offset = sum(s["duration"] for s in SCENES[:i]) - (i * xfade_dur)

                if i < n-1:
                    filter_parts.append(
                        f"[{prev}][{i}:v]xfade=transition=fade:duration={xfade_dur}:offset={offset}[{curr}]"
                    )
                    filter_parts.append(
                        f"[{prev_a}][{i}:a]acrossfade=d={xfade_dur}[{curr_a}]"
                    )
                else:
                    filter_parts.append(
                        f"[{prev}][{i}:v]xfade=transition=fade:duration={xfade_dur}:offset={offset}[v]"
                    )
                    filter_parts.append(
                        f"[{prev_a}][{i}:a]acrossfade=d={xfade_dur}[a]"
                    )

        filter_complex = ";\n".join(filter_parts)

        raw = SCENE_DIR / "raw_crossfaded.mp4"
        cmd = [
            "ffmpeg", "-y",
            *inputs,
            "-filter_complex", filter_complex,
            "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-crf", "18", "-preset", "slow",
            "-c:a", "aac", "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            str(raw),
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"  Crossfade failed: {result.stderr[-300:]}")
            print("  Falling back to concat...")
            # Fallback: simple concat
            concat_file = SCENE_DIR / "concat.txt"
            with open(concat_file, "w") as f:
                for seg in segments:
                    f.write(f"file '{seg}'\n")
            raw = SCENE_DIR / "raw_concat.mp4"
            subprocess.run([
                "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                "-i", str(concat_file), "-c", "copy", str(raw)
            ], capture_output=True)

        concat = raw

    # Burn captions
    print("\n[4/4] Burning captions...")
    srt_path = generate_captions()

    # Also create VTT for HTML5 player
    vtt_path = OUTPUT_DIR / "explainer_captions.vtt"
    vtt_content = "WEBVTT\n\n" + srt_path.read_text().replace(",", ".")
    vtt_path.write_text(vtt_content)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    final = OUTPUT_DIR / "affilirank-explainer.mp4"

    style = (
        "FontName=Arial,FontSize=26,PrimaryColour=&H00FFFFFF,"
        "OutlineColour=&H00000000,BorderStyle=3,Outline=2,Shadow=1,"
        "Alignment=2,MarginV=50,MarginL=120,MarginR=120"
    )

    result = subprocess.run([
        "ffmpeg", "-y",
        "-i", str(concat),
        "-vf", f"subtitles={srt_path}:force_style='{style}'",
        "-c:v", "libx264", "-crf", "18", "-preset", "slow",
        "-c:a", "copy",
        str(final),
    ], capture_output=True, text=True)

    if result.returncode != 0:
        print(f"  Caption burn failed: {result.stderr[-300:]}")
        # Fallback: no captions
        import shutil
        shutil.copy(concat, final)

    # Cleanup
    for seg in segments:
        seg.unlink(missing_ok=True)
    for f in SCENE_DIR.glob("raw_*.mp4"):
        f.unlink(missing_ok=True)

    if final.exists():
        dur = audio_duration(final)
        size = final.stat().st_size / 1024 / 1024
        print(f"\n  Output: {final}")
        print(f"  Duration: {int(dur//60)}:{int(dur%60):02d}")
        print(f"  Size: {size:.1f} MB")
    else:
        print("  [ERROR] Final video not created")


# ─── MAIN ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    assemble()
