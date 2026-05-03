-- Allow the admin account to read all hours and all profiles.
-- Run this in Supabase SQL Editor after 0001_init.sql.

create policy "admin_select_all_hours" on public.hours
  for select using (
    (select email from public.profiles where id = auth.uid()) = 'f.sweiss7@gmail.com'
  );

create policy "admin_select_all_profiles" on public.profiles
  for select using (
    auth.uid() = id
    or (select email from public.profiles where id = auth.uid()) = 'f.sweiss7@gmail.com'
  );
