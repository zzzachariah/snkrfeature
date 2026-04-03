-- remove custom admin session table and rely on Supabase auth + profiles.role

drop policy if exists "Admin read sessions" on admin_sessions;
drop policy if exists "Admin write sessions" on admin_sessions;

drop index if exists idx_admin_sessions_user_id;
drop index if exists idx_admin_sessions_expires_at;

drop table if exists admin_sessions;
