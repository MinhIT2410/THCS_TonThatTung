-- 038_rbac_security_and_migration.sql
-- Role migration, security functions, RLS policies, triggers and admin protections.

-- =========================================================
-- 1. MIGRATE EXISTING ROLES
-- =========================================================

-- Map existing profiles.role values to public.user_roles
insert into public.user_roles (user_id, role_code)
select id,
       case
         when role = 'admin' then 'SUPER_ADMIN'
         when role = 'editor' then 'CONTENT_EDITOR'
         when role = 'teacher' then 'TEACHER'
         else 'VIEWER'
       end as role_code
from public.profiles
on conflict (user_id, role_code) do nothing;


-- =========================================================
-- 2. SYSTEM ROLE HELPER FUNCTIONS
-- =========================================================

create or replace function public.has_app_role(
  p_user_id uuid,
  p_role_code text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = p_user_id
      and p.is_active = true
      and ur.role_code = p_role_code
  )
$$;

create or replace function public.has_any_app_role(
  p_user_id uuid,
  p_role_codes text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = p_user_id
      and p.is_active = true
      and ur.role_code = any(p_role_codes)
  )
$$;


-- =========================================================
-- 3. SCOPED ASSIGNMENT HELPER FUNCTIONS
-- =========================================================

-- Helper to get active academic year ID
create or replace function public.get_active_academic_year_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.academic_years where is_active = true limit 1
$$;

create or replace function public.is_department_head(
  p_user_id uuid,
  p_department_id uuid default null,
  p_academic_year_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_year_id uuid := coalesce(p_academic_year_id, public.get_active_academic_year_id());
begin
  return exists (
    select 1
    from public.department_memberships dm
    join public.profiles p on p.id = dm.teacher_id
    where dm.teacher_id = p_user_id
      and p.is_active = true
      and dm.is_head = true
      and dm.academic_year_id = v_year_id
      and (p_department_id is null or dm.department_id = p_department_id)
  );
end;
$$;

create or replace function public.is_department_deputy(
  p_user_id uuid,
  p_department_id uuid default null,
  p_academic_year_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_year_id uuid := coalesce(p_academic_year_id, public.get_active_academic_year_id());
begin
  return exists (
    select 1
    from public.department_memberships dm
    join public.profiles p on p.id = dm.teacher_id
    where dm.teacher_id = p_user_id
      and p.is_active = true
      and dm.is_deputy = true
      and dm.academic_year_id = v_year_id
      and (p_department_id is null or dm.department_id = p_department_id)
  );
end;
$$;

create or replace function public.is_homeroom_teacher(
  p_user_id uuid,
  p_class_id uuid default null,
  p_academic_year_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_year_id uuid := coalesce(p_academic_year_id, public.get_active_academic_year_id());
begin
  return exists (
    select 1
    from public.homeroom_assignments ha
    join public.profiles p on p.id = ha.teacher_id
    where ha.teacher_id = p_user_id
      and p.is_active = true
      and ha.academic_year_id = v_year_id
      and (p_class_id is null or ha.class_id = p_class_id)
  );
end;
$$;

create or replace function public.is_subject_teacher(
  p_user_id uuid,
  p_class_id uuid default null,
  p_subject_id uuid default null,
  p_academic_year_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_year_id uuid := coalesce(p_academic_year_id, public.get_active_academic_year_id());
begin
  return exists (
    select 1
    from public.teacher_assignments ta
    join public.profiles p on p.id = ta.teacher_id
    where ta.teacher_id = p_user_id
      and p.is_active = true
      and ta.academic_year_id = v_year_id
      and (p_class_id is null or ta.class_id = p_class_id)
      and (p_subject_id is null or ta.subject_id = p_subject_id)
  );
end;
$$;


-- =========================================================
-- 4. BACKWARD COMPATIBILITY HELPERS
-- =========================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_role(auth.uid(), 'SUPER_ADMIN')
$$;

create or replace function public.is_admin_or_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'CONTENT_EDITOR'])
$$;


-- =========================================================
-- 5. NEW USER AUTOCREATION TRIGGER
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1. Create default profile
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    'viewer'
  )
  on conflict (id) do nothing;

  -- 2. Assign default VIEWER role in user_roles
  insert into public.user_roles (user_id, role_code)
  values (new.id, 'VIEWER')
  on conflict (user_id, role_code) do nothing;

  return new;
end;
$$;


-- =========================================================
-- 6. DOUBLE-PROTECTION SECURITY TRIGGERS (ADMIN & SUPER_ADMIN)
-- =========================================================

-- Protect user_roles table (super admin safeguard)
create or replace function public.check_user_roles_protection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_super_admin_count integer;
begin
  if TG_OP = 'DELETE' and old.role_code = 'SUPER_ADMIN' then
    -- Self-removal prevention
    if old.user_id = auth.uid() then
      raise exception 'Bạn không thể tự hạ quyền SUPER_ADMIN của chính mình.';
    end if;

    -- Last active SUPER_ADMIN check
    perform pg_advisory_xact_lock(482025992);

    select count(*)
    into active_super_admin_count
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.role_code = 'SUPER_ADMIN'
      and p.is_active = true
      and ur.user_id <> old.user_id;

    if active_super_admin_count = 0 then
      raise exception 'Hệ thống phải duy trì ít nhất một tài khoản Quản trị viên cấp cao (SUPER_ADMIN) đang hoạt động.';
    end if;
  end if;

  if TG_OP = 'UPDATE' and old.role_code = 'SUPER_ADMIN' and new.role_code <> 'SUPER_ADMIN' then
    -- Self-removal prevention
    if old.user_id = auth.uid() then
      raise exception 'Bạn không thể tự hạ quyền SUPER_ADMIN của chính mình.';
    end if;

    -- Last active SUPER_ADMIN check
    perform pg_advisory_xact_lock(482025992);

    select count(*)
    into active_super_admin_count
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.role_code = 'SUPER_ADMIN'
      and p.is_active = true
      and ur.user_id <> old.user_id;

    if active_super_admin_count = 0 then
      raise exception 'Hệ thống phải duy trì ít nhất một tài khoản Quản trị viên cấp cao (SUPER_ADMIN) đang hoạt động.';
    end if;
  end if;

  if TG_OP = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;

drop trigger if exists trg_protect_user_roles on public.user_roles;
create trigger trg_protect_user_roles
before update or delete on public.user_roles
for each row
execute function public.check_user_roles_protection();

-- Protect profiles table (admin safeguard)
create or replace function public.check_admin_protection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_admin_count integer;
  active_super_admin_count integer;
begin
  -- Self-deactivation prevention
  if auth.uid() = new.id and old.is_active = true and new.is_active = false then
    raise exception 'Bạn không thể tự khóa tài khoản của chính mình.';
  end if;

  -- Self-demotion prevention on legacy role
  if auth.uid() = new.id and old.role = 'admin' and new.role <> 'admin' then
    raise exception 'Bạn không thể tự hạ quyền Admin của chính mình.';
  end if;

  -- Last active Admin and SUPER_ADMIN check
  if (old.is_active = true) and (new.is_active = false) then
    perform pg_advisory_xact_lock(482025992);

    -- Check active SUPER_ADMIN count if deactivating a SUPER_ADMIN
    if exists (
      select 1 from public.user_roles
      where user_id = new.id and role_code = 'SUPER_ADMIN'
    ) then
      select count(*)
      into active_super_admin_count
      from public.user_roles ur
      join public.profiles p on p.id = ur.user_id
      where ur.role_code = 'SUPER_ADMIN'
        and p.is_active = true
        and p.id <> new.id;

      if active_super_admin_count = 0 then
        raise exception 'Hệ thống phải duy trì ít nhất một tài khoản Quản trị viên cấp cao (SUPER_ADMIN) đang hoạt động.';
      end if;
    end if;

    -- Legacy admin protection
    if old.role = 'admin' then
      select count(*)
      into active_admin_count
      from public.profiles
      where role = 'admin' and is_active = true and id <> new.id;

      if active_admin_count = 0 then
        raise exception 'Hệ thống phải duy trì ít nhất một tài khoản Quản trị viên (Admin) đang hoạt động.';
      end if;
    end if;
  end if;

  -- Downgrading admin role check
  if old.role = 'admin' and new.role <> 'admin' and old.is_active = true then
    perform pg_advisory_xact_lock(482025992);

    select count(*)
    into active_admin_count
    from public.profiles
    where role = 'admin' and is_active = true and id <> new.id;

    if active_admin_count = 0 then
      raise exception 'Hệ thống phải duy trì ít nhất một tài khoản Quản trị viên (Admin) đang hoạt động.';
    end if;
  end if;

  return new;
end;
$$;


-- =========================================================
-- 7. ENABLE RLS FOR ALL NEW TABLES
-- =========================================================

alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.academic_years enable row level security;
alter table public.departments enable row level security;
alter table public.classes enable row level security;
alter table public.subjects enable row level security;
alter table public.department_memberships enable row level security;
alter table public.homeroom_assignments enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.student_enrollments enable row level security;
alter table public.parent_student_relations enable row level security;


-- =========================================================
-- 8. POLICIES ON NEW TABLES
-- =========================================================

-- 1. roles
drop policy if exists "All authenticated users can read roles" on public.roles;
create policy "All authenticated users can read roles"
on public.roles for select to authenticated using (true);

drop policy if exists "Super admins can manage roles" on public.roles;
create policy "Super admins can manage roles"
on public.roles for all to authenticated
using (public.has_app_role(auth.uid(), 'SUPER_ADMIN'))
with check (public.has_app_role(auth.uid(), 'SUPER_ADMIN'));

-- 2. user_roles
drop policy if exists "All authenticated users can read user_roles" on public.user_roles;
drop policy if exists "Users can view their own roles or super admins can view all" on public.user_roles;
create policy "Users can view their own roles or super admins can view all"
on public.user_roles for select to authenticated
using (
  auth.uid() = user_id
  or public.has_app_role(auth.uid(), 'SUPER_ADMIN')
);

drop policy if exists "Super admins can manage user_roles" on public.user_roles;
create policy "Super admins can manage user_roles"
on public.user_roles for all to authenticated
using (public.has_app_role(auth.uid(), 'SUPER_ADMIN'))
with check (public.has_app_role(auth.uid(), 'SUPER_ADMIN'));

-- 3. academic_years
drop policy if exists "All authenticated users can read academic years" on public.academic_years;
create policy "All authenticated users can read academic years"
on public.academic_years for select to authenticated using (true);

drop policy if exists "Admins and principals can manage academic years" on public.academic_years;
create policy "Admins and principals can manage academic years"
on public.academic_years for all to authenticated
using (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']))
with check (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']));

-- 4. departments
drop policy if exists "All authenticated users can read departments" on public.departments;
drop policy if exists "Select departments for authorized school staff" on public.departments;
create policy "Select departments for authorized school staff"
on public.departments for select to authenticated
using (
  public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'STAFF', 'TEACHER'])
);

drop policy if exists "Admins and principals can manage departments" on public.departments;
create policy "Admins and principals can manage departments"
on public.departments for all to authenticated
using (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']))
with check (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']));

-- 5. classes
drop policy if exists "All authenticated users can read classes" on public.classes;
drop policy if exists "Select classes for authorized school roles" on public.classes;
create policy "Select classes for authorized school roles"
on public.classes for select to authenticated
using (
  public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'STAFF', 'TEACHER', 'STUDENT', 'PARENT'])
);

drop policy if exists "Admins and principals can manage classes" on public.classes;
create policy "Admins and principals can manage classes"
on public.classes for all to authenticated
using (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']))
with check (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']));

-- 6. subjects
drop policy if exists "All authenticated users can read subjects" on public.subjects;
create policy "All authenticated users can read subjects"
on public.subjects for select to authenticated using (true);

drop policy if exists "Admins and principals can manage subjects" on public.subjects;
create policy "Admins and principals can manage subjects"
on public.subjects for all to authenticated
using (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']))
with check (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']));

-- 7. department_memberships
drop policy if exists "All authenticated users can read department memberships" on public.department_memberships;
drop policy if exists "Select department memberships for school staff and teachers" on public.department_memberships;
create policy "Select department memberships for school staff and teachers"
on public.department_memberships for select to authenticated
using (
  public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'STAFF', 'TEACHER'])
);

drop policy if exists "Admins and principals can manage department memberships" on public.department_memberships;
create policy "Admins and principals can manage department memberships"
on public.department_memberships for all to authenticated
using (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']))
with check (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']));

-- 8. homeroom_assignments
drop policy if exists "All authenticated users can read homeroom assignments" on public.homeroom_assignments;
drop policy if exists "Select homeroom assignments for school staff and teachers" on public.homeroom_assignments;
create policy "Select homeroom assignments for school staff and teachers"
on public.homeroom_assignments for select to authenticated
using (
  public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'STAFF', 'TEACHER'])
);

drop policy if exists "Admins and principals can manage homeroom assignments" on public.homeroom_assignments;
create policy "Admins and principals can manage homeroom assignments"
on public.homeroom_assignments for all to authenticated
using (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']))
with check (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']));

-- 9. teacher_assignments
drop policy if exists "All authenticated users can read teacher assignments" on public.teacher_assignments;
drop policy if exists "Select teacher assignments for school staff and teachers" on public.teacher_assignments;
create policy "Select teacher assignments for school staff and teachers"
on public.teacher_assignments for select to authenticated
using (
  public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'STAFF', 'TEACHER'])
);

drop policy if exists "Admins and principals can manage teacher assignments" on public.teacher_assignments;
create policy "Admins and principals can manage teacher assignments"
on public.teacher_assignments for all to authenticated
using (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']))
with check (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']));

-- 10. student_enrollments
drop policy if exists "All authenticated users can read student enrollments" on public.student_enrollments;
drop policy if exists "Select student enrollments based on roles and relations" on public.student_enrollments;
create policy "Select student enrollments based on roles and relations"
on public.student_enrollments for select to authenticated
using (
  public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'STAFF'])
  or (
    public.has_app_role(auth.uid(), 'TEACHER')
    and (
      public.is_homeroom_teacher(auth.uid(), class_id)
      or public.is_subject_teacher(auth.uid(), class_id)
    )
  )
  or student_id = auth.uid()
  or student_id in (
    select student_id
    from public.parent_student_relations
    where parent_id = auth.uid()
  )
);

drop policy if exists "Admins and principals can manage student enrollments" on public.student_enrollments;
create policy "Admins and principals can manage student enrollments"
on public.student_enrollments for all to authenticated
using (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']))
with check (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']));

-- 11. parent_student_relations
drop policy if exists "Authorized users can read parent_student_relations" on public.parent_student_relations;
create policy "Authorized users can read parent_student_relations"
on public.parent_student_relations for select to authenticated
using (
  public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'STAFF', 'TEACHER'])
  or auth.uid() = parent_id
  or auth.uid() = student_id
);

drop policy if exists "Admins and principals can manage parent_student_relations" on public.parent_student_relations;
create policy "Admins and principals can manage parent_student_relations"
on public.parent_student_relations for all to authenticated
using (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']))
with check (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']));
