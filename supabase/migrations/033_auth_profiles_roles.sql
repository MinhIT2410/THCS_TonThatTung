-- 033_auth_profiles_roles.sql
-- Basic profiles and role foundation for Supabase Auth.
-- This migration only creates schema/policies.
-- Do not run automatically without user confirmation.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  full_name text null,
  avatar_url text null,

  role text not null default 'viewer',

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_role_check check (
    role in ('admin', 'editor', 'teacher', 'viewer')
  )
);

create index if not exists idx_profiles_role
on public.profiles(role);

create index if not exists idx_profiles_is_active
on public.profiles(is_active);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- Automatically create profile after user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    'viewer'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;

-- Users can read their own profile.
drop policy if exists "Users can read own profile" on public.profiles;

create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

-- Users are not allowed to update profiles directly at this stage.
-- Profile updates and role changes must be handled later through admin-only policies
-- or secure server-side functions.
drop policy if exists "Users can update own basic profile" on public.profiles;

-- Temporary admin read policy:
-- Any authenticated user can read profiles for development/testing.
-- Replace later with strict admin-only policies.
drop policy if exists "Authenticated can read profiles temporarily" on public.profiles;

create policy "Authenticated can read profiles temporarily"
on public.profiles
for select
to authenticated
using (true);
