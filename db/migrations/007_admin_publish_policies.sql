-- allow admin publish pipeline to write production tables used by /admin/review publish action

create policy if not exists "Admin insert shoes" on shoes
for insert to authenticated
with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy if not exists "Admin manage shoe specs" on shoe_specs
for all to authenticated
using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy if not exists "Admin manage sources" on sources
for all to authenticated
using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

alter table shoe_stories enable row level security;

create policy if not exists "Public read shoe stories" on shoe_stories
for select using (true);

create policy if not exists "Admin manage shoe stories" on shoe_stories
for all to authenticated
using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
