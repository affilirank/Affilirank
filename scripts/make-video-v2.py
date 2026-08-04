#!/usr/bin/env python3
"""
AffiliRank Animated Video Producer v2
Uses real product screenshots + motion graphics + proper captions.
"""

import asyncio
import os
import subprocess
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# ─── CONFIG ──────────────────────────────────────────────────────────────────

VOICE = "en-US-GuyNeural"
VOICE_RATE = "+5%"
OUTPUT_DIR = Path("public/videos")
SCENE_DIR = Path("tmp/video-scenes")
SCREENSHOT_DIR = Path("tmp/screenshots")
W, H = 1920, 1080
FPS = 30

# Font
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

def get_font(size, bold=True):
    path = FONT_BOLD if bold else FONT_REGULAR
    try:
        return ImageFont.truetype(path, size)
    except:
        return ImageFont.load_default()


# ─── SCENE DEFINITIONS ──────────────────────────────────────────────────────

EXPLAINER_SCENES = [
    {
        "id": "hook",
        "narration": "Stop building affiliate sites from scratch. There's a faster way to rank and earn.",
        "screenshot": "home.png",
        "overlay": "Stop Building From Scratch",
        "zoom": "in",
        "zoom_start": 1.0,
        "zoom_end": 1.15,
        "pan": "center",
        "duration": 6,
        "text_position": "center",
    },
    {
        "id": "pain_old",
        "narration": "You know the struggle. Find a product. Write a review. Optimize for SEO. Add affiliate links. Publish. Then wait weeks hoping Google notices.",
        "screenshot": "blog.png",
        "overlay": "The Old Way: Manual Blog Writing",
        "zoom": "in",
        "zoom_start": 1.0,
        "zoom_end": 1.2,
        "pan": "right",
        "duration": 10,
        "text_position": "top",
    },
    {
        "id": "pain_time",
        "narration": "Most affiliates spend eighty percent of their time on content. That's time not spent on strategy or scaling.",
        "screenshot": "admin.png",
        "overlay": "80% Wasted on Content Creation",
        "zoom": "out",
        "zoom_start": 1.2,
        "zoom_end": 1.0,
        "pan": "left",
        "duration": 8,
        "text_position": "center",
    },
    {
        "id": "solution",
        "narration": "What if you could publish a fully optimized deal stream in minutes?",
        "screenshot": "deal_stream.png",
        "overlay": "Meet AffiliRank",
        "zoom": "in",
        "zoom_start": 1.0,
        "zoom_end": 1.1,
        "pan": "center",
        "duration": 6,
        "text_position": "center",
    },
    {
        "id": "feature_stream",
        "narration": "AffiliRank turns any JVZoo offer into a self-ranking deal stream. Paste one link. It publishes itself. Every CTA carries your affiliate tag.",
        "screenshot": "deal_stream.png",
        "overlay": "Self-Ranking Deal Stream",
        "zoom": "in",
        "zoom_start": 1.0,
        "zoom_end": 1.25,
        "pan": "down",
        "duration": 9,
        "text_position": "top",
    },
    {
        "id": "feature_blog",
        "narration": "The SEO blog module writes keyword-optimized review articles for every deal. No more blank screens. No freelancers. Fully automated.",
        "screenshot": "blog.png",
        "overlay": "Auto-Writing SEO Blog",
        "zoom": "in",
        "zoom_start": 1.0,
        "zoom_end": 1.3,
        "pan": "center",
        "duration": 9,
        "text_position": "top",
    },
    {
        "id": "feature_pages",
        "narration": "Deal detail pages with Product schema markup. Rich snippets in Google. Your deals stand out in search results.",
        "screenshot": "affilirank_page.png",
        "overlay": "Rich Snippets in Google",
        "zoom": "in",
        "zoom_start": 1.0,
        "zoom_end": 1.2,
        "pan": "right",
        "duration": 8,
        "text_position": "top",
    },
    {
        "id": "social",
        "narration": "AffiliRank is your entire affiliate business in a box. Deploy once. Rank forever. Collect lifetime commissions.",
        "screenshot": "home.png",
        "overlay": "Your Affiliate Business in a Box",
        "zoom": "out",
        "zoom_start": 1.3,
        "zoom_end": 1.0,
        "pan": "center",
        "duration": 8,
        "text_position": "center",
    },
    {
        "id": "cta",
        "narration": "One-time payment. Lifetime access. Get AffiliRank now and start ranking today.",
        "screenshot": "funnel.png",
        "overlay": "Get Instant Access — $37",
        "zoom": "in",
        "zoom_start": 1.0,
        "zoom_end": 1.1,
        "pan": "center",
        "duration": 7,
        "text_position": "center",
    },
]


# ─── GENERATE TTS ───────────────────────────────────────────────────────────

async def generate_tts(scenes, video_type):
    SCENE_DIR.mkdir(parents=True, exist_ok=True)
    for scene in scenes:
        out = SCENE_DIR / f"{scene['id']}.mp3"
        if out.exists():
            continue
        print(f"  [tts] {scene['id']}...")
        cmd = [
            "edge-tts", "--voice", VOICE, "--rate", VOICE_RATE,
            "--text", scene["narration"],
            "--write-media", str(out),
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        await proc.wait()


# ─── GET AUDIO DURATION ─────────────────────────────────────────────────────

def audio_duration(mp3):
    r = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(mp3)],
        capture_output=True, text=True
    )
    return float(r.stdout.strip())


# ─── CREATE ANIMATED SCENE ──────────────────────────────────────────────────

def make_animated_scene(scene):
    """Create an animated scene with zoom/pan using ffmpeg."""
    screenshot = SCREENSHOT_DIR / scene["screenshot"]
    if not screenshot.exists():
        print(f"  [WARN] Missing screenshot: {screenshot}")
        return None
    
    mp3 = SCENE_DIR / f"{scene['id']}.mp3"
    duration = audio_duration(mp3) + 0.5
    
    # Calculate zoom/pan filter
    zoom_start = scene.get("zoom_start", 1.0)
    zoom_end = scene.get("zoom_end", 1.1)
    pan = scene.get("pan", "center")
    
    # Build zoompan filter for Ken Burns effect
    # zoompan: z='zoom', x='pan_x', y='pan_y', d='duration_frames', s='output_size', fps='fps'
    total_frames = int(duration * FPS)
    
    # Zoom interpolation
    if scene["zoom"] == "in":
        zoom_expr = f"zoom+{(zoom_end-zoom_start)/total_frames:.6f}"
        z_start = zoom_start
    else:
        zoom_expr = f"zoom-{(zoom_start-zoom_end)/total_frames:.6f}"
        z_start = zoom_start
    
    # Pan expressions based on direction
    if pan == "center":
        x_expr = "iw/2-(iw/zoom/2)"
        y_expr = "ih/2-(ih/zoom/2)"
    elif pan == "right":
        x_expr = f"iw/2-(iw/zoom/2)+((iw/zoom)*{(zoom_end-1)/4:.4f})"
        y_expr = "ih/2-(ih/zoom/2)"
    elif pan == "left":
        x_expr = f"iw/2-(iw/zoom/2)-((iw/zoom)*{(zoom_end-1)/4:.4f})"
        y_expr = "ih/2-(ih/zoom/2)"
    elif pan == "down":
        x_expr = "iw/2-(iw/zoom/2)"
        y_expr = f"ih/2-(ih/zoom/2)+((ih/zoom)*{(zoom_end-1)/4:.4f})"
    else:
        x_expr = "iw/2-(iw/zoom/2)"
        y_expr = "ih/2-(ih/zoom/2)"
    
    zoompan = (
        f"zoompan=z='if(eq(on,1),{z_start},{zoom_expr})':"
        f"x='{x_expr}':y='{y_expr}':"
        f"d={total_frames}:s={W}x{H}:fps={FPS}"
    )
    
    # Add text overlay
    text = scene.get("overlay", "")
    text_pos = scene.get("text_position", "center")
    
    if text_pos == "center":
        text_y = "h/2-text_h/2"
    elif text_pos == "top":
        text_y = "h*0.12"
    else:
        text_y = "h*0.75"
    
    # Escape text for ffmpeg
    text_escaped = text.replace("'", "'\\''").replace(":", "\\:")
    
    drawtext = (
        f"drawtext=text='{text_escaped}':"
        f"fontfile={FONT_BOLD}:fontsize=56:fontcolor=white:"
        f"borderw=3:bordercolor=black@0.8:"
        f"x=(w-text_w)/2:y={text_y}:"
        f"enable='between(t,0.5,{duration-0.5})'"
    )
    
    # Fade in/out
    fade = f"fade=t=in:st=0:d=0.5,fade=t=out:st={duration-0.5}:d=0.5"
    
    vf = f"{zoompan},{drawtext},{fade}"
    
    out = SCENE_DIR / f"anim_{scene['id']}.mp4"
    
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-i", str(screenshot),
        "-i", str(mp3),
        "-vf", vf,
        "-c:v", "libx264", "-preset", "fast", "-crf", "22",
        "-c:a", "aac", "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-t", f"{duration:.2f}",
        "-shortest",
        str(out)
    ]
    
    subprocess.run(cmd, capture_output=True)
    return out


# ─── GENERATE CAPTIONS (SRT) ───────────────────────────────────────────────

def generate_captions(scenes):
    srt = []
    idx = 1
    for scene in scenes:
        mp3 = SCENE_DIR / f"{scene['id']}.mp3"
        if not mp3.exists():
            continue
        dur = audio_duration(mp3)
        words = scene["narration"].split()
        wps = len(words) / dur
        t = 0.0
        i = 0
        while i < len(words):
            chunk = words[i:i+6]
            chunk_dur = len(chunk) / wps
            srt.append(f"{idx}")
            srt.append(f"{fmt_time(t)} --> {fmt_time(t+chunk_dur)}")
            srt.append(" ".join(chunk))
            srt.append("")
            idx += 1
            t += chunk_dur
            i += 6
    return "\n".join(srt)


def fmt_time(s):
    h = int(s // 3600)
    m = int((s % 3600) // 60)
    sec = int(s % 60)
    ms = int((s - int(s)) * 1000)
    return f"{h:02d}:{m:02d}:{sec:02d},{ms:03d}"


# ─── ASSEMBLE FINAL VIDEO ──────────────────────────────────────────────────

def assemble(scenes, video_type):
    print(f"\n[1/4] Generating TTS...")
    asyncio.run(generate_tts(scenes, video_type))
    
    print(f"\n[2/4] Creating animated scenes...")
    segments = []
    for scene in scenes:
        seg = make_animated_scene(scene)
        if seg and seg.exists():
            segments.append(seg)
            print(f"  [ok] {scene['id']}")
        else:
            print(f"  [fail] {scene['id']}")
    
    if not segments:
        print("  [ERROR] No segments created!")
        return
    
    print(f"\n[3/4] Concatenating {len(segments)} segments...")
    concat_file = SCENE_DIR / f"{video_type}_concat.txt"
    with open(concat_file, "w") as f:
        for seg in segments:
            f.write(f"file '{seg}'\n")
    
    raw = SCENE_DIR / f"{video_type}_raw.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", str(concat_file), "-c", "copy", str(raw)
    ], capture_output=True)
    
    print(f"\n[4/4] Burning captions...")
    srt_path = SCENE_DIR / f"{video_type}_captions.srt"
    srt_path.write_text(generate_captions(scenes))
    
    # Convert SRT to VTT for HTML5
    vtt_path = OUTPUT_DIR / f"{video_type}_captions.vtt"
    vtt_content = "WEBVTT\n\n" + srt_path.read_text().replace(",", ".")
    vtt_path.write_text(vtt_content)
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    final = OUTPUT_DIR / f"affilirank-{video_type}.mp4"
    
    # Proper caption style - bottom third, readable
    style = (
        "FontName=Arial,FontSize=24,PrimaryColour=&H00FFFFFF,"
        "OutlineColour=&H00000000,BorderStyle=3,Outline=2,Shadow=0,"
        "Alignment=2,MarginV=80,MarginL=100,MarginR=100"
    )
    
    subprocess.run([
        "ffmpeg", "-y",
        "-i", str(raw),
        "-vf", f"subtitles={srt_path}:force_style='{style}'",
        "-c:v", "libx264", "-crf", "20", "-preset", "medium",
        "-c:a", "copy",
        str(final)
    ], capture_output=True)
    
    # Cleanup
    for seg in segments:
        seg.unlink(missing_ok=True)
    raw.unlink(missing_ok=True)
    
    dur = audio_duration(final) if final.exists() else 0
    size = final.stat().st_size if final.exists() else 0
    print(f"\n  Output: {final}")
    print(f"  Duration: {int(dur//60)}:{int(dur%60):02d}")
    print(f"  Size: {size/1024/1024:.1f} MB")
    return final


# ─── MAIN ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    video_type = sys.argv[1] if len(sys.argv) > 1 else "explainer"
    scenes = EXPLAINER_SCENES
    assemble(scenes, video_type)
