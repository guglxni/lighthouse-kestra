#!/usr/bin/env python3
"""
Run `graphify extract` against Groq's OpenAI-compatible API.

Graphify's `--backend ollama` adds Ollama-only fields (`keep_alive`, `options.num_ctx`)
to chat.completions requests. Groq returns 400 for those. This script patches
`graphify.llm._call_openai_compat` so that when the base URL is Groq, the backend
behaves like OpenAI for request shaping only (same Groq URL and key).

Usage (from repo root):

  export OLLAMA_BASE_URL="https://api.groq.com/openai/v1"
  export OLLAMA_API_KEY="gsk_..."
  uvx --with openai --from graphifyy python scripts/graphify_extract_groq.py extract . \\
    --backend ollama --model "meta-llama/llama-4-scout-17b-16e-instruct" --out .
"""

from __future__ import annotations

import sys


def _patch_groq_compat() -> None:
    import graphify.llm as llm

    _orig = llm._call_openai_compat

    def _compat(
        base_url: str,
        api_key: str,
        model: str,
        user_message: str,
        *,
        temperature=None,
        reasoning_effort=None,
        max_completion_tokens: int = 8192,
        backend: str = "openai",
    ):
        if backend == "ollama" and base_url and "groq.com" in str(base_url).lower():
            backend = "openai"
        return _orig(
            base_url,
            api_key,
            model,
            user_message,
            temperature=temperature,
            reasoning_effort=reasoning_effort,
            max_completion_tokens=max_completion_tokens,
            backend=backend,
        )

    llm._call_openai_compat = _compat


def main() -> None:
    _patch_groq_compat()
    sys.argv = ["graphify", *sys.argv[1:]]
    from graphify.__main__ import main as graphify_main

    graphify_main()


if __name__ == "__main__":
    main()
