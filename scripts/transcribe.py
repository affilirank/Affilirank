#!/usr/bin/env python3
"""Transcribe a vendor demo video to JSON segments with timestamps.

Reusable piece of the demo-review pipeline: feeds auto demo-clip cutting and
per-segment narration. Uses faster-whisper (base, int8, CPU).

Usage:
  python3 transcribe.py <video.mp4> <out.json>
"""
import json
import sys
from pathlib import Path

from faster_whisper import WhisperModel


def transcribe(video: Path, out: Path, model_size="base"):
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        str(video),
        beam_size=5,
        vad_filter=True,
        word_timestamps=False,
    )
    rows = []
    for seg in segments:
        rows.append({
            "start": round(seg.start, 2),
            "end": round(seg.end, 2),
            "text": seg.text.strip(),
        })
    out.write_text(json.dumps({
        "file": str(video),
        "language": info.language,
        "duration": round(info.duration, 2),
        "segments": rows,
    }, indent=1))
    print(f"{video.name}: {len(rows)} segments, {round(info.duration,1)}s -> {out}")


if __name__ == "__main__":
    transcribe(Path(sys.argv[1]), Path(sys.argv[2]))
