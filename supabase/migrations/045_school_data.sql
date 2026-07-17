-- 045_school_data.sql
-- Migration to support full school data configuration

-- 1. Create school_information table
create table if not exists public.school_information (
  id uuid primary key default gen_random_uuid(),
  is_singleton boolean not null default true constraint school_info_singleton_check check (is_singleton = true),
  school_name text not null,
  short_name text null,
  school_code text null,
  education_level text null,
  school_type text null,
  managing_authority text null,
  address text null,
  province text null,
  district text null,
  ward text null,
  postal_code text null,
  phone text null,
  email text null,
  website text null,
  logo_url text null,
  principal_name text null,
  established_year integer null,
  short_description text null,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  default_language text not null default 'vi',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_info_singleton_unique unique (is_singleton)
);

-- Note: We DO NOT seed any demo data for school_information here as requested to avoid dummy production data.

-- 2. Expand academic_years table
alter table public.academic_years add column if not exists code text;
alter table public.academic_years add column if not exists is_current boolean not null default false;
alter table public.academic_years add column if not exists notes text;

-- Update academic_years code safely to ensure no duplicates before creating unique constraint
update public.academic_years set code = lower(replace(name, ' ', '-')) where code is null;

-- Ensure code unique and dates validation
alter table public.academic_years drop constraint if exists academic_years_code_key;
alter table public.academic_years add constraint academic_years_code_key unique (code);

alter table public.academic_years drop constraint if exists academic_years_dates_check;
alter table public.academic_years add constraint academic_years_dates_check check (start_date < end_date);

-- Drop old active uniqueness because multiple academic years can have is_active = true
drop index if exists public.idx_academic_years_active_unique;

-- Guarantee exactly one is_current = true
create unique index if not exists idx_academic_years_current_unique
on public.academic_years(is_current)
where (is_current = true);

-- 3. Create academic_terms table
create table if not exists public.academic_terms (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  code text not null,
  name text not null,
  term_order integer not null,
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  is_active boolean not null default true,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_terms_year_code_unique unique (academic_year_id, code),
  constraint academic_terms_year_order_unique unique (academic_year_id, term_order),
  constraint academic_terms_dates_check check (start_date < end_date)
);

-- Guarantee at most one current term per academic year
create unique index if not exists idx_academic_terms_current_unique
on public.academic_terms(academic_year_id)
where (is_current = true);

-- 6. Validate academic_terms within academic_years dates
create or replace function public.validate_academic_term_dates()
returns trigger
language plpgsql
security definer
as $$
declare
  v_year_start date;
  v_year_end date;
begin
  select start_date, end_date into v_year_start, v_year_end
  from public.academic_years
  where id = NEW.academic_year_id;

  if v_year_start is null or v_year_end is null then
    raise exception 'Năm học liên kết không tồn tại.' using errcode = 'P0002';
  end if;

  if NEW.start_date >= NEW.end_date then
    raise exception 'Thời gian học kỳ phải nằm trong thời gian của năm học.' using errcode = '22000';
  end if;

  if NEW.start_date < v_year_start or NEW.end_date > v_year_end then
    raise exception 'Thời gian học kỳ phải nằm trong thời gian của năm học.' using errcode = '22000';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_validate_academic_term_dates on public.academic_terms;
create trigger trg_validate_academic_term_dates
before insert or update on public.academic_terms
for each row execute function public.validate_academic_term_dates();

-- 4. Create grade_levels table
create table if not exists public.grade_levels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  level_number integer null,
  display_order integer null,
  is_active boolean not null default true,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed standard grade levels
insert into public.grade_levels (id, code, name, level_number, display_order)
values 
  ('66666666-6666-6666-6666-666666666666', 'K6', 'Khối 6', 6, 1),
  ('77777777-7777-7777-7777-777777777777', 'K7', 'Khối 7', 7, 2),
  ('88888888-8888-8888-8888-888888888888', 'K8', 'Khối 8', 8, 3),
  ('99999999-9999-9999-9999-999999999999', 'K9', 'Khối 9', 9, 4)
on conflict (code) do nothing;

-- 5. Create classrooms table
create table if not exists public.classrooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  room_type text null,
  building text null,
  floor text null,
  capacity integer null,
  status text not null default 'ACTIVE' constraint classrooms_status_check check (status in ('ACTIVE', 'LOCKED', 'MAINTENANCE', 'INACTIVE')),
  equipment text null,
  notes text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Expand classes table
alter table public.classes add column if not exists code text;
alter table public.classes add column if not exists grade_level_id uuid references public.grade_levels(id) on delete set null;
alter table public.classes add column if not exists academic_year_id uuid references public.academic_years(id) on delete cascade;
alter table public.classes add column if not exists expected_capacity integer null;
alter table public.classes add column if not exists primary_classroom_id uuid references public.classrooms(id) on delete set null;
alter table public.classes add column if not exists is_active boolean not null default true;
alter table public.classes add column if not exists notes text null;

-- Handle class name uniqueness within each academic year rather than system-wide
alter table public.classes drop constraint if exists classes_name_key;
alter table public.classes drop constraint if exists classes_name_uniq;

-- Enforce unique constraints within each academic year
create unique index if not exists idx_classes_academic_year_name_unique
on public.classes (academic_year_id, name)
where academic_year_id is not null;

create unique index if not exists idx_classes_academic_year_code_unique
on public.classes (academic_year_id, code)
where academic_year_id is not null and code is not null;

-- 7. Expand departments table
alter table public.departments add column if not exists code text;
alter table public.departments add column if not exists department_type text null;
alter table public.departments add column if not exists is_active boolean not null default true;
alter table public.departments add column if not exists display_order integer default 0;
alter table public.departments add column if not exists notes text null;

-- Update departments code safely before unique constraint
update public.departments set code = lower(replace(name, ' ', '-')) where code is null;

alter table public.departments drop constraint if exists departments_code_key;
alter table public.departments add constraint departments_code_key unique (code);

-- 8. Expand subjects table
alter table public.subjects add column if not exists short_name text null;
alter table public.subjects add column if not exists subject_group text null;
alter table public.subjects add column if not exists department_id uuid references public.departments(id) on delete set null;
alter table public.subjects add column if not exists standard_periods_per_week integer default 0;
alter table public.subjects add column if not exists timetable_color text null;
alter table public.subjects add column if not exists is_active boolean not null default true;
alter table public.subjects add column if not exists notes text null;

-- 9. Create subject_grade_levels table
create table if not exists public.subject_grade_levels (
  subject_id uuid not null references public.subjects(id) on delete cascade,
  grade_level_id uuid not null references public.grade_levels(id) on delete cascade,
  periods_per_week integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (subject_id, grade_level_id)
);

-- 10. Expand homeroom_assignments table
alter table public.homeroom_assignments add column if not exists start_date date null;
alter table public.homeroom_assignments add column if not exists end_date date null;
alter table public.homeroom_assignments add column if not exists is_active boolean not null default true;
alter table public.homeroom_assignments add column if not exists notes text null;

-- Drop obsolete global constraints on class & year for homeroom teachers
alter table public.homeroom_assignments drop constraint if exists homeroom_assignments_class_year_unique;

-- Support full assignment history, only ensuring 1 active homeroom teacher per class & year
create unique index if not exists idx_homeroom_assignments_active_unique
on public.homeroom_assignments (class_id, academic_year_id)
where is_active = true;

-- 11. Expand teacher_assignments table
alter table public.teacher_assignments add column if not exists academic_term_id uuid references public.academic_terms(id) on delete cascade;
alter table public.teacher_assignments add column if not exists periods_per_week integer default 0;
alter table public.teacher_assignments add column if not exists start_date date null;
alter table public.teacher_assignments add column if not exists end_date date null;
alter table public.teacher_assignments add column if not exists is_active boolean not null default true;
alter table public.teacher_assignments add column if not exists notes text null;

-- Drop overly restrictive unique constraint that blocked multiple terms/teacher changes
alter table public.teacher_assignments drop constraint if exists teacher_assignments_class_subj_year_unique;

-- Make a flexible index ensuring no duplicate active teaching workload assignments
create unique index if not exists idx_teacher_assignments_active_unique
on public.teacher_assignments (class_id, subject_id, academic_year_id, academic_term_id, teacher_id)
where is_active = true;

-- 12. Create updated_at triggers for new tables
drop trigger if exists trg_school_information_updated_at on public.school_information;
create trigger trg_school_information_updated_at before update on public.school_information
for each row execute function public.set_updated_at();

drop trigger if exists trg_academic_terms_updated_at on public.academic_terms;
create trigger trg_academic_terms_updated_at before update on public.academic_terms
for each row execute function public.set_updated_at();

drop trigger if exists trg_grade_levels_updated_at on public.grade_levels;
create trigger trg_grade_levels_updated_at before update on public.grade_levels
for each row execute function public.set_updated_at();

drop trigger if exists trg_classrooms_updated_at on public.classrooms;
create trigger trg_classrooms_updated_at before update on public.classrooms
for each row execute function public.set_updated_at();

-- 13. Enable RLS on new tables
alter table public.school_information enable row level security;
alter table public.academic_terms enable row level security;
alter table public.grade_levels enable row level security;
alter table public.classrooms enable row level security;
alter table public.subject_grade_levels enable row level security;

-- Drop and recreate precise policies for old expanded and new tables to guarantee correct access
-- 13.1 school_information
drop policy if exists "All authenticated users can read school info" on public.school_information;
drop policy if exists "Admins and principals can manage school info" on public.school_information;

create policy "All authenticated users can read school info"
on public.school_information for select to authenticated using (true);

create policy "Admins and principals can manage school info"
on public.school_information for all to authenticated
using (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']))
with check (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']));

-- 13.2 academic_terms
drop policy if exists "All authenticated users can read academic terms" on public.academic_terms;
drop policy if exists "Admins and principals can manage academic terms" on public.academic_terms;

create policy "All authenticated users can read academic terms"
on public.academic_terms for select to authenticated using (true);

create policy "Admins and principals can manage academic terms"
on public.academic_terms for all to authenticated
using (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']))
with check (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']));

-- 13.3 grade_levels
drop policy if exists "All authenticated users can read grade levels" on public.grade_levels;
drop policy if exists "Admins and principals can manage grade levels" on public.grade_levels;

create policy "All authenticated users can read grade levels"
on public.grade_levels for select to authenticated using (true);

create policy "Admins and principals can manage grade levels"
on public.grade_levels for all to authenticated
using (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']))
with check (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']));

-- 13.4 classrooms
drop policy if exists "All authenticated users can read classrooms" on public.classrooms;
drop policy if exists "Admins and principals can manage classrooms" on public.classrooms;

create policy "All authenticated users can read classrooms"
on public.classrooms for select to authenticated using (true);

create policy "Admins and principals can manage classrooms"
on public.classrooms for all to authenticated
using (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']))
with check (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']));

-- 13.5 subject_grade_levels
drop policy if exists "All authenticated users can read subject grade levels" on public.subject_grade_levels;
drop policy if exists "Admins and principals can manage subject grade levels" on public.subject_grade_levels;

create policy "All authenticated users can read subject grade levels"
on public.subject_grade_levels for select to authenticated using (true);

create policy "Admins and principals can manage subject grade levels"
on public.subject_grade_levels for all to authenticated
using (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']))
with check (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']));

-- 13.6 academic_years
drop policy if exists "All authenticated users can read academic years" on public.academic_years;
drop policy if exists "Admins and principals can manage academic years" on public.academic_years;

create policy "All authenticated users can read academic years"
on public.academic_years for select to authenticated using (true);

create policy "Admins and principals can manage academic years"
on public.academic_years for all to authenticated
using (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']))
with check (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']));

-- 13.7 classes
drop policy if exists "All authenticated users can read classes" on public.classes;
drop policy if exists "Select classes for authorized school roles" on public.classes;

create policy "All authenticated users can read classes"
on public.classes for select to authenticated using (true);

drop policy if exists "Admins and principals can manage classes" on public.classes;
create policy "Admins and principals can manage classes"
on public.classes for all to authenticated
using (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']))
with check (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']));

-- 13.8 departments
drop policy if exists "All authenticated users can read departments" on public.departments;
drop policy if exists "Select departments for authorized school staff" on public.departments;

create policy "All authenticated users can read departments"
on public.departments for select to authenticated using (true);

drop policy if exists "Admins and principals can manage departments" on public.departments;
create policy "Admins and principals can manage departments"
on public.departments for all to authenticated
using (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']))
with check (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']));

-- 13.9 subjects
drop policy if exists "All authenticated users can read subjects" on public.subjects;
drop policy if exists "Admins and principals can manage subjects" on public.subjects;

create policy "All authenticated users can read subjects"
on public.subjects for select to authenticated using (true);

create policy "Admins and principals can manage subjects"
on public.subjects for all to authenticated
using (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']))
with check (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']));

-- 13.10 homeroom_assignments
drop policy if exists "All authenticated users can read homeroom assignments" on public.homeroom_assignments;
drop policy if exists "Select homeroom assignments for school staff and teachers" on public.homeroom_assignments;

create policy "All authenticated users can read homeroom assignments"
on public.homeroom_assignments for select to authenticated using (true);

drop policy if exists "Admins and principals can manage homeroom assignments" on public.homeroom_assignments;
create policy "Admins and principals can manage homeroom assignments"
on public.homeroom_assignments for all to authenticated
using (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']))
with check (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']));

-- 13.11 teacher_assignments
drop policy if exists "All authenticated users can read teacher assignments" on public.teacher_assignments;
drop policy if exists "Select teacher assignments for school staff and teachers" on public.teacher_assignments;

create policy "All authenticated users can read teacher assignments"
on public.teacher_assignments for select to authenticated using (true);

drop policy if exists "Admins and principals can manage teacher assignments" on public.teacher_assignments;
create policy "Admins and principals can manage teacher assignments"
on public.teacher_assignments for all to authenticated
using (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']))
with check (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL']));


-- 14. Create helper RPC functions
-- Set current academic year function
create or replace function public.set_current_academic_year(target_year_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_exists boolean;
begin
  -- Check permission
  v_caller_id := auth.uid();
  if v_caller_id is null or not public.has_any_app_role(v_caller_id, array['SUPER_ADMIN', 'PRINCIPAL']) then
    raise exception 'Quyền truy cập bị từ chối. Chỉ SUPER_ADMIN hoặc PRINCIPAL mới có quyền thực hiện.' using errcode = '42501';
  end if;

  -- Check if target_year_id exists
  select exists(select 1 from public.academic_years where id = target_year_id) into v_exists;
  if not v_exists then
    raise exception 'Không tìm thấy năm học được chọn (NOT_FOUND).' using errcode = 'P0002';
  end if;

  -- Remove current status of all other years
  update public.academic_years
  set is_current = false
  where id <> target_year_id;

  -- Set target year as current and active
  update public.academic_years
  set is_current = true, is_active = true
  where id = target_year_id;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Cập nhật không thành công.');
  end if;

  return jsonb_build_object('success', true);
end;
$$;

revoke execute on function public.set_current_academic_year(uuid) from public, anon;
grant execute on function public.set_current_academic_year(uuid) to authenticated;

-- Set current academic term function
create or replace function public.set_current_academic_term(target_term_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_year_id uuid;
  v_exists boolean;
begin
  -- Check permission
  v_caller_id := auth.uid();
  if v_caller_id is null or not public.has_any_app_role(v_caller_id, array['SUPER_ADMIN', 'PRINCIPAL']) then
    raise exception 'Quyền truy cập bị từ chối. Chỉ SUPER_ADMIN hoặc PRINCIPAL mới có quyền thực hiện.' using errcode = '42501';
  end if;

  -- Check if target_term_id exists
  select exists(select 1 from public.academic_terms where id = target_term_id) into v_exists;
  if not v_exists then
    raise exception 'Không tìm thấy học kỳ được chọn (NOT_FOUND).' using errcode = 'P0002';
  end if;

  -- Get year id of target term
  select academic_year_id into v_year_id from public.academic_terms where id = target_term_id;

  -- Reset is_current for terms in this year
  update public.academic_terms
  set is_current = false
  where academic_year_id = v_year_id and id <> target_term_id;

  -- Set target term as current and active
  update public.academic_terms
  set is_current = true, is_active = true
  where id = target_term_id;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Cập nhật không thành công.');
  end if;

  return jsonb_build_object('success', true);
end;
$$;

revoke execute on function public.set_current_academic_term(uuid) from public, anon;
grant execute on function public.set_current_academic_term(uuid) to authenticated;

-- Assign homeroom teacher function
create or replace function public.assign_homeroom_teacher(
  p_class_id uuid,
  p_teacher_id uuid,
  p_academic_year_id uuid,
  p_start_date date,
  p_end_date date,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
begin
  -- Check permission
  v_caller_id := auth.uid();
  if v_caller_id is null or not public.has_any_app_role(v_caller_id, array['SUPER_ADMIN', 'PRINCIPAL']) then
    raise exception 'Quyền truy cập bị từ chối. Chỉ SUPER_ADMIN hoặc PRINCIPAL mới có quyền thực hiện.' using errcode = '42501';
  end if;

  -- Ensure p_start_date defaults to current_date if null
  p_start_date := coalesce(p_start_date, current_date);

  -- Validate start_date vs end_date
  if p_end_date is not null and p_end_date < p_start_date then
    raise exception 'Ngày kết thúc không được trước ngày bắt đầu.' using errcode = '22000';
  end if;

  -- Deactivate previous assignment for this class & year without deleting history
  update public.homeroom_assignments
  set is_active = false,
      end_date = p_start_date
  where class_id = p_class_id 
    and academic_year_id = p_academic_year_id 
    and is_active = true;

  -- Insert new assignment
  insert into public.homeroom_assignments (
    teacher_id,
    class_id,
    academic_year_id,
    start_date,
    end_date,
    is_active,
    notes
  ) values (
    p_teacher_id,
    p_class_id,
    p_academic_year_id,
    p_start_date,
    p_end_date,
    true,
    p_notes
  );

  return jsonb_build_object('success', true);
end;
$$;

revoke execute on function public.assign_homeroom_teacher(uuid, uuid, uuid, date, date, text) from public, anon;
grant execute on function public.assign_homeroom_teacher(uuid, uuid, uuid, date, date, text) to authenticated;

-- Safe delete function
create or replace function public.safe_delete_school_entity(p_entity_type text, p_entity_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_count integer;
begin
  -- Check caller permission
  v_caller_id := auth.uid();
  if v_caller_id is null or not public.has_any_app_role(v_caller_id, array['SUPER_ADMIN', 'PRINCIPAL']) then
    return jsonb_build_object('success', false, 'error_code', 'UNAUTHORIZED', 'message', 'Quyền truy cập bị từ chối.');
  end if;

  if p_entity_type = 'academic_year' then
    -- Check academic_terms
    select count(*) into v_count from public.academic_terms where academic_year_id = p_entity_id;
    if v_count > 0 then
      return jsonb_build_object('success', false, 'error_code', 'HAS_TERMS', 'message', 'Không thể xóa năm học này vì đang có học kỳ liên kết.');
    end if;

    -- Check classes
    select count(*) into v_count from public.classes where academic_year_id = p_entity_id;
    if v_count > 0 then
      return jsonb_build_object('success', false, 'error_code', 'HAS_CLASSES', 'message', 'Không thể xóa năm học này vì đang có lớp học liên kết.');
    end if;

    -- Check student enrollments
    select count(*) into v_count from public.student_enrollments where academic_year_id = p_entity_id;
    if v_count > 0 then
      return jsonb_build_object('success', false, 'error_code', 'HAS_ENROLLMENTS', 'message', 'Không thể xóa năm học này vì đang có học sinh nhập học.');
    end if;

    -- Delete
    delete from public.academic_years where id = p_entity_id;
    return jsonb_build_object('success', true);

  elsif p_entity_type = 'academic_term' then
    -- Check teacher_assignments
    select count(*) into v_count from public.teacher_assignments where academic_term_id = p_entity_id;
    if v_count > 0 then
      return jsonb_build_object('success', false, 'error_code', 'HAS_ASSIGNMENTS', 'message', 'Không thể xóa học kỳ này vì có phân công giảng dạy.');
    end if;

    delete from public.academic_terms where id = p_entity_id;
    return jsonb_build_object('success', true);

  elsif p_entity_type = 'class' then
    -- Check student_enrollments
    select count(*) into v_count from public.student_enrollments where class_id = p_entity_id;
    if v_count > 0 then
      return jsonb_build_object('success', false, 'error_code', 'HAS_ENROLLMENTS', 'message', 'Không thể xóa lớp học vì đang có học sinh phân vào lớp này.');
    end if;

    -- Check homeroom_assignments
    select count(*) into v_count from public.homeroom_assignments where class_id = p_entity_id;
    if v_count > 0 then
      return jsonb_build_object('success', false, 'error_code', 'HAS_HOMEROOM', 'message', 'Không thể xóa lớp học vì đã có lịch sử phân công giáo viên chủ nhiệm.');
    end if;

    -- Check teacher_assignments
    select count(*) into v_count from public.teacher_assignments where class_id = p_entity_id;
    if v_count > 0 then
      return jsonb_build_object('success', false, 'error_code', 'HAS_TEACHING_ASSIGNMENTS', 'message', 'Không thể xóa lớp học vì đã có phân công giảng dạy.');
    end if;

    delete from public.classes where id = p_entity_id;
    return jsonb_build_object('success', true);

  elsif p_entity_type = 'department' then
    -- Check department_memberships
    select count(*) into v_count from public.department_memberships where department_id = p_entity_id;
    if v_count > 0 then
      return jsonb_build_object('success', false, 'error_code', 'HAS_MEMBERS', 'message', 'Không thể xóa tổ chuyên môn vì đang có giáo viên tham gia.');
    end if;

    -- Check subjects
    select count(*) into v_count from public.subjects where department_id = p_entity_id;
    if v_count > 0 then
      return jsonb_build_object('success', false, 'error_code', 'HAS_SUBJECTS', 'message', 'Không thể xóa tổ chuyên môn vì đang có môn học trực thuộc.');
    end if;

    delete from public.departments where id = p_entity_id;
    return jsonb_build_object('success', true);

  elsif p_entity_type = 'subject' then
    -- Check teacher_assignments
    select count(*) into v_count from public.teacher_assignments where subject_id = p_entity_id;
    if v_count > 0 then
      return jsonb_build_object('success', false, 'error_code', 'HAS_ASSIGNMENTS', 'message', 'Không thể xóa môn học vì đang có giáo viên được phân công giảng dạy.');
    end if;

    delete from public.subjects where id = p_entity_id;
    return jsonb_build_object('success', true);

  elsif p_entity_type = 'classroom' then
    -- Check classes (as primary_classroom_id)
    select count(*) into v_count from public.classes where primary_classroom_id = p_entity_id;
    if v_count > 0 then
      return jsonb_build_object('success', false, 'error_code', 'HAS_CLASSES', 'message', 'Không thể xóa phòng học này vì đang là phòng học chính của lớp.');
    end if;

    delete from public.classrooms where id = p_entity_id;
    return jsonb_build_object('success', true);

  else
    return jsonb_build_object('success', false, 'error_code', 'INVALID_TYPE', 'message', 'Loại thực thể không hợp lệ.');
  end if;
end;
$$;

revoke execute on function public.safe_delete_school_entity(text, uuid) from public, anon;
grant execute on function public.safe_delete_school_entity(text, uuid) to authenticated;
