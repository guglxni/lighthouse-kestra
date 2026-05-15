-- Enable Supabase Realtime on sample_briefs so the dashboard can subscribe
-- to INSERT events and show newly generated briefs without a page refresh.
-- RLS is already on this table, so each user only receives their own rows.
ALTER PUBLICATION supabase_realtime ADD TABLE public.sample_briefs;
