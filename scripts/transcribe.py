#!/usr/bin/env python3
"""Audio/video transcription via faster-whisper.

Inputs (stdin JSON or --input):
    [{"url": "...", "source_id": "...", "topic_id": "...", "title": "..."}, ...]

For each item:
    1. yt-dlp downloads bestaudio to /tmp/<source_id>.m4a
    2. faster-whisper (small.en, INT8) transcribes
    3. emit JSON: {url, source_id, topic_id, title, text, language, duration_s}

Heuristic relevance pre-filter: skips items whose `title` does not contain
any of `--keywords` (comma-separated). Pass an empty list to disable.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from faster_whisper import WhisperModel


def title_passes(title: str, keywords: list[str]) -> bool:
    if not keywords:
        return True
    title_l = (title or "").lower()
    return any(kw.lower() in title_l for kw in keywords)


def fetch_audio(url: str, dest: Path) -> Path | None:
    cmd = [
        "yt-dlp",
        "-x",
        "--audio-format",
        "m4a",
        "--no-playlist",
        "--quiet",
        "-o",
        str(dest),
        url,
    ]
    try:
        subprocess.run(cmd, check=True, timeout=900)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
        print(f"yt-dlp failed for {url}: {exc}", file=sys.stderr)
        return None
    return dest if dest.exists() else None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--model-size", default="small.en")
    parser.add_argument("--keywords", default="")
    parser.add_argument("--max-items", type=int, default=10)
    args = parser.parse_args()

    raw = args.input.read_text() if args.input else sys.stdin.read()
    items = json.loads(raw)
    keywords = [k.strip() for k in args.keywords.split(",") if k.strip()]

    items = [i for i in items if title_passes(i.get("title", ""), keywords)]
    items = items[: args.max_items]

    if not items:
        out = json.dumps([])
        (args.output.write_text(out) if args.output else sys.stdout.write(out))
        return 0

    model = WhisperModel(
        args.model_size,
        device="cpu",
        compute_type="int8",
        cpu_threads=int(os.environ.get("WHISPER_THREADS", "4")),
    )

    results: list[dict] = []
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        for item in items:
            url = item["url"]
            audio = fetch_audio(url, tmp / f"{item['source_id']}.m4a")
            if not audio:
                continue
            try:
                segments, info = model.transcribe(
                    str(audio),
                    beam_size=1,
                    vad_filter=True,
                )
                text = " ".join(seg.text.strip() for seg in segments)
            except Exception as exc:  # noqa: BLE001
                print(f"whisper failed for {url}: {exc}", file=sys.stderr)
                continue
            results.append(
                {
                    **item,
                    "text": text,
                    "language": info.language,
                    "duration_s": info.duration,
                }
            )

    out = json.dumps(results, ensure_ascii=False)
    if args.output:
        args.output.write_text(out)
    else:
        sys.stdout.write(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
