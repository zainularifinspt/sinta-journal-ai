alter table public.profiles enable row level security;
alter table public.journals enable row level security;

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role = 'admin'
  );
$$;

drop policy if exists "Users can select own profile" on public.profiles;
create policy "Users can select own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Admins can select all profiles" on public.profiles;
create policy "Admins can select all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Public can select journals" on public.journals;
create policy "Public can select journals"
on public.journals
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can insert journals" on public.journals;
create policy "Admins can insert journals"
on public.journals
for insert
to authenticated
with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can update journals" on public.journals;
create policy "Admins can update journals"
on public.journals
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can delete journals" on public.journals;
create policy "Admins can delete journals"
on public.journals
for delete
to authenticated
using (public.is_admin(auth.uid()));

-- Placeholder tables for the next auth-based phase:
-- favorites and recommendation_history policies can be added after their schemas exist.
