# Ingest sources — real integrations (no mock data)

All paths below call **live** APIs or **real** feeds and write into `lh.documents`. Empty results occur only when APIs return nothing, filters exclude items, or credentials are missing — never from hard-coded placeholder content.

| # | Source | Flow | What runs |
|---|--------|------|-----------|
| 1 | **RSS** | [`flows/ingest/rss.yaml`](../flows/ingest/rss.yaml) | [Miniflux](https://miniflux.app/docs/api.html) `/v1/entries` with `X-Auth-Token`; topic profiles filter by feed URL allowlist |
| 2 | **arXiv** | [`flows/ingest/arxiv.yaml`](../flows/ingest/arxiv.yaml) | Official [arxiv](https://pypi.org/project/arxiv/) PyPI client (Atom API) + HTTP fallback; categories from topic profile |
| 3 | **GitHub trending / search** | [`flows/ingest/github_trending.yaml`](../flows/ingest/github_trending.yaml) | [GitHub REST Search API](https://docs.github.com/en/rest/search/search#search-repositories) `GET /search/repositories`; optional `GITHUB_TOKEN` for rate limits |
| 4 | **Hacker News** | [`flows/ingest/hn_reddit.yaml`](../flows/ingest/hn_reddit.yaml) | [HN Algolia](https://hn.algolia.com/api) `search_by_date` with keyword + points filter |
| 5 | **Reddit** | same flow | Public `.json` endpoints (e.g. `old.reddit.com/r/{sub}/new.json`) with [`REDDIT_USER_AGENT`](../.env.example) |
| 6 | **YouTube / podcasts** | [`flows/ingest/audio_video.yaml`](../flows/ingest/audio_video.yaml) | YouTube channel [Atom feeds](https://www.youtube.com/feeds/videos.xml?channel_id=…), [feedparser](https://feedparser.readthedocs.io/); audio via [yt-dlp](https://github.com/yt-dlp/yt-dlp) + [faster-whisper](https://github.com/SYSTRAN/faster-whisper) in the worker image |
| 7 | **Arbitrary web** | [`flows/ingest/web_articles.yaml`](../flows/ingest/web_articles.yaml) | [Trafilatura](https://github.com/adbar/trafilatura) → [Jina Reader](https://r.jina.ai/) → [Playwright](https://playwright.dev/) Chromium in worker |

**Optional 8th — Exa (BYOK):** [`flows/ingest/exa_search.yaml`](../flows/ingest/exa_search.yaml) → [Exa Search API](https://docs.exa.ai/); requires `EXA_API_KEY`. Does not fabricate hits; `allowFailure: true` if the key is unset.

**FOSS / self-hosted stack** used alongside ingests: Miniflux, SearxNG, Postgres + pgvector, LiteLLM, worker Dockerfile (see [`README.md`](../README.md) FOSS table).
