#!/usr/bin/env python3
"""On-demand deep-dive via GPT-Researcher.

Invoked from `serve.deepdive` (Kestra Docker task). Reads a JSON input:
    {"query": "...", "topic_id": "...", "report_type": "research_report"}

Writes a JSON output: {"markdown": "...", "sources": [...], "elapsed_s": ...}.

GPT-Researcher pulls credentials from env (OPENAI_API_KEY, TAVILY_API_KEY, ...),
which Kestra injects via secrets on the Docker task.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
import time
from pathlib import Path

try:
    from gpt_researcher import GPTResearcher
except ImportError:  # pragma: no cover — let the wrapper fail loudly when invoked
    GPTResearcher = None  # type: ignore[assignment]


async def run(query: str, report_type: str) -> dict:
    if GPTResearcher is None:
        raise RuntimeError("gpt_researcher not installed in this image")
    started = time.time()
    researcher = GPTResearcher(query=query, report_type=report_type)
    await researcher.conduct_research()
    report = await researcher.write_report()
    sources = researcher.get_source_urls()
    return {
        "markdown": report,
        "sources": sources,
        "elapsed_s": round(time.time() - started, 1),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    raw = args.input.read_text() if args.input else sys.stdin.read()
    payload = json.loads(raw)

    result = asyncio.run(
        run(
            query=payload["query"],
            report_type=payload.get("report_type", "research_report"),
        )
    )
    out = json.dumps(result, ensure_ascii=False)
    if args.output:
        args.output.write_text(out)
    else:
        sys.stdout.write(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
