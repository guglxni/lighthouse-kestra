-- Lighthouse — pgvector bootstrap.
-- Loaded by Postgres on first boot (mounted at /docker-entrypoint-initdb.d/00_pgvector.sql).

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Dedicated DB for Miniflux so it doesn't share Kestra's connection pool.
SELECT 'CREATE DATABASE miniflux'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'miniflux')\gexec
