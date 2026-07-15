-- 037_school_assignments.sql
-- School Assignments & Roles/Relationships without extra system roles.

-- 1. department_memberships table
create table if not exists public.department_memberships (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  is_head boolean not null default false,
  is_deputy boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dept_memberships_unique unique (department_id, teacher_id, academic_year_id),
  constraint dept_memberships_not_both_head_and_deputy check (not (is_head = true and is_deputy = true))
);

-- Unique index to ensure at most one department head per department per year
create unique index if not exists idx_unique_dept_head
on public.department_memberships(department_id, academic_year_id)
where (is_head = true);

-- 2. homeroom_assignments table
create table if not exists public.homeroom_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homeroom_assignments_class_year_unique unique (class_id, academic_year_id)
);

-- 3. teacher_assignments table
create table if not exists public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_assignments_class_subj_year_unique unique (class_id, subject_id, academic_year_id)
);

-- 4. student_enrollments table
create table if not exists public.student_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_enrollments_student_year_unique unique (student_id, academic_year_id)
);

-- 5. parent_student_relations table
create table if not exists public.parent_student_relations (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  relationship_type text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parent_student_relations_parent_student_unique unique (parent_id, student_id)
);

-- Create triggers for updated_at tracking
drop trigger if exists trg_dept_memberships_updated_at on public.department_memberships;
create trigger trg_dept_memberships_updated_at before update on public.department_memberships
for each row execute function public.set_updated_at();

drop trigger if exists trg_homeroom_assignments_updated_at on public.homeroom_assignments;
create trigger trg_homeroom_assignments_updated_at before update on public.homeroom_assignments
for each row execute function public.set_updated_at();

drop trigger if exists trg_teacher_assignments_updated_at on public.teacher_assignments;
create trigger trg_teacher_assignments_updated_at before update on public.teacher_assignments
for each row execute function public.set_updated_at();

drop trigger if exists trg_student_enrollments_updated_at on public.student_enrollments;
create trigger trg_student_enrollments_updated_at before update on public.student_enrollments
for each row execute function public.set_updated_at();

drop trigger if exists trg_parent_student_relations_updated_at on public.parent_student_relations;
create trigger trg_parent_student_relations_updated_at before update on public.parent_student_relations
for each row execute function public.set_updated_at();
