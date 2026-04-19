create table if not exists admin_bulk_image_jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('running', 'completed', 'failed')),
  total_count integer not null default 0,
  processed_count integer not null default 0,
  success_count integer not null default 0,
  skip_count integer not null default 0,
  failure_count integer not null default 0,
  started_by uuid references profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  current_shoe_id uuid references shoes(id) on delete set null,
  current_shoe_label text,
  failure_summary jsonb
);

create unique index if not exists uq_admin_bulk_image_jobs_running
on admin_bulk_image_jobs ((status))
where status = 'running';

create index if not exists idx_admin_bulk_image_jobs_started_at
on admin_bulk_image_jobs (started_at desc);

create table if not exists admin_bulk_image_job_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references admin_bulk_image_jobs(id) on delete cascade,
  shoe_id uuid not null references shoes(id) on delete cascade,
  shoe_label text not null,
  status text not null check (status in ('pending', 'processing', 'success', 'skipped', 'failed')),
  error_message text,
  source_image_url text,
  selection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_bulk_image_job_items_job_status
on admin_bulk_image_job_items (job_id, status, created_at);

alter table admin_bulk_image_jobs enable row level security;
alter table admin_bulk_image_job_items enable row level security;

create policy if not exists "Admin read bulk image jobs" on admin_bulk_image_jobs
for select
using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy if not exists "Admin insert bulk image jobs" on admin_bulk_image_jobs
for insert
with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy if not exists "Admin update bulk image jobs" on admin_bulk_image_jobs
for update
using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy if not exists "Admin read bulk image job items" on admin_bulk_image_job_items
for select
using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy if not exists "Admin insert bulk image job items" on admin_bulk_image_job_items
for insert
with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy if not exists "Admin update bulk image job items" on admin_bulk_image_job_items
for update
using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
