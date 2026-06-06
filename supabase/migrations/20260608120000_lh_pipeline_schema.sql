-- Lighthouse pipeline tables on Supabase Postgres (shared with Kestra flows).
-- Kestra metadata tables live in public; app pipeline data lives in lh.

create extension if not exists vector with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create schema if not exists lh;

create table if not exists lh.documents (
    id              uuid            primary key default gen_random_uuid(),
    topic_id        text            not null,
    source          text            not null,
    source_id       text            not null,
    url             text,
    title           text,
    author          text,
    published_at    timestamptz,
    fetched_at      timestamptz     not null default now(),
    raw_text        text,
    language        text,
    metadata        jsonb           not null default '{}'::jsonb,
    unique (topic_id, source, source_id)
);

create index if not exists idx_documents_topic_published
    on lh.documents (topic_id, published_at desc);
create index if not exists idx_documents_source
    on lh.documents (source);
create index if not exists idx_documents_metadata_gin
    on lh.documents using gin (metadata);

create table if not exists lh.embeddings (
    document_id     uuid            primary key references lh.documents(id) on delete cascade,
    embedding       vector(1536) not null,
    model           text            not null,
    created_at      timestamptz     not null default now()
);

create index if not exists idx_embeddings_hnsw_cosine
    on lh.embeddings using hnsw (embedding vector_cosine_ops)
    with (m = 16, ef_construction = 64);

create table if not exists lh.classifications (
    id              uuid            primary key default gen_random_uuid(),
    document_id     uuid            not null references lh.documents(id) on delete cascade,
    topic_id        text            not null,
    relevance       numeric(4,3)    not null,
    category        text,
    tags            text[]          not null default '{}',
    rationale       text,
    model           text            not null,
    created_at      timestamptz     not null default now(),
    unique (document_id, topic_id, model)
);

create index if not exists idx_classifications_topic_relevance
    on lh.classifications (topic_id, relevance desc);

create table if not exists lh.briefs (
    id              uuid            primary key default gen_random_uuid(),
    topic_id        text            not null,
    date            date            not null,
    markdown        text            not null,
    clusters        jsonb           not null default '[]'::jsonb,
    delivered_to    text[]          not null default '{}',
    created_at      timestamptz     not null default now(),
    unique (topic_id, date)
);

create table if not exists lh.chat_history (
    id              bigserial       primary key,
    session_id      text            not null,
    topic_id        text            not null,
    role            text            not null,
    content         text            not null,
    created_at      timestamptz     not null default now()
);

create index if not exists idx_chat_session
    on lh.chat_history (session_id, created_at);

-- Service role + postgres (Kestra JDBC) need full access; not exposed via Data API.
revoke all on schema lh from public, anon, authenticated;
grant usage on schema lh to postgres, service_role;
grant all on all tables in schema lh to postgres, service_role;
grant all on all sequences in schema lh to postgres, service_role;
alter default privileges in schema lh grant all on tables to postgres, service_role;
alter default privileges in schema lh grant all on sequences to postgres, service_role;
