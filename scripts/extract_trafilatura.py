#!/usr/bin/env python3
"""Tier-1 web extraction: Trafilatura.

Reads a JSON list of {url, source_id, topic_id} on stdin (or via --input),
writes a JSON list of {url, source_id, topic_id, title, text, language, tier}
to stdout (or --output). Exits 0 on success, 1 on extraction failure for
ALL inputs (so Kestra's `runIf` chain can fall through to the next tier).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import trafilatura
from trafilatura.settings import use_config


def _config():
    cfg = use_config()
    cfg.set("DEFAULT", "EXTRACTION_TIMEOUT", "20")
    cfg.set("DEFAULT", "MIN_OUTPUT_SIZE", "200")
    return cfg


def extract_one(url: str, cfg) -> dict | None:
    downloaded = trafilatura.fetch_url(url, config=cfg)
    if not downloaded:
        return None
    extracted = trafilatura.extract(
        downloaded,
        output_format="json",
        with_metadata=True,
        include_comments=False,
        include_tables=False,
        config=cfg,
    )
    if not extracted:
        return None
    payload = json.loads(extracted)
    text = payload.get("text") or ""
    if len(text) < 200:
        return None
    return {
        "title": payload.get("title"),
        "text": text,
        "language": payload.get("language"),
        "author": payload.get("author"),
        "published": payload.get("date"),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=None)
    parser.add_argument("--output", type=Path, default=None)
    args = parser.parse_args()

    raw = args.input.read_text() if args.input else sys.stdin.read()
    items = json.loads(raw)
    cfg = _config()

    results: list[dict] = []
    for item in items:
        url = item["url"]
        try:
            extracted = extract_one(url, cfg)
        except Exception as exc:  # noqa: BLE001 — broad catch is intentional
            print(f"trafilatura failed for {url}: {exc}", file=sys.stderr)
            extracted = None
        if extracted is None:
            continue
        results.append({**item, **extracted, "tier": "trafilatura"})

    if not results:
        print("trafilatura extracted nothing — falling through", file=sys.stderr)
        return 1

    out = json.dumps(results, ensure_ascii=False)
    if args.output:
        args.output.write_text(out)
    else:
        sys.stdout.write(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
