-- admin session, moderation drafts, audit trail, and published-state controls

create table if not exists admin_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_used_at timestamptz,
  revoked_at timestamptz
);

create table if not exists submission_admin_versions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references user_submissions(id) on delete cascade,
  final_payload jsonb not null,
  last_edited_by uuid references profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_admin_id uuid references profiles(id) on delete set null,
  target_type text not null check (target_type in ('submission','shoe','admin_session')),
  target_submission_id uuid references user_submissions(id) on delete cascade,
  target_shoe_id uuid references shoes(id) on delete cascade,
  action text not null,
  note text,
  before_payload jsonb,
  after_payload jsonb,
  created_at timestamptz not null default now()
);

alter table shoes add column if not exists is_published boolean not null default true;
alter table shoes add column if not exists unpublished_at timestamptz;
alter table shoes add column if not exists unpublished_by uuid references profiles(id) on delete set null;

alter table user_submissions add column if not exists published_shoe_id uuid references shoes(id) on delete set null;
alter table user_submissions add column if not exists published_at timestamptz;
alter table user_submissions add column if not exists reviewed_by uuid references profiles(id) on delete set null;
alter table user_submissions add column if not exists reviewer_notes text;

alter table user_submissions drop constraint if exists user_submissions_status_check;
alter table user_submissions add constraint user_submissions_status_check
check (status in ('pending','normalized','draft','approved','published','rejected','unpublished'));

create index if not exists idx_admin_sessions_user_id on admin_sessions (user_id);
create index if not exists idx_admin_sessions_expires_at on admin_sessions (expires_at);
create index if not exists idx_user_submissions_status_created on user_submissions (status, created_at desc);
create index if not exists idx_admin_audit_target_submission on admin_audit_logs (target_submission_id, created_at desc);
create index if not exists idx_admin_audit_target_shoe on admin_audit_logs (target_shoe_id, created_at desc);
create index if not exists idx_shoes_published_state on shoes (is_published, updated_at desc);

alter table admin_sessions enable row level security;
alter table submission_admin_versions enable row level security;
alter table admin_audit_logs enable row level security;

-- only admins can work with admin workflow tables
create policy if not exists "Admin read sessions" on admin_sessions
for select to authenticated
using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy if not exists "Admin write sessions" on admin_sessions
for all to authenticated
using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy if not exists "Admin read submission versions" on submission_admin_versions
for select to authenticated
using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy if not exists "Admin write submission versions" on submission_admin_versions
for all to authenticated
using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy if not exists "Admin read audit logs" on admin_audit_logs
for select to authenticated
using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy if not exists "Admin write audit logs" on admin_audit_logs
for insert to authenticated
with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy if not exists "Admin manage shoes" on shoes
for update to authenticated
using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy if not exists "Admin read submissions" on user_submissions
for select to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy if not exists "Admin update submissions" on user_submissions
for update to authenticated
using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy if not exists "Admin read normalized results" on normalized_submission_results
for select to authenticated
using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
