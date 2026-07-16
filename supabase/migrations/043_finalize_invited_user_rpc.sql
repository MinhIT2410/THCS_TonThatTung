-- 043_finalize_invited_user_rpc.sql
-- Create RPC finalize_invited_user with strict security definer and transaction guarantee

create or replace function public.finalize_invited_user(
  target_user_id uuid,
  target_email text,
  target_full_name text,
  target_role_codes text[],
  actor_user_id uuid,
  target_class_id uuid default null,
  target_academic_year_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unique_roles text[];
begin
  -- 1. Ensure profile exists and has proper name, preserving other attributes
  insert into public.profiles (id, full_name, role, is_active)
  values (
    target_user_id,
    target_full_name,
    'viewer', -- legacy default role in profiles_role_check
    true
  )
  on conflict (id) do update set
    full_name = coalesce(target_full_name, public.profiles.full_name);

  -- 2. Validate role codes are not null or empty
  if target_role_codes is null or array_length(target_role_codes, 1) = 0 then
    raise exception 'Người dùng phải có ít nhất một vai trò.' using errcode = 'P0001';
  end if;

  -- 3. Eliminate duplicates
  select array_agg(distinct r)
  into v_unique_roles
  from unnest(target_role_codes) r;

  -- 4. Verify all role codes exist in roles table
  if exists (
    select 1 from unnest(v_unique_roles) r
    left join public.roles pr on pr.code = r
    where pr.code is null
  ) then
    raise exception 'Một hoặc nhiều vai trò không hợp lệ.' using errcode = 'P0002';
  end if;

  -- 5. Delete existing user roles and insert new ones
  delete from public.user_roles where user_id = target_user_id;

  insert into public.user_roles (user_id, role_code, created_by)
  select target_user_id, r, actor_user_id
  from unnest(v_unique_roles) r;

  -- 6. Handle Student Enrollment if role contains STUDENT
  if 'STUDENT' = any(v_unique_roles) then
    if target_class_id is null or target_academic_year_id is null then
      raise exception 'Học sinh bắt buộc phải được chọn lớp học và năm học.' using errcode = 'P0003';
    end if;

    -- Clean old enrollments to prevent unique constraint violation
    delete from public.student_enrollments where student_id = target_user_id;

    insert into public.student_enrollments (student_id, class_id, academic_year_id)
    values (target_user_id, target_class_id, target_academic_year_id);
  end if;

  -- 7. Insert Audit Log
  insert into public.user_audit_logs (actor_id, target_user_id, action_type, new_data)
  values (
    actor_user_id,
    target_user_id,
    'INVITE_USER',
    jsonb_build_object(
      'email', target_email,
      'full_name', target_full_name,
      'roles', v_unique_roles,
      'class_id', target_class_id,
      'academic_year_id', target_academic_year_id
    )
  );
end;
$$;

-- Revoke permissions
revoke execute on function public.finalize_invited_user(uuid, text, text, text[], uuid, uuid, uuid) from public;
revoke execute on function public.finalize_invited_user(uuid, text, text, text[], uuid, uuid, uuid) from authenticated;
revoke execute on function public.finalize_invited_user(uuid, text, text, text[], uuid, uuid, uuid) from anon;

-- Grant to service_role and postgres
grant execute on function public.finalize_invited_user(uuid, text, text, text[], uuid, uuid, uuid) to service_role;
grant execute on function public.finalize_invited_user(uuid, text, text, text[], uuid, uuid, uuid) to postgres;
