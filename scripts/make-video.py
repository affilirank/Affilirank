#!/usr/bin/env python3
"""
AffiliRank Video Production Pipeline
Generates two promotional videos with scene images, voiceover, and captions.

Usage:
  python3 scripts/make-video.py --type explainer   # 3-min AffiliRank explainer
  python3 scripts/make-video.py --type bundle       # 6-min bundle deal video
"""

import asyncio
import json
import os
import subprocess
import sys
import textwrap
import tempfile
from pathlib import Path

# ─── CONFIG ──────────────────────────────────────────────────────────────────

VOICE = "en-US-GuyNeural"  # Professional male voice
VOICE_RATE = "+0%"         # Speaking rate adjustment
OUTPUT_DIR = Path("public/videos")
SCENE_DIR = Path("tmp/video-scenes")
CAPTION_STYLE = (
    "FontName=Arial,FontSize=22,PrimaryColour=&H00FFFFFF,"
    "OutlineColour=&H00000000,Outline=2,Shadow=1,"
    "Alignment=2,MarginV=60"
)

# ─── SCRIPTS ─────────────────────────────────────────────────────────────────

EXPLAINER_SCENES = [
    {
        "id": "hook",
        "narration": "Stop wasting hours building affiliate blog pages from scratch. There's a better way.",
        "duration": 6,
        "visual_prompt": "Digital marketing workspace with multiple screens showing blog editors, affiliate dashboards, and analytics. Dark moody lighting with purple and cyan neon accents. Modern tech aesthetic, wide angle shot.",
        "overlay_text": "Stop Building From Scratch",
        "scene_type": "hook",
    },
    {
        "id": "pain1",
        "narration": "You know the drill. You find a great product on JVZoo or ClickBank. You write a review. You SEO optimize it. You add affiliate links. You publish. And then... you wait. Weeks. Months. Hoping Google picks it up.",
        "duration": 12,
        "visual_prompt": "Frustrated marketer staring at a blank WordPress blog editor with a blinking cursor. Coffee cup nearby, late night setting. Multiple browser tabs open with keyword research tools. Dark atmospheric lighting.",
        "overlay_text": "The Old Way: Manual Blog Writing",
        "scene_type": "pain",
    },
    {
        "id": "pain2",
        "narration": "Most affiliates spend eighty percent of their time on content creation and SEO. That's time not spent on strategy, traffic, or scaling. You're stuck on the content treadmill.",
        "duration": 10,
        "visual_prompt": "Split screen showing a person stuck on a hamster wheel labeled 'Content Creation' on one side, and a dashboard showing zero traffic and zero sales on the other. Cyberpunk purple and cyan color scheme.",
        "overlay_text": "80% of Time Wasted on Content",
        "scene_type": "pain",
    },
    {
        "id": "pain3",
        "narration": "And let's be honest. Most affiliate sites look the same. Generic templates. Thin content. No real authority. Google sees right through it.",
        "duration": 8,
        "visual_prompt": "Row of identical, boring affiliate websites displayed on multiple monitors, all looking cookie-cutter. A red 'X' mark appears over them. Dark background with subtle grid pattern.",
        "overlay_text": "Generic Sites = Zero Authority",
        "scene_type": "pain",
    },
    {
        "id": "solution_intro",
        "narration": "What if you could publish a fully optimized deal stream and SEO blog in minutes instead of months?",
        "duration": 7,
        "visual_prompt": "A glowing futuristic dashboard appearing from darkness, showing a deal stream with product cards, blog articles, and analytics. Purple and cyan neon glow. Dramatic reveal lighting.",
        "overlay_text": "Meet AffiliRank",
        "scene_type": "solution",
    },
    {
        "id": "feature_stream",
        "narration": "AffiliRank turns any JVZoo offer into a self-ranking deal stream. You paste one link. It publishes itself. Every CTA carries your affiliate tag. Every view is monetized.",
        "duration": 10,
        "visual_prompt": "Screen recording style view of a deal stream interface showing product cards with prices, countdown timers, and 'Get Deal' buttons. Animated cards scrolling vertically like TikTok. Dark UI with gradient accents.",
        "overlay_text": "Self-Ranking Deal Stream",
        "scene_type": "feature",
    },
    {
        "id": "feature_blog",
        "narration": "The SEO blog module writes keyword-optimized review articles for every deal. No more staring at blank screens. No more outsourcing to freelancers. It's all automated.",
        "duration": 10,
        "visual_prompt": "A blog article being auto-generated on screen, with text appearing word by word. SEO score meter going from red to green. Google search results showing the article ranking on page one. Clean modern UI.",
        "overlay_text": "Auto-Writing SEO Blog",
        "scene_type": "feature",
    },
    {
        "id": "feature_pages",
        "narration": "Deal detail pages with Product schema markup. Google loves structured data. Your deals show up with rich snippets, prices, and ratings right in search results.",
        "duration": 8,
        "visual_prompt": "Google search results page showing rich snippets with product schema - price, rating stars, and availability. The result stands out from generic blue links. Purple highlight glow around the rich result.",
        "overlay_text": "Rich Snippets in Google",
        "scene_type": "feature",
    },
    {
        "id": "feature_analytics",
        "narration": "Built-in analytics track every click, every view, every conversion. Know exactly what's working and double down.",
        "duration": 7,
        "visual_prompt": "Analytics dashboard showing traffic graphs going up, conversion funnels, and heat maps. Green upward arrows. Real-time data visualization with glowing charts on dark background.",
        "overlay_text": "Track Everything",
        "scene_type": "feature",
    },
    {
        "id": "social_proof",
        "narration": "AffiliRank isn't just another tool. It's your entire affiliate business in a box. Deploy once. Rank forever. Collect lifetime commissions.",
        "duration": 9,
        "visual_prompt": "Aurora borealis-style background with the AffiliRank logo floating in the center. Floating testimonial cards and star ratings orbit around it. Majestic, premium feel with purple and cyan gradients.",
        "overlay_text": "Your Affiliate Business in a Box",
        "scene_type": "social",
    },
    {
        "id": "cta",
        "narration": "One-time payment. Lifetime access. No monthly fees. Get AffiliRank now and start ranking today.",
        "duration": 7,
        "visual_prompt": "Bold call-to-action screen with large 'Get Instant Access - $37' button glowing in cyan. Price crossed out from $97. Confetti particles and light rays emanating from the button. Dark premium background.",
        "overlay_text": "Get Instant Access — $37",
        "scene_type": "cta",
    },
]

BUNDLE_SCENES = [
    {
        "id": "hook",
        "narration": "You've seen AffiliRank. Now let me show you the full bundle and everything it unlocks.",
        "duration": 7,
        "visual_prompt": "A premium gift box opening with purple and cyan light rays shooting out. The AffiliRank logo floats above it. Dark luxurious background with particle effects.",
        "overlay_text": "The Complete Bundle",
        "scene_type": "hook",
    },
    {
        "id": "value1",
        "narration": "First, let's talk about what you're NOT getting. No monthly subscriptions. No per-seat pricing. No surprise renewals. One payment. Forever.",
        "duration": 10,
        "visual_prompt": "Crossed-out subscription boxes and monthly fee receipts floating and shattering. A single golden coin drops into a slot labeled 'Lifetime Access'. Clean dark background with sparkles.",
        "overlay_text": "No Monthly Fees. Ever.",
        "scene_type": "value",
    },
    {
        "id": "unlock_blog",
        "narration": "The SEO Blog Module. This is the big one. It auto-generates keyword-optimized review articles for every deal you publish. Not thin content. Real, research-backed articles that Google actually wants to rank.",
        "duration": 12,
        "visual_prompt": "Blog article being generated with SEO analysis overlays showing keyword density, readability score, and meta tags. Google Analytics showing organic traffic flowing in. Professional content creation aesthetic.",
        "overlay_text": "SEO Blog Module — Auto-Writing Reviews",
        "scene_type": "unlock",
    },
    {
        "id": "unlock_unlimited",
        "narration": "Unlimited Deals. The base plan caps you at ten deals. With the bundle, there's no ceiling. Add one hundred. Add one thousand. Your stream grows with you.",
        "duration": 9,
        "visual_prompt": "Deal cards multiplying infinitely across a dark grid, spreading outward in a wave pattern. Counter in the corner going from 10 to unlimited. Expanding universe visual metaphor with neon trails.",
        "overlay_text": "Unlimited Deals — No Cap",
        "scene_type": "unlock",
    },
    {
        "id": "unlock_exit",
        "narration": "Exit-Intent Popup. When a visitor is about to leave, a perfectly timed popup grabs their attention. Countdown timer. Urgency. This alone can double your conversion rate.",
        "duration": 10,
        "visual_prompt": "Browser window showing a visitor about to close the tab. A popup modal appears with a countdown timer and bold offer. Conversion rate meter jumping from 2% to 4%. Split-screen before/after.",
        "overlay_text": "Exit-Intent Popup — Double Conversions",
        "scene_type": "unlock",
    },
    {
        "id": "unlock_analytics",
        "narration": "Analytics Module. GA4 and Meta Pixel integration. Track every event. See exactly which deals convert. Know your numbers like the top one percent of affiliates.",
        "duration": 9,
        "visual_prompt": "Analytics dashboard with GA4 and Meta Pixel logos. Real-time event tracking visualization. Funnel chart showing visitor-to-sale conversion. Professional data analytics aesthetic with glowing graphs.",
        "overlay_text": "GA4 + Meta Pixel Tracking",
        "scene_type": "unlock",
    },
    {
        "id": "unlock_dealpages",
        "narration": "Deal Detail Pages. Each deal gets its own SEO-optimized landing page with Product schema markup. Rich snippets in Google. Prices, ratings, and availability showing right in search results.",
        "duration": 9,
        "visual_prompt": "Deal detail page template with rich product schema. Google search results showing rich snippets with stars, price, and availability. Multiple deal pages displayed in a grid. Clean modern web design.",
        "overlay_text": "Deal Pages with Rich Snippets",
        "scene_type": "unlock",
    },
    {
        "id": "unlock_video",
        "narration": "Pro Video Mode. Unlock MP4, iframe, and GIF support beyond YouTube and Vimeo. Your deal stream can showcase any creative format.",
        "duration": 8,
        "visual_prompt": "Video player showing different formats - MP4, iframe embed, and GIF animation. Format icons floating around a central video player. Dark cinematic background with purple light leaks.",
        "overlay_text": "Pro Video — MP4, GIF, iFrame",
        "scene_type": "unlock",
    },
    {
        "id": "total_value",
        "narration": "Let's add it up. The blog module alone is worth hundreds. Unlimited deals, exit intent, analytics, deal pages, pro video. If you bought these separately, you'd pay over five hundred dollars.",
        "duration": 10,
        "visual_prompt": "Calculator animation tallying up prices: Blog $197, Unlimited $97, Exit Intent $67, Analytics $47, Deal Pages $97, Pro Video $47. Total showing $552. Receipt-style layout on dark background.",
        "overlay_text": "Total Value: $552+",
        "scene_type": "value",
    },
    {
        "id": "bundle_price",
        "narration": "But today, you get everything. The complete bundle. Three hundred sixty-seven dollars. Or use code SAVE100 and pay just two hundred sixty-seven. One payment. Everything included. Forever.",
        "duration": 12,
        "visual_prompt": "Bold price reveal animation. $552 crossed out, $367 appears with glow effect, then $267 with 'SAVE100' coupon code floating. Gold and cyan color scheme. Premium gift reveal aesthetic.",
        "overlay_text": "Bundle: $367 — Use SAVE100 for $267",
        "scene_type": "price",
    },
    {
        "id": "cta",
        "narration": "This is your chance to own the complete affiliate marketing system. No monthly fees. No limits. Upgrade to the bundle now and start ranking like the pros.",
        "duration": 9,
        "visual_prompt": "Epic finale screen with the complete bundle iconography. 'Upgrade to Bundle' button glowing intensely. Particle effects and light rays. The AffiliRank logo and tagline centered. Dark premium finish.",
        "overlay_text": "Upgrade to the Bundle — One Payment, Forever",
        "scene_type": "cta",
    },
]

# ─── GENERATE NARRATION ─────────────────────────────────────────────────────

async def generate_narration(scenes, video_type):
    """Generate voiceover audio for each scene using edge-tts."""
    SCENE_DIR.mkdir(parents=True, exist_ok=True)
    
    for scene in scenes:
        out_path = SCENE_DIR / f"{scene['id']}.mp3"
        if out_path.exists():
            print(f"  [skip] {scene['id']}.mp3 exists")
            continue
        
        print(f"  [tts] {scene['id']}...")
        cmd = [
            "edge-tts",
            "--voice", VOICE,
            "--rate", VOICE_RATE,
            "--text", scene["narration"],
            "--write-media", str(out_path),
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        await proc.wait()
        if proc.returncode != 0:
            stderr = await proc.stderr.read()
            print(f"  [ERROR] {scene['id']}: {stderr.decode()}")
        else:
            print(f"  [done] {scene['id']}.mp3")


# ─── GENERATE CAPTIONS (SRT) ───────────────────────────────────────────────

def generate_captions(scenes):
    """Generate SRT captions from narration text, timed to scene durations."""
    srt_lines = []
    idx = 1
    for scene in scenes:
        words = scene["narration"].split()
        dur = scene["duration"]
        words_per_sec = len(words) / dur
        current_time = 0.0
        chunk_size = 6  # words per caption line
        i = 0
        while i < len(words):
            chunk = words[i : i + chunk_size]
            chunk_dur = len(chunk) / words_per_sec
            start = current_time
            end = current_time + chunk_dur
            srt_lines.append(f"{idx}")
            srt_lines.append(f"{fmt_time(start)} --> {fmt_time(end)}")
            srt_lines.append(" ".join(chunk))
            srt_lines.append("")
            idx += 1
            current_time = end
            i += chunk_size
    return "\n".join(srt_lines)


def fmt_time(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds - int(seconds)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


# ─── ASSEMBLE VIDEO WITH FFMPEG ────────────────────────────────────────────

def get_audio_duration(mp3_path):
    """Get duration of MP3 file in seconds."""
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(mp3_path)],
        capture_output=True, text=True
    )
    return float(result.stdout.strip())


def assemble_video(scenes, video_type):
    """Assemble final video from scene images + audio + captions."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    srt_path = SCENE_DIR / f"{video_type}_captions.srt"
    final_output = OUTPUT_DIR / f"affilirank-{video_type}.mp4"
    
    # Write captions
    srt_content = generate_captions(scenes)
    srt_path.write_text(srt_content)
    print(f"  [srt] {srt_path}")
    
    # Build ffmpeg concat list
    concat_file = SCENE_DIR / "concat.txt"
    segments = []
    
    for i, scene in enumerate(scenes):
        img_path = SCENE_DIR / f"{scene['id']}.png"
        audio_path = SCENE_DIR / f"{scene['id']}.mp3"
        
        if not img_path.exists():
            print(f"  [WARN] Missing image: {img_path}")
            continue
        if not audio_path.exists():
            print(f"  [WARN] Missing audio: {audio_path}")
            continue
        
        duration = get_audio_duration(audio_path)
        # Add small padding
        duration += 0.3
        
        seg_path = SCENE_DIR / f"seg_{i:03d}.mp4"
        segments.append(seg_path)
        
        # Create video segment: image + audio
        cmd = [
            "ffmpeg", "-y",
            "-loop", "1", "-i", str(img_path),
            "-i", str(audio_path),
            "-c:v", "libx264", "-tune", "stillimage",
            "-c:a", "aac", "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black",
            "-t", f"{duration:.2f}",
            "-shortest",
            str(seg_path)
        ]
        subprocess.run(cmd, capture_output=True)
        print(f"  [segment] {scene['id']}")
    
    # Concatenate segments
    with open(concat_file, "w") as f:
        for seg in segments:
            f.write(f"file '{seg}'\n")
    
    raw_concat = SCENE_DIR / "raw_concat.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", str(concat_file),
        "-c", "copy",
        str(raw_concat)
    ], capture_output=True)
    print(f"  [concat] {len(segments)} segments")
    
    # Burn in captions
    subprocess.run([
        "ffmpeg", "-y",
        "-i", str(raw_concat),
        "-vf", f"subtitles={srt_path}:force_style='{CAPTION_STYLE}'",
        "-c:v", "libx264", "-crf", "20",
        "-c:a", "copy",
        str(final_output)
    ], capture_output=True)
    print(f"  [final] {final_output}")
    
    # Cleanup segments
    for seg in segments:
        seg.unlink(missing_ok=True)
    raw_concat.unlink(missing_ok=True)
    concat_file.unlink(missing_ok=True)
    
    return final_output


# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    import argparse
    parser = argparse.ArgumentParser(description="AffiliRank video producer")
    parser.add_argument("--type", choices=["explainer", "bundle"], required=True)
    parser.add_argument("--narration-only", action="store_true",
                        help="Only generate narration audio, skip image generation")
    args = parser.parse_args()
    
    scenes = EXPLAINER_SCENES if args.type == "explainer" else BUNDLE_SCENES
    total_dur = sum(s["duration"] for s in scenes)
    
    print(f"\n{'='*60}")
    print(f"  AffiliRank {args.type.upper()} Video")
    print(f"  Scenes: {len(scenes)} | Target: ~{total_dur}s")
    print(f"  Voice: {VOICE}")
    print(f"{'='*60}\n")
    
    print("[1/2] Generating narration audio...")
    asyncio.run(generate_narration(scenes, args.type))
    
    if not args.narration_only:
        print("\n[2/2] Assembling video (needs scene images)...")
        print("  Run image generation first, then re-run with --assemble")
    else:
        print("\n  Narration files saved to:", SCENE_DIR)


if __name__ == "__main__":
    main()
