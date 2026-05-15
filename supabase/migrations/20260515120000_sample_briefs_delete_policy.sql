-- Allow users to delete their own brief history (privacy / data control).
drop policy if exists "users delete own briefs" on public.sample_briefs;
create policy "users delete own briefs"
  on public.sample_briefs for delete
  to authenticated
  using (auth.uid() = user_id);
