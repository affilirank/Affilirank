#!/usr/bin/env python3
"""Download a Vimeo video by ID.

Flow:
  1. GET https://vimeo.com/{id} (curl_cffi chrome impersonation) -> parse the
     private embed hash `h` from the page's player embed URL.
  2. GET https://player.vimeo.com/video/{id}?h={hash} -> parse `window.playerConfig`
     for the signed HLS master URL.
  3. Stream that master URL with ffmpeg (-c copy) to the output file.

Signed URLs expire ~1h, so download immediately after fetching.

Usage:
  python3 download-vimeo.py <video_id> <out.mp4> [referer]
"""
import json
import re
import subprocess
import sys

from curl_cffi import requests

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"


def get_page(url, referer=None):
    headers = {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    if referer:
        headers["Referer"] = referer
    r = requests.get(url, impersonate="chrome", timeout=40, headers=headers)
    r.raise_for_status()
    return r.text


def find_hash(html):
    m = re.search(r"player\.vimeo\.com/video/(\d+)\?h=([a-f0-9]+)", html)
    if m:
        return m.group(2)
    return None


def get_master_url(video_id, referer=None):
    h = None
    try:
        page = get_page(f"https://vimeo.com/{video_id}", referer)
        h = find_hash(page)
    except Exception:
        pass  # private/deleted main page — try player config directly
    player_url = f"https://player.vimeo.com/video/{video_id}"
    if h:
        player_url += f"?h={h}"
    cfg_html = get_page(player_url, referer or "https://vimeo.com/")
    i = cfg_html.find("window.playerConfig")
    if i < 0:
        raise RuntimeError("no window.playerConfig in player page")
    start = cfg_html.find("{", i)
    depth, end = 0, None
    for j in range(start, len(cfg_html)):
        if cfg_html[j] == "{":
            depth += 1
        elif cfg_html[j] == "}":
            depth -= 1
            if depth == 0:
                end = j
                break
    cfg = json.loads(cfg_html[start:end + 1])
    files = cfg["request"]["files"]
    # Prefer the akfire HLS master; fall back to any hls/dash url.
    for kind in ("hls", "dash"):
        cdns = files.get(kind, {}).get("cdns", {})
        for name in ("akfire_interconnect_quic", "fastly_skyfire"):
            if name in cdns:
                return cdns[name]["url"]
        for cname, c in cdns.items():
            return c.get("url")
    raise RuntimeError("no stream found in player config")


def download(video_id, out, referer=None):
    master = get_master_url(video_id, referer)
    tmp = str(out) + ".part.mp4"
    cmd = [
        "yt-dlp", "--user-agent", UA, "--no-mtime", "--no-progress",
        "-o", tmp, master,
    ]
    subprocess.run(cmd, check=True, capture_output=True, text=True)
    for cand in [tmp, str(out) + ".mp4"]:
        import os as _os
        if _os.path.exists(cand) and _os.path.getsize(cand) > 0:
            _os.rename(cand, str(out))
            return
    raise RuntimeError(f"yt-dlp produced no output for {video_id}")


if __name__ == "__main__":
    video_id = sys.argv[1]
    out = sys.argv[2]
    referer = sys.argv[3] if len(sys.argv) > 3 else None
    download(video_id, out, referer)
    print(f"OK {video_id} -> {out}")
