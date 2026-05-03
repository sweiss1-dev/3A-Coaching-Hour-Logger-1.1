-- 3A Coaching Hour Logger — initial schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → paste & run.

-- =========================
-- profiles: one row per user
-- =========================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user can read & update only their own profile.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create a profile when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================
-- hours: time entries
-- =========================
create table if not exists public.hours (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  work_date date not null,
  start_time time not null,
  end_time time not null,
  hours numeric(6,2) not null check (hours >= 0),
  created_at timestamptz not null default now()
);

create index if not exists hours_user_date_idx on public.hours (user_id, work_date desc);
create index if not exists hours_date_idx on public.hours (work_date);

alter table public.hours enable row level security;

-- Each user can only see / write their OWN hour entries.
drop policy if exists "hours_select_own" on public.hours;
create policy "hours_select_own" on public.hours
  for select using (auth.uid() = user_id);

drop policy if exists "hours_insert_own" on public.hours;
create policy "hours_insert_own" on public.hours
  for insert with check (auth.uid() = user_id);

drop policy if exists "hours_update_own" on public.hours;
create policy "hours_update_own" on public.hours
  for update using (auth.uid() = user_id);

drop policy if exists "hours_delete_own" on public.hours;
create policy "hours_delete_own" on public.hours
  for delete using (auth.uid() = user_id);

-- The Edge Function uses the service_role key, which bypasses RLS,
-- so it can read everyone's hours when building the bi-weekly report.
