-- 036_rbac_core.sql
-- Core RBAC tables and Academic Metadata.

-- 1. roles table
create table if not exists public.roles (
  code text primary key,
  name text not null,
  description text null,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed roles
insert into public.roles (code, name, description, is_system) values
  ('SUPER_ADMIN', 'Quản trị viên cấp cao', 'Toàn quyền cấu hình và quản lý hệ thống', true),
  ('PRINCIPAL', 'Hiệu trưởng', 'Quản lý toàn trường và phân công chuyên môn', true),
  ('VICE_PRINCIPAL', 'Hiệu phó', 'Hỗ trợ quản lý toàn trường và chỉ đạo nghiệp vụ', true),
  ('CONTENT_EDITOR', 'Biên tập viên nội dung', 'Quản lý bài viết, tin tức, tài liệu và CMS', true),
  ('STAFF', 'Nhân viên hành chính', 'Thực hiện các công việc hành chính văn phòng', true),
  ('TEACHER', 'Giáo viên', 'Thực hiện giảng dạy và các công việc chuyên môn được phân công', true),
  ('STUDENT', 'Học sinh', 'Tra cứu thông tin học tập của cá nhân', true),
  ('PARENT', 'Phụ huynh', 'Tra cứu thông tin học tập của học sinh được liên kết', true),
  ('VIEWER', 'Người xem', 'Tài khoản mặc định khi mới đăng ký, chỉ xem thông tin công khai', true)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  is_system = excluded.is_system,
  updated_at = now();

-- 2. user_roles table
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_code text not null references public.roles(code) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid null references public.profiles(id) on delete set null,
  constraint user_roles_user_id_role_code_key unique (user_id, role_code)
);

-- 3. academic_years table
create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create unique index to guarantee at most one active academic year at any given time
create unique index if not exists idx_academic_years_active_unique
on public.academic_years(is_active)
where (is_active = true);

-- 4. departments table
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. classes table
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  grade_level integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. subjects table
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create triggers for updated_at tracking
drop trigger if exists trg_roles_updated_at on public.roles;
create trigger trg_roles_updated_at before update on public.roles
for each row execute function public.set_updated_at();

drop trigger if exists trg_academic_years_updated_at on public.academic_years;
create trigger trg_academic_years_updated_at before update on public.academic_years
for each row execute function public.set_updated_at();

drop trigger if exists trg_departments_updated_at on public.departments;
create trigger trg_departments_updated_at before update on public.departments
for each row execute function public.set_updated_at();

drop trigger if exists trg_classes_updated_at on public.classes;
create trigger trg_classes_updated_at before update on public.classes
for each row execute function public.set_updated_at();

drop trigger if exists trg_subjects_updated_at on public.subjects;
create trigger trg_subjects_updated_at before update on public.subjects
for each row execute function public.set_updated_at();
