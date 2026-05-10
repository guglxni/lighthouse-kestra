#!/usr/bin/env python3
"""Lightweight BERTopic clustering for the day's documents.

Inputs (stdin JSON or --input):
    [{"document_id": "...", "text": "...", "title": "..."}, ...]

Outputs:
    {
      "clusters": [
        {"id": 0, "label": "...", "keywords": [...], "document_ids": [...], "size": N},
        ...
      ],
      "outliers": [document_ids]
    }
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from bertopic import BERTopic
from sentence_transformers import SentenceTransformer


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--min-cluster-size", type=int, default=3)
    parser.add_argument("--embedding-model", default="all-MiniLM-L6-v2")
    args = parser.parse_args()

    raw = args.input.read_text() if args.input else sys.stdin.read()
    items = json.loads(raw)
    if len(items) < args.min_cluster_size:
        out = json.dumps({"clusters": [], "outliers": [i["document_id"] for i in items]})
        (args.output.write_text(out) if args.output else sys.stdout.write(out))
        return 0

    docs = [
        ((it.get("title") or "") + "\n\n" + (it.get("text") or "")).strip() or "empty"
        for it in items
    ]

    embedder = SentenceTransformer(args.embedding_model)
    embeddings = embedder.encode(docs, show_progress_bar=False)

    topic_model = BERTopic(
        min_topic_size=args.min_cluster_size,
        calculate_probabilities=False,
        verbose=False,
    )
    topics, _ = topic_model.fit_transform(docs, embeddings=np.asarray(embeddings))

    clusters: dict[int, dict] = {}
    outliers: list[str] = []
    for item, topic_id in zip(items, topics):
        if topic_id == -1:
            outliers.append(item["document_id"])
            continue
        cluster = clusters.setdefault(
            int(topic_id),
            {
                "id": int(topic_id),
                "label": "",
                "keywords": [],
                "document_ids": [],
                "size": 0,
            },
        )
        cluster["document_ids"].append(item["document_id"])
        cluster["size"] += 1

    info = topic_model.get_topic_info()
    for _, row in info.iterrows():
        tid = int(row["Topic"])
        if tid in clusters:
            words = topic_model.get_topic(tid) or []
            clusters[tid]["keywords"] = [w for w, _ in words[:8]]
            clusters[tid]["label"] = ", ".join(clusters[tid]["keywords"][:3])

    out = json.dumps(
        {"clusters": sorted(clusters.values(), key=lambda c: -c["size"]), "outliers": outliers},
        ensure_ascii=False,
    )
    if args.output:
        args.output.write_text(out)
    else:
        sys.stdout.write(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
