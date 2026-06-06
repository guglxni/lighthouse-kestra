-- Multiple daily run times per custom topic (same topic, several brief crons).
alter table public.custom_topics
  add column if not exists schedules text[];
