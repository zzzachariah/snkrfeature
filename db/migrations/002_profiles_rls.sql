-- allow authenticated users to manage their own profile row
create policy if not exists "Own profile insert" on profiles
for insert to authenticated
with check (auth.uid() = id);

create policy if not exists "Own profile update" on profiles
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
