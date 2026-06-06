-- Custom topic profiles + OAuth connection metadata (tokens stored server-side, RLS-scoped).

create table if not exists public.custom_topics (
  id            text not null,
  user_id       uuid not null references auth.users on delete cascade,
  name          text not null,
  description   text not null default '',
  yaml_content  text not null,
  schedule      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists idx_custom_topics_user
  on public.custom_topics (user_id, updated_at desc);

alter table public.custom_topics enable row level security;

drop policy if exists "users read own custom topics" on public.custom_topics;
create policy "users read own custom topics"
  on public.custom_topics for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users insert own custom topics" on public.custom_topics;
create policy "users insert own custom topics"
  on public.custom_topics for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users update own custom topics" on public.custom_topics;
create policy "users update own custom topics"
  on public.custom_topics for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users delete own custom topics" on public.custom_topics;
create policy "users delete own custom topics"
  on public.custom_topics for delete to authenticated
  using (auth.uid() = user_id);

-- OAuth + AgentMail routing (non-BYOK LLM keys still never stored here)
alter table public.user_settings
  add column if not exists slack_access_token text,
  add column if not exists slack_team_name text,
  add column if not exists notion_access_token text,
  add column if not exists notion_workspace_name text,
  add column if not exists agentmail_inbox_id text,
  add column if not exists oauth_slack_connected_at timestamptz,
  add column if not exists oauth_notion_connected_at timestamptz;
