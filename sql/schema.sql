-- Lighthouse — application schema.
-- All app objects live under the `lh` schema so we can keep Kestra's tables
-- and Miniflux's tables out of the way.

CREATE SCHEMA IF NOT EXISTS lh;

-- One row per fetched item across all sources.
CREATE TABLE IF NOT EXISTS lh.documents (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id        TEXT            NOT NULL,
    source          TEXT            NOT NULL,         -- rss | arxiv | github | hn | reddit | youtube | podcast | web
    source_id       TEXT            NOT NULL,         -- source-native id (entry guid, arxiv id, repo full_name, hn id, …)
    url             TEXT,
    title           TEXT,
    author          TEXT,
    published_at    TIMESTAMPTZ,
    fetched_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    raw_text        TEXT,
    language        TEXT,
    metadata        JSONB           NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (topic_id, source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_documents_topic_published
    ON lh.documents (topic_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_source
    ON lh.documents (source);
CREATE INDEX IF NOT EXISTS idx_documents_metadata_gin
    ON lh.documents USING GIN (metadata);

-- pgvector embeddings (OpenAI text-embedding-3-small => 1536-d).
CREATE TABLE IF NOT EXISTS lh.embeddings (
    document_id     UUID            PRIMARY KEY REFERENCES lh.documents(id) ON DELETE CASCADE,
    embedding       vector(1536)    NOT NULL,
    model           TEXT            NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- HNSW index for fast cosine similarity search.
CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw_cosine
    ON lh.embeddings USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Per-document classification scores from the multi-LLM fallback chain.
CREATE TABLE IF NOT EXISTS lh.classifications (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID            NOT NULL REFERENCES lh.documents(id) ON DELETE CASCADE,
    topic_id        TEXT            NOT NULL,
    relevance       NUMERIC(4,3)    NOT NULL,         -- 0.000 - 1.000
    category        TEXT,
    tags            TEXT[]          NOT NULL DEFAULT '{}',
    rationale       TEXT,
    model           TEXT            NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (document_id, topic_id, model)
);

CREATE INDEX IF NOT EXISTS idx_classifications_topic_relevance
    ON lh.classifications (topic_id, relevance DESC);

-- Daily brief artifacts.
CREATE TABLE IF NOT EXISTS lh.briefs (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id        TEXT            NOT NULL,
    date            DATE            NOT NULL,
    markdown        TEXT            NOT NULL,
    clusters        JSONB           NOT NULL DEFAULT '[]'::jsonb,
    delivered_to    TEXT[]          NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (topic_id, date)
);

-- RAG chat transcripts for the chat-the-brief App.
CREATE TABLE IF NOT EXISTS lh.chat_history (
    id              BIGSERIAL       PRIMARY KEY,
    session_id      TEXT            NOT NULL,
    topic_id        TEXT            NOT NULL,
    role            TEXT            NOT NULL,         -- user | assistant | system
    content         TEXT            NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_session
    ON lh.chat_history (session_id, created_at);
