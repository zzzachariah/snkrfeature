alter table user_submissions
  add column if not exists submission_type text not null default 'new_shoe',
  add column if not exists target_shoe_id uuid references shoes(id) on delete set null,
  add column if not exists original_snapshot jsonb;

alter table user_submissions
  drop constraint if exists user_submissions_submission_type_check;

alter table user_submissions
  add constraint user_submissions_submission_type_check
  check (submission_type in ('new_shoe', 'correction'));

create index if not exists idx_user_submissions_type_status_created
  on user_submissions (submission_type, status, created_at desc);
