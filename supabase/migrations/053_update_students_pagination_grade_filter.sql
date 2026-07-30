BEGIN;

-- 053_update_students_pagination_grade_filter.sql
-- Add p_grade_level_id filter parameter to get_students_with_enrollment RPC

drop function if exists public.get_students_with_enrollment(uuid, uuid, text, boolean, boolean, integer, integer);
drop function if exists public.get_students_with_enrollment(uuid, uuid, text, boolean, boolean, integer, integer, uuid);

create or replace function public.get_students_with_enrollment(
  p_academic_year_id uuid,
  p_class_id uuid default null,
  p_search text default null,
  p_is_active boolean default null,
  p_unassigned_only boolean default false,
  p_page integer default 1,
  p_page_size integer default 50,
  p_grade_level_id uuid default null
)
returns table (
  student_id uuid,
  full_name text,
  student_code text,
  is_active boolean,
  academic_year_id uuid,
  academic_year_name text,
  class_id uuid,
  class_name text,
  total_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid := auth.uid();
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := case 
    when p_page_size in (25, 50, 100) then p_page_size 
    else 50 
  end;
  v_offset integer;
  v_search text := nullif(trim(p_search), '');
begin
  if v_caller_id is null then
    raise exception 'Yêu cầu đăng nhập để thực hiện thao tác này.' using errcode = '42501';
  end if;

  if not (
    public.has_app_role(v_caller_id, 'SUPER_ADMIN') or
    public.has_app_role(v_caller_id, 'PRINCIPAL') or
    public.has_app_role(v_caller_id, 'VICE_PRINCIPAL') or
    public.can_manage_account_role('STUDENT', p_class_id, p_academic_year_id)
  ) then
    raise exception 'Bạn không có quyền truy cập danh sách học sinh.' using errcode = '42501';
  end if;

  v_offset := (v_page - 1) * v_page_size;

  return query
  with student_list as (
    select distinct on (p.id)
      p.id as student_id,
      coalesce(p.full_name, 'Chưa đặt tên') as full_name,
      p.student_code,
      coalesce(p.is_active, true) as is_active,
      se.academic_year_id,
      ay.name as academic_year_name,
      se.class_id,
      c.name as class_name
    from public.profiles p
    join public.user_roles ur
      on ur.user_id = p.id
     and ur.role_code = 'STUDENT'
    left join public.student_enrollments se
      on se.student_id = p.id
     and (p_academic_year_id is null or se.academic_year_id = p_academic_year_id)
    left join public.classes c
      on c.id = se.class_id
    left join public.academic_years ay
      on ay.id = p_academic_year_id
    where
      (v_search is null or (
        p.full_name ilike '%' || v_search || '%' or
        p.student_code ilike '%' || v_search || '%'
      ))
      and (p_grade_level_id is null or c.grade_level_id = p_grade_level_id)
      and (p_class_id is null or se.class_id = p_class_id)
      and (p_is_active is null or p.is_active = p_is_active)
      and (
        p_unassigned_only = false or
        se.class_id is null
      )
    order by p.id, c.name nulls last, p.full_name
  ),
  counted as (
    select 
      sl.*,
      count(*) over() as total_count
    from student_list sl
  )
  select 
    c_res.student_id,
    c_res.full_name,
    c_res.student_code,
    c_res.is_active,
    c_res.academic_year_id,
    c_res.academic_year_name,
    c_res.class_id,
    c_res.class_name,
    c_res.total_count
  from counted c_res
  order by 
    c_res.class_name nulls last,
    c_res.full_name,
    c_res.student_id
  limit v_page_size
  offset v_offset;
end;
$$;

revoke all on function public.get_students_with_enrollment(uuid, uuid, text, boolean, boolean, integer, integer, uuid) from public;
grant execute on function public.get_students_with_enrollment(uuid, uuid, text, boolean, boolean, integer, integer, uuid) to authenticated;

COMMIT;
