-- Lighthouse demo — per-user preferences.
-- API keys are NEVER stored here. Users provide their LLM/Exa keys at
-- runtime via the demo UI; we only persist non-secret routing config.

create table if not exists public.user_settings (
  user_id           uuid primary key references auth.users on delete cascade,
  llm_base_url      text,                       -- e.g. https://api.openai.com/v1
  llm_model_primary text,                       -- user-chosen model id
  llm_model_quality text,                       -- optional quality-tier model id
  exa_api_base      text default 'https://api.exa.ai',
  default_topic_id  text default 'agentic-eng',
  slack_webhook     text,
  discord_webhook   text,
  notion_page_id    text,
  email_to          text,
  updated_at        timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "users read own settings" on public.user_settings;
create policy "users read own settings"
  on public.user_settings for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users upsert own settings" on public.user_settings;
create policy "users upsert own settings"
  on public.user_settings for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users update own settings" on public.user_settings;
create policy "users update own settings"
  on public.user_settings for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users delete own settings" on public.user_settings;
create policy "users delete own settings"
  on public.user_settings for delete
  to authenticated
  using (auth.uid() = user_id);

-- Optional: store sample briefs the user generates with their BYOK key so
-- the dashboard can show recent runs (Realtime subscribable).
create table if not exists public.sample_briefs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  topic_id    text not null,
  prompt      text not null,
  output_md   text not null,
  model       text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_sample_briefs_user_created
  on public.sample_briefs (user_id, created_at desc);

alter table public.sample_briefs enable row level security;

drop policy if exists "users read own briefs" on public.sample_briefs;
create policy "users read own briefs"
  on public.sample_briefs for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users insert own briefs" on public.sample_briefs;
create policy "users insert own briefs"
  on public.sample_briefs for insert
  to authenticated
  with check (auth.uid() = user_id);
