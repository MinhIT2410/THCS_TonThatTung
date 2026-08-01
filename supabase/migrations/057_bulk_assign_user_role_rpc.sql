-- 057_bulk_assign_user_role_rpc.sql
-- Administrative RPC for bulk user role assignment with safety checks and set-based DB processing.

create or replace function public.bulk_assign_user_role(
  p_role_code text,
  p_selection_mode text default 'PAGE_SELECTION',
  p_user_ids uuid[] default null,
  p_only_without_roles boolean default false,
  p_require_student_identity boolean default false,
  p_search text default null,
  p_is_active boolean default null,
  p_role_filter text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_matched_count bigint := 0;
  v_inserted_count bigint := 0;
  v_skipped_count bigint := 0;
  v_role_exists boolean := false;
  v_has_permission boolean := false;
  v_sanitized_role text;
  v_sanitized_search text;
begin
  -- 1. Verify authentication
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Yêu cầu đăng nhập để thực hiện thao tác này.' using errcode = '42501';
  end if;

  -- 2. Verify caller authorization
  v_has_permission := public.has_app_role(v_caller_id, 'SUPER_ADMIN') or
                       public.has_app_role(v_caller_id, 'PRINCIPAL') or
                       public.has_app_role(v_caller_id, 'VICE_PRINCIPAL') or
                       public.has_app_role(v_caller_id, 'STAFF');

  if not v_has_permission then
    raise exception 'Quyền truy cập bị từ chối. Bạn không có quyền quản lý vai trò người dùng.' using errcode = '42501';
  end if;

  -- 3. Validate target role_code
  v_sanitized_role := trim(p_role_code);

  -- Prevent bulk assignment of protected administrative roles
  if v_sanitized_role in ('SUPER_ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL') then
    raise exception 'Không được phép gán hàng loạt vai trò quản trị (SUPER_ADMIN, PRINCIPAL, VICE_PRINCIPAL).' using errcode = 'P0001';
  end if;

  select exists (
    select 1 from public.roles where code = v_sanitized_role
  ) into v_role_exists;

  if not v_role_exists then
    raise exception 'Vai trò "%" không tồn tại trong hệ thống.', v_sanitized_role using errcode = 'P0002';
  end if;

  v_sanitized_search := nullif(trim(p_search), '');

  -- 4. Gather target user IDs matching selection and filters in temp table
  create temp table tmp_bulk_target_users on commit drop as
  select p.id
  from public.profiles p
  where
    -- Selection mode criteria
    (
      (p_selection_mode = 'PAGE_SELECTION' and p_user_ids is not null and p.id = any(p_user_ids))
      or
      (
        p_selection_mode = 'FILTERED_ALL' and
        -- Search term filter
        (v_sanitized_search is null or p.full_name ilike '%' || v_sanitized_search || '%' or p.id::text ilike '%' || v_sanitized_search || '%') and
        -- Active status filter
        (p_is_active is null or p.is_active = p_is_active) and
        -- Role filter
        (
          p_role_filter is null or p_role_filter = 'all' or
          (p_role_filter = 'unassigned' and not exists (select 1 from public.user_roles ur where ur.user_id = p.id)) or
          (p_role_filter <> 'unassigned' and exists (select 1 from public.user_roles ur where ur.user_id = p.id and ur.role_code = p_role_filter))
        )
      )
    )
    -- Safety condition 1: Only accounts without any role assigned
    and (
      not p_only_without_roles or not exists (select 1 from public.user_roles ur where ur.user_id = p.id)
    )
    -- Safety condition 2: Require student identity (student_code or student_enrollments)
    and (
      not p_require_student_identity or (
        (p.student_code is not null and p.student_code <> '') or
        exists (select 1 from public.student_enrollments se where se.student_id = p.id)
      )
    );

  select count(*) into v_matched_count from tmp_bulk_target_users;

  -- 5. Perform set-based bulk insert into public.user_roles
  if v_matched_count > 0 then
    with inserted_rows as (
      insert into public.user_roles (
        user_id,
        role_code,
        created_by,
        created_at
      )
      select
        t.id,
        v_sanitized_role,
        v_caller_id,
        now()
      from tmp_bulk_target_users t
      where not exists (
        select 1
        from public.user_roles ur
        where ur.user_id = t.id
          and ur.role_code = v_sanitized_role
      )
      returning user_id
    )
    select count(*) into v_inserted_count from inserted_rows;
  end if;

  v_skipped_count := v_matched_count - v_inserted_count;

  -- 6. Log event in audit table if available
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'user_audit_logs') then
    insert into public.user_audit_logs (
      actor_id,
      action_type,
      context_data
    ) values (
      v_caller_id,
      'CHANGE_ROLES',
      jsonb_build_object(
        'bulk_operation', true,
        'role_code', v_sanitized_role,
        'selection_mode', p_selection_mode,
        'matched_count', v_matched_count,
        'inserted_count', v_inserted_count,
        'skipped_count', v_skipped_count,
        'only_without_roles', p_only_without_roles,
        'require_student_identity', p_require_student_identity
      )
    );
  end if;

  -- 7. Return outcome summary
  return jsonb_build_object(
    'matched_count', v_matched_count,
    'inserted_count', v_inserted_count,
    'skipped_count', v_skipped_count,
    'role_code', v_sanitized_role
  );
end;
$$;

-- Security grant management
revoke execute on function public.bulk_assign_user_role from public, anon;
grant execute on function public.bulk_assign_user_role to authenticated;
