-- comment voting + admin helper policies
create table if not exists comment_votes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references comments(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  vote_type text not null check (vote_type in ('like','dislike')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

alter table comment_votes enable row level security;

create policy "Public read comment votes" on comment_votes for select using (true);
create policy "Own vote insert" on comment_votes for insert to authenticated with check (auth.uid() = user_id);
create policy "Own vote update" on comment_votes for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own vote delete" on comment_votes for delete to authenticated using (auth.uid() = user_id);
