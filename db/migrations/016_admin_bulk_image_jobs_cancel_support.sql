do $$
begin
  alter table admin_bulk_image_jobs
  drop constraint if exists admin_bulk_image_jobs_status_check;
exception
  when undefined_object then null;
end $$;

alter table admin_bulk_image_jobs
add constraint admin_bulk_image_jobs_status_check
check (status in ('running', 'cancel_requested', 'cancelled', 'completed', 'failed'));

alter table admin_bulk_image_jobs
add column if not exists cancel_requested_at timestamptz,
add column if not exists cancelled_at timestamptz;

drop index if exists uq_admin_bulk_image_jobs_running;

create unique index if not exists uq_admin_bulk_image_jobs_active
on admin_bulk_image_jobs ((1))
where status in ('running', 'cancel_requested');
