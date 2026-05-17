alter table public.favorites enable row level security;
alter table public.recommendation_history enable row level security;

drop policy if exists "Users can select own favorites" on public.favorites;
create policy "Users can select own favorites"
on public.favorites
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Admins can select all favorites" on public.favorites;
create policy "Admins can select all favorites"
on public.favorites
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "Users can insert own favorites" on public.favorites;
create policy "Users can insert own favorites"
on public.favorites
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own favorites" on public.favorites;
create policy "Users can delete own favorites"
on public.favorites
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can select own recommendation history" on public.recommendation_history;
create policy "Users can select own recommendation history"
on public.recommendation_history
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Admins can select all recommendation history" on public.recommendation_history;
create policy "Admins can select all recommendation history"
on public.recommendation_history
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "Users can insert own recommendation history" on public.recommendation_history;
create policy "Users can insert own recommendation history"
on public.recommendation_history
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own recommendation history" on public.recommendation_history;
create policy "Users can delete own recommendation history"
on public.recommendation_history
for delete
to authenticated
using (auth.uid() = user_id);
