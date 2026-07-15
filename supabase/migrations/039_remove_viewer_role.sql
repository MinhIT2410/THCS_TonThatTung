-- 039_remove_viewer_role.sql
-- Removal of VIEWER role, updating handle_new_user trigger to not assign default roles.

-- 1. Remove existing 'VIEWER' role assignments from user_roles
delete from public.user_roles where role_code = 'VIEWER';

-- 2. Remove 'VIEWER' role from roles table
delete from public.roles where code = 'VIEWER';

-- 3. Update trigger handle_new_user() to NOT automatically assign default roles in user_roles and not get role from metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Create default profile with legacy 'viewer' role to satisfy profiles_role_check constraint
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    'viewer'
  )
  on conflict (id) do nothing;

  -- DO NOT insert any record into public.user_roles.
  -- This leaves the user with an empty roles array (roles = []) by default.

  return new;
end;
$$;
