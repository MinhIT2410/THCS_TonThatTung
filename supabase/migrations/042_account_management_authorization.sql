-- 042_account_management_authorization.sql
-- Establishing multi-level account management authorization framework and audit logs

-- Drop old public helper function signatures if they exist to prevent conflicts or overloading
drop function if exists public.can_manage_account_role(uuid, text, uuid, uuid);
drop function if exists public.can_manage_target_user(uuid, uuid);

-- 1. Create account_management_grants table
create table if not exists public.account_management_grants (
  id uuid primary key default gen_random_uuid(),
  grantee_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null check (scope in ('SCHOOL_WIDE', 'CLASS_SPECIFIC')),
  class_id uuid null references public.classes(id) on delete cascade,
  academic_year_id uuid null references public.academic_years(id) on delete cascade,
  granted_by uuid null references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_scope_fields check (
    (scope = 'SCHOOL_WIDE' and class_id is null) or
    (scope = 'CLASS_SPECIFIC' and class_id is not null and academic_year_id is not null)
  )
);

-- Trigger for updated_at in account_management_grants
drop trigger if exists trg_account_management_grants_updated_at on public.account_management_grants;
create trigger trg_account_management_grants_updated_at before update on public.account_management_grants
for each row execute function public.set_updated_at();


-- 2. Create account_management_grant_roles table
create table if not exists public.account_management_grant_roles (
  grant_id uuid not null references public.account_management_grants(id) on delete cascade,
  role_code text not null references public.roles(code) on delete cascade,
  primary key (grant_id, role_code)
);


-- 3. Create user_audit_logs table
create table if not exists public.user_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid null references public.profiles(id) on delete set null,
  target_user_id uuid null references public.profiles(id) on delete set null,
  action_type text not null check (action_type in (
    'CREATE_USER', 'INVITE_USER', 'UPDATE_PROFILE', 'LOCK_ACCOUNT', 
    'UNLOCK_ACCOUNT', 'CHANGE_ROLES', 'RESET_PASSWORD', 
    'ASSIGN_STUDENT_CLASS', 'IMPORT_USER_FAILED'
  )),
  old_data jsonb null,
  new_data jsonb null,
  context_data jsonb null,
  created_at timestamptz not null default now()
);


-- 4. Triggers for protecting grant management and protecting roles assigned
create or replace function public.validate_grant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_operator_id uuid;
  v_is_super_admin boolean;
  v_is_principal boolean;
begin
  v_operator_id := auth.uid();
  if v_operator_id is null then
    raise exception 'Yêu cầu xác thực.' using errcode = '42501';
  end if;

  -- Automatically populate granted_by
  NEW.granted_by := v_operator_id;

  v_is_super_admin := public.has_app_role(v_operator_id, 'SUPER_ADMIN');
  if v_is_super_admin then
    return NEW;
  end if;

  v_is_principal := public.has_app_role(v_operator_id, 'PRINCIPAL');
  if v_is_principal then
    -- PRINCIPAL cannot grant to SUPER_ADMIN or PRINCIPAL
    if public.has_app_role(NEW.grantee_id, 'SUPER_ADMIN') or public.has_app_role(NEW.grantee_id, 'PRINCIPAL') then
      raise exception 'Hiệu trưởng không được phép cấp quyền quản lý tài khoản cho SUPER_ADMIN hoặc PRINCIPAL.' using errcode = '42501';
    end if;
    return NEW;
  end if;

  raise exception 'Bạn không có quyền cấp quyền quản lý tài khoản.' using errcode = '42501';
end;
$$;

drop trigger if exists trg_account_management_grants_validate on public.account_management_grants;
create trigger trg_account_management_grants_validate
  before insert or update on public.account_management_grants
  for each row execute function public.validate_grant();


create or replace function public.validate_grant_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_operator_id uuid;
  v_is_super_admin boolean;
  v_is_principal boolean;
begin
  v_operator_id := auth.uid();
  if v_operator_id is null then
    raise exception 'Yêu cầu xác thực.' using errcode = '42501';
  end if;

  v_is_super_admin := public.has_app_role(v_operator_id, 'SUPER_ADMIN');
  if v_is_super_admin then
    return NEW;
  end if;

  v_is_principal := public.has_app_role(v_operator_id, 'PRINCIPAL');
  if v_is_principal then
    if NEW.role_code in ('SUPER_ADMIN', 'PRINCIPAL') then
      raise exception 'Hiệu trưởng không có quyền cấp quyền quản lý cho vai trò SUPER_ADMIN hoặc PRINCIPAL.' using errcode = '42501';
    end if;
    if NEW.role_code not in ('VICE_PRINCIPAL', 'CONTENT_EDITOR', 'STAFF', 'TEACHER', 'STUDENT') then
      raise exception 'Vai trò không hợp lệ.' using errcode = '42501';
    end if;
    return NEW;
  end if;

  raise exception 'Bạn không có quyền gán quyền quản lý tài khoản.' using errcode = '42501';
end;
$$;

drop trigger if exists trg_account_management_grant_roles_validate on public.account_management_grant_roles;
create trigger trg_account_management_grant_roles_validate
  before insert or update on public.account_management_grant_roles
  for each row execute function public.validate_grant_role();


-- 5. Create public.internal_can_manage_account_role helper function (FOR INTERNAL SECURE USE ONLY)
create or replace function public.internal_can_manage_account_role(
  caller_id uuid,
  requested_role text,
  target_class_id uuid default null,
  target_academic_year_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  is_caller_super_admin boolean;
  is_caller_principal boolean;
  is_caller_vice_principal boolean;
  is_caller_staff boolean;
  is_caller_teacher boolean;
begin
  if caller_id is null then
    return false;
  end if;

  -- 5.1 SUPER_ADMIN check
  is_caller_super_admin := public.has_app_role(caller_id, 'SUPER_ADMIN');
  if is_caller_super_admin then
    return true;
  end if;

  -- 5.2 PRINCIPAL check
  is_caller_principal := public.has_app_role(caller_id, 'PRINCIPAL');
  if is_caller_principal then
    -- PRINCIPAL can manage: VICE_PRINCIPAL, CONTENT_EDITOR, STAFF, TEACHER, STUDENT
    -- Cannot manage: SUPER_ADMIN, PRINCIPAL
    if requested_role in ('VICE_PRINCIPAL', 'CONTENT_EDITOR', 'STAFF', 'TEACHER', 'STUDENT') then
      return true;
    end if;
    return false;
  end if;

  -- 5.3 VICE_PRINCIPAL and STAFF check
  is_caller_vice_principal := public.has_app_role(caller_id, 'VICE_PRINCIPAL');
  is_caller_staff := public.has_app_role(caller_id, 'STAFF');

  if is_caller_vice_principal or is_caller_staff then
    -- Always reject if requested role is SUPER_ADMIN or PRINCIPAL
    if requested_role in ('SUPER_ADMIN', 'PRINCIPAL') then
      return false;
    end if;

    -- Must have an active grant matching the requested_role and context
    return exists (
      select 1 
      from public.account_management_grants g
      join public.account_management_grant_roles gr on g.id = gr.grant_id
      where g.grantee_id = caller_id
        and g.is_active = true
        and (g.expires_at is null or g.expires_at > now())
        and gr.role_code = requested_role
        and (
          -- SCHOOL_WIDE grant
          (g.scope = 'SCHOOL_WIDE' and (g.academic_year_id is null or g.academic_year_id = target_academic_year_id))
          or
          -- CLASS_SPECIFIC grant
          (g.scope = 'CLASS_SPECIFIC' and g.class_id = target_class_id and g.academic_year_id = target_academic_year_id)
        )
    );
  end if;

  -- 5.4 TEACHER check
  is_caller_teacher := public.has_app_role(caller_id, 'TEACHER');
  if is_caller_teacher then
    -- Teachers can only manage the 'STUDENT' role
    if requested_role <> 'STUDENT' then
      return false;
    end if;

    -- GVCN and teachers with grants only active in the CURRENT/ACTIVE academic year
    if target_academic_year_id is null or target_academic_year_id <> public.get_active_academic_year_id() then
      return false;
    end if;

    -- Case 5.4a: Homeroom teacher (GVCN)
    -- Allowed to manage STUDENT in their own class during the active academic year
    if target_class_id is not null then
      if exists (
        select 1 from public.homeroom_assignments
        where teacher_id = caller_id
          and class_id = target_class_id
          and academic_year_id = target_academic_year_id
      ) then
        return true;
      end if;
    end if;

    -- Case 5.4b: Subject teacher (Giáo viên bộ môn)
    -- Allowed to manage STUDENT only if they have teacher_assignments at the target class AND a suitable grant
    if target_class_id is not null then
      if exists (
        select 1 from public.teacher_assignments
        where teacher_id = caller_id
          and class_id = target_class_id
          and academic_year_id = target_academic_year_id
      ) and exists (
        select 1 
        from public.account_management_grants g
        join public.account_management_grant_roles gr on g.id = gr.grant_id
        where g.grantee_id = caller_id
          and g.is_active = true
          and (g.expires_at is null or g.expires_at > now())
          and gr.role_code = 'STUDENT'
          and (
            (g.scope = 'SCHOOL_WIDE' and (g.academic_year_id is null or g.academic_year_id = target_academic_year_id))
            or
            (g.scope = 'CLASS_SPECIFIC' and g.class_id = target_class_id and g.academic_year_id = target_academic_year_id)
          )
      ) then
        return true;
      end if;
    end if;

    return false;
  end if;

  -- CONTENT_EDITOR, STUDENT, or others cannot manage any roles
  return false;
end;
$$;


-- 6. Create public.internal_can_manage_target_user helper function (FOR INTERNAL SECURE USE ONLY)
create or replace function public.internal_can_manage_target_user(
  caller_id uuid,
  target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  is_caller_super_admin boolean;
  is_caller_principal boolean;
  is_caller_vice_principal boolean;
  is_caller_staff boolean;
  is_caller_teacher boolean;
  
  target_roles text[];
  t_role text;
  can_manage_all_roles boolean := true;
begin
  if caller_id is null or target_user_id is null then
    return false;
  end if;

  -- User cannot manage themselves (e.g. self-change role, lock, reset own pwd through administrative RPCs)
  if caller_id = target_user_id then
    return false;
  end if;

  -- 6.1 SUPER_ADMIN check
  is_caller_super_admin := public.has_app_role(caller_id, 'SUPER_ADMIN');
  if is_caller_super_admin then
    return true;
  end if;

  -- Fetch target roles
  select coalesce(array_agg(role_code), '{}'::text[]) into target_roles
  from public.user_roles
  where user_id = target_user_id;

  -- 6.2 PRINCIPAL check
  is_caller_principal := public.has_app_role(caller_id, 'PRINCIPAL');
  if is_caller_principal then
    -- PRINCIPAL cannot manage anyone with SUPER_ADMIN or PRINCIPAL roles
    if 'SUPER_ADMIN' = any(target_roles) or 'PRINCIPAL' = any(target_roles) then
      return false;
    end if;
    return true;
  end if;

  -- For callers other than SUPER_ADMIN and PRINCIPAL, we must verify grants and constraints.
  -- If target user has no roles, they must have at least one enrollment record to be treated as STUDENT.
  -- Otherwise, we return false because they have no roles and no enrollments.
  if array_length(target_roles, 1) is null or array_length(target_roles, 1) = 0 then
    if exists (
      select 1 from public.student_enrollments
      where student_id = target_user_id
    ) then
      target_roles := array['STUDENT']::text[];
    else
      return false;
    end if;
  end if;

  is_caller_vice_principal := public.has_app_role(caller_id, 'VICE_PRINCIPAL');
  is_caller_staff := public.has_app_role(caller_id, 'STAFF');
  is_caller_teacher := public.has_app_role(caller_id, 'TEACHER');

  if is_caller_vice_principal or is_caller_staff then
    -- Caller must have active grants covering all of the target user's roles in context
    foreach t_role in array target_roles loop
      if t_role = 'SUPER_ADMIN' or t_role = 'PRINCIPAL' then
        return false;
      end if;

      if t_role = 'STUDENT' then
        -- Check if student belongs to a class covered by an active grant
        if not exists (
          select 1 
          from public.student_enrollments se
          where se.student_id = target_user_id
            and public.internal_can_manage_account_role(caller_id, 'STUDENT', se.class_id, se.academic_year_id)
        ) and exists (
          -- Fallback: If student has no enrollments yet, check if caller has a SCHOOL_WIDE grant for STUDENT
          select 1 from public.account_management_grants g
          join public.account_management_grant_roles gr on g.id = gr.grant_id
          where g.grantee_id = caller_id
            and g.is_active = true
            and (g.expires_at is null or g.expires_at > now())
            and g.scope = 'SCHOOL_WIDE'
            and gr.role_code = 'STUDENT'
        ) then
          -- Allowed
          null;
        elsif exists (
          select 1 
          from public.student_enrollments se
          where se.student_id = target_user_id
            and public.internal_can_manage_account_role(caller_id, 'STUDENT', se.class_id, se.academic_year_id)
        ) then
          -- Allowed
          null;
        else
          can_manage_all_roles := false;
        end if;
      else
        -- Non-STUDENT roles must be covered by a SCHOOL_WIDE grant
        if not exists (
          select 1 
          from public.account_management_grants g
          join public.account_management_grant_roles gr on g.id = gr.grant_id
          where g.grantee_id = caller_id
            and g.is_active = true
            and (g.expires_at is null or g.expires_at > now())
            and g.scope = 'SCHOOL_WIDE'
            and gr.role_code = t_role
        ) then
          can_manage_all_roles := false;
        end if;
      end if;
    end loop;

    return can_manage_all_roles;
  end if;

  if is_caller_teacher then
    -- Teachers can only manage users who are strictly STUDENTS
    foreach t_role in array target_roles loop
      if t_role <> 'STUDENT' then
        return false;
      end if;
    end loop;

    -- Target STUDENT must be enrolled in at least one class that this teacher is authorized to manage
    return exists (
      select 1 
      from public.student_enrollments se
      where se.student_id = target_user_id
        and public.internal_can_manage_account_role(caller_id, 'STUDENT', se.class_id, se.academic_year_id)
    );
  end if;

  return false;
end;
$$;


-- 7. Create Public secure helpers using auth.uid()
create or replace function public.can_manage_account_role(
  requested_role text,
  target_class_id uuid default null,
  target_academic_year_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.internal_can_manage_account_role(
    auth.uid(),
    requested_role,
    target_class_id,
    target_academic_year_id
  );
end;
$$;


create or replace function public.can_manage_target_user(
  target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.internal_can_manage_target_user(
    auth.uid(),
    target_user_id
  );
end;
$$;


-- 8. Enable Row Level Security (RLS) on all 3 new tables
alter table public.account_management_grants enable row level security;
alter table public.account_management_grant_roles enable row level security;
alter table public.user_audit_logs enable row level security;


-- 9. Define RLS Policies

-- RLS Policies for account_management_grants
drop policy if exists "SUPER_ADMIN full access on grants" on public.account_management_grants;
create policy "SUPER_ADMIN full access on grants" 
  on public.account_management_grants 
  for all 
  using (public.has_app_role(auth.uid(), 'SUPER_ADMIN'));

drop policy if exists "PRINCIPAL manage non-admin grants" on public.account_management_grants;
create policy "PRINCIPAL manage non-admin grants" 
  on public.account_management_grants 
  for all 
  using (
    public.has_app_role(auth.uid(), 'PRINCIPAL') 
    and not public.has_app_role(grantee_id, 'SUPER_ADMIN') 
    and not public.has_app_role(grantee_id, 'PRINCIPAL')
  )
  with check (
    public.has_app_role(auth.uid(), 'PRINCIPAL') 
    and not public.has_app_role(grantee_id, 'SUPER_ADMIN') 
    and not public.has_app_role(grantee_id, 'PRINCIPAL')
  );

drop policy if exists "Grantees can select own grants" on public.account_management_grants;
create policy "Grantees can select own grants" 
  on public.account_management_grants 
  for select 
  using (auth.uid() = grantee_id);


-- RLS Policies for account_management_grant_roles
drop policy if exists "SUPER_ADMIN full access on grant_roles" on public.account_management_grant_roles;
create policy "SUPER_ADMIN full access on grant_roles" 
  on public.account_management_grant_roles 
  for all 
  using (public.has_app_role(auth.uid(), 'SUPER_ADMIN'));

drop policy if exists "PRINCIPAL manage non-admin grant_roles" on public.account_management_grant_roles;
create policy "PRINCIPAL manage non-admin grant_roles" 
  on public.account_management_grant_roles 
  for all 
  using (
    exists (
      select 1 from public.account_management_grants g 
      where g.id = grant_id 
        and public.has_app_role(auth.uid(), 'PRINCIPAL') 
        and not public.has_app_role(g.grantee_id, 'SUPER_ADMIN') 
        and not public.has_app_role(g.grantee_id, 'PRINCIPAL')
    )
  )
  with check (
    exists (
      select 1 from public.account_management_grants g 
      where g.id = grant_id 
        and public.has_app_role(auth.uid(), 'PRINCIPAL') 
        and not public.has_app_role(g.grantee_id, 'SUPER_ADMIN') 
        and not public.has_app_role(g.grantee_id, 'PRINCIPAL')
    )
  );

drop policy if exists "Grantees can select own grant_roles" on public.account_management_grant_roles;
create policy "Grantees can select own grant_roles" 
  on public.account_management_grant_roles 
  for select 
  using (
    exists (
      select 1 from public.account_management_grants g 
      where g.id = grant_id and g.grantee_id = auth.uid()
    )
  );


-- RLS Policies for user_audit_logs
drop policy if exists "SUPER_ADMIN full access on audit logs" on public.user_audit_logs;
create policy "SUPER_ADMIN full access on audit logs" 
  on public.user_audit_logs 
  for select 
  using (public.has_app_role(auth.uid(), 'SUPER_ADMIN'));

drop policy if exists "PRINCIPAL select non-admin audit logs" on public.user_audit_logs;
create policy "PRINCIPAL select non-admin audit logs" 
  on public.user_audit_logs 
  for select 
  using (
    public.has_app_role(auth.uid(), 'PRINCIPAL')
    and (actor_id is null or not public.has_app_role(actor_id, 'SUPER_ADMIN'))
    and (target_user_id is null or not public.has_app_role(target_user_id, 'SUPER_ADMIN'))
  );

drop policy if exists "Actors can select own audit logs" on public.user_audit_logs;
create policy "Actors can select own audit logs" 
  on public.user_audit_logs 
  for select 
  using (auth.uid() = actor_id);


-- 10. Revoke and Grant execution permissions for safety
revoke execute on function public.can_manage_account_role(text, uuid, uuid) from public;
revoke execute on function public.can_manage_account_role(text, uuid, uuid) from anon;
grant execute on function public.can_manage_account_role(text, uuid, uuid) to authenticated;

revoke execute on function public.can_manage_target_user(uuid) from public;
revoke execute on function public.can_manage_target_user(uuid) from anon;
grant execute on function public.can_manage_target_user(uuid) to authenticated;

-- Strictly revoke access on internal functions from public, anon, and authenticated
revoke execute on function public.internal_can_manage_account_role(uuid, text, uuid, uuid) from public;
revoke execute on function public.internal_can_manage_account_role(uuid, text, uuid, uuid) from anon;
revoke execute on function public.internal_can_manage_account_role(uuid, text, uuid, uuid) from authenticated;

revoke execute on function public.internal_can_manage_target_user(uuid, uuid) from public;
revoke execute on function public.internal_can_manage_target_user(uuid, uuid) from anon;
revoke execute on function public.internal_can_manage_target_user(uuid, uuid) from authenticated;
