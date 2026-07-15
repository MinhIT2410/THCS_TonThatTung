-- 040_update_user_roles_rpc.sql
-- PostgreSQL function/RPC to update user profile and synchronize system roles inside a single transaction.

create or replace function public.update_user_with_roles(
  target_user_id uuid,
  new_full_name text,
  new_is_active boolean,
  new_role_codes text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_profile_exists boolean;
  sanitized_role_codes text[];
  v_profile record;
  v_roles text[];
begin
  -- 1. Check if caller is authenticated and has the SUPER_ADMIN role
  v_caller_id := auth.uid();
  if v_caller_id is null or not public.has_app_role(v_caller_id, 'SUPER_ADMIN') then
    raise exception 'Quyền truy cập bị từ chối. Chỉ SUPER_ADMIN mới có quyền thực hiện thao tác này.' using errcode = '42501';
  end if;

  -- 2. Check if target user exists
  select exists (
    select 1 from public.profiles where id = target_user_id
  ) into v_profile_exists;

  if not v_profile_exists then
    raise exception 'Không tìm thấy thông tin người dùng.' using errcode = 'P0002';
  end if;

  -- 3. Validate and sanitize roles
  -- Filter out duplicate role codes and any null elements
  if new_role_codes is not null then
    select array_agg(distinct val) into sanitized_role_codes
    from unnest(new_role_codes) val
    where val is not null;
  else
    sanitized_role_codes := '{}'::text[];
  end if;

  -- Check if all specified role codes exist in public.roles
  if array_length(sanitized_role_codes, 1) > 0 then
    if exists (
      select 1 
      from unnest(sanitized_role_codes) as input_code
      where not exists (
        select 1 from public.roles r where r.code = input_code
      )
    ) then
      raise exception 'Một hoặc nhiều vai trò không hợp lệ.' using errcode = 'P0003';
    end if;
  end if;

  -- 4. Update the profiles table
  update public.profiles
  set 
    full_name = new_full_name,
    is_active = new_is_active,
    updated_at = now()
  where id = target_user_id;

  -- 5. Synchronize user_roles:
  -- Insert roles to add
  insert into public.user_roles (user_id, role_code, created_by)
  select target_user_id, r_code, v_caller_id
  from unnest(sanitized_role_codes) as r_code
  where not exists (
    select 1 from public.user_roles ur 
    where ur.user_id = target_user_id and ur.role_code = r_code
  )
  and r_code is not null;

  -- Delete roles to remove
  delete from public.user_roles
  where user_id = target_user_id
    and (sanitized_role_codes is null or not (role_code = any(sanitized_role_codes)));

  -- 6. Retrieve updated profile and roles to return
  select * into v_profile from public.profiles where id = target_user_id;
  select coalesce(array_agg(role_code order by role_code), '{}'::text[]) into v_roles from public.user_roles where user_id = target_user_id;

  return jsonb_build_object(
    'id', v_profile.id,
    'full_name', v_profile.full_name,
    'avatar_url', v_profile.avatar_url,
    'is_active', v_profile.is_active,
    'created_at', v_profile.created_at,
    'updated_at', v_profile.updated_at,
    'roles', v_roles
  );
end;
$$;

-- Revoke execution from public & anon to secure the endpoint
revoke execute on function public.update_user_with_roles(uuid, text, boolean, text[]) from public;
revoke execute on function public.update_user_with_roles(uuid, text, boolean, text[]) from anon;

-- Grant execution to authenticated users
grant execute on function public.update_user_with_roles(uuid, text, boolean, text[]) to authenticated;
