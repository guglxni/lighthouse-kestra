-- Add Telegram delivery channel to user_settings.
-- Users provide their own Telegram chat ID; the server uses
-- TELEGRAM_BOT_TOKEN env var (shared Lighthouse bot).

alter table public.user_settings
  add column if not exists telegram_chat_id text;
