-- Ensure admin review queue can read all user_submissions while normal users remain owner-scoped.
-- This migration is idempotent and can be run safely in Supabase SQL Editor.

alter table public.user_submissions enable row level security;

drop policy if exists "Own submissions read" on public.user_submissions;
drop policy if exists "Own submissions write" on public.user_submissions;
drop policy if exists "Admin read submissions" on public.user_submissions;

create policy "Users can read own submissions"
on public.user_submissions
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own submissions"
on public.user_submissions
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Admins can read all submissions"
on public.user_submissions
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);
