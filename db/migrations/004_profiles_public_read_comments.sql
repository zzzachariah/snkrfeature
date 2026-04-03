-- allow public read of profile rows so comment lists can show usernames
create policy if not exists "Public read profiles" on profiles
for select
using (true);

-- helpful indexes for comment + vote lookups
create index if not exists idx_comments_shoe_created_at on comments (shoe_id, created_at desc);
create index if not exists idx_comment_votes_comment_id on comment_votes (comment_id);
create index if not exists idx_comment_votes_user_id on comment_votes (user_id);
