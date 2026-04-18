-- admin-reviewed shoe image generation workflow
create table if not exists shoe_images (
  id uuid primary key default gen_random_uuid(),
  shoe_id uuid not null references shoes(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  status text not null check (status in ('pending', 'approved', 'rejected')),
  provider text not null default 'PackyAPI',
  prompt text,
  generation_error text,
  rejection_reason text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  rejected_at timestamptz
);

create index if not exists idx_shoe_images_shoe_created_at on shoe_images (shoe_id, created_at desc);
create index if not exists idx_shoe_images_shoe_status on shoe_images (shoe_id, status);

alter table shoe_images enable row level security;

create policy if not exists "Public read approved shoe images" on shoe_images
for select
using (status = 'approved');

create policy if not exists "Admin read all shoe images" on shoe_images
for select
using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy if not exists "Admin insert shoe images" on shoe_images
for insert
with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy if not exists "Admin update shoe images" on shoe_images
for update
using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

insert into storage.buckets (id, name, public)
values ('shoe-images', 'shoe-images', true)
on conflict (id) do update set public = excluded.public;

create policy if not exists "Public read shoe images bucket" on storage.objects
for select
using (bucket_id = 'shoe-images');
