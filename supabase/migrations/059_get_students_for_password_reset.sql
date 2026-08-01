BEGIN;

-- 059_get_students_for_password_reset.sql
-- RPC for paginated student retrieval for password handover / bulk reset

CREATE OR REPLACE FUNCTION public.get_students_for_password_reset(
  p_academic_year_id uuid,
  p_grade_level_id uuid DEFAULT NULL,
  p_class_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 50
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  student_code text,
  email text,
  class_id uuid,
  class_name text,
  grade_level_id uuid,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := case
    when p_page_size between 1 and 100 then p_page_size
    else 50
  end;
  v_offset integer;
  v_search text := nullif(trim(p_search), '');
  v_is_admin boolean := false;
  v_is_gvcn boolean := false;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Yêu cầu đăng nhập để thực hiện thao tác này.' USING errcode = '42501';
  END IF;

  -- 1. Check if caller is SUPER_ADMIN or PRINCIPAL
  v_is_admin := public.has_app_role(v_caller_id, 'SUPER_ADMIN') OR
                public.has_app_role(v_caller_id, 'PRINCIPAL');

  -- 2. Check if caller is GVCN in the target academic year
  IF NOT v_is_admin THEN
    SELECT exists (
      SELECT 1 FROM public.homeroom_assignments
      WHERE teacher_id = v_caller_id
        AND academic_year_id = p_academic_year_id
        AND coalesce(is_active, true) = true
        AND (start_date IS NULL OR start_date <= CURRENT_DATE)
        AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    ) INTO v_is_gvcn;

    IF NOT v_is_gvcn THEN
      RAISE EXCEPTION 'Bạn không có quyền truy cập danh sách học sinh để đặt lại mật khẩu.' USING errcode = '42501';
    END IF;
  END IF;

  v_offset := (v_page - 1) * v_page_size;

  RETURN QUERY
  WITH student_list AS (
    SELECT DISTINCT ON (p.id)
      p.id AS user_id,
      coalesce(p.full_name, 'Chưa đặt tên')::text AS full_name,
      p.student_code::text AS student_code,
      au.email::text AS email,
      se.class_id AS class_id,
      c.name::text AS class_name,
      c.grade_level_id AS grade_level_id
    FROM public.profiles p
    JOIN public.user_roles ur
      ON ur.user_id = p.id
     AND ur.role_code = 'STUDENT'
    JOIN public.student_enrollments se
      ON se.student_id = p.id
     AND se.academic_year_id = p_academic_year_id
    JOIN public.classes c
      ON c.id = se.class_id
    LEFT JOIN auth.users au
      ON au.id = p.id
    WHERE
      (p_grade_level_id IS NULL OR c.grade_level_id = p_grade_level_id)
      AND (p_class_id IS NULL OR se.class_id = p_class_id)
      AND (v_search IS NULL OR (
        p.full_name ILIKE '%' || v_search || '%' OR
        p.student_code ILIKE '%' || v_search || '%' OR
        au.email ILIKE '%' || v_search || '%'
      ))
      -- GVCN restriction: only active classes assigned to the GVCN
      AND (
        v_is_admin OR se.class_id IN (
          SELECT ha.class_id
          FROM public.homeroom_assignments ha
          WHERE ha.teacher_id = v_caller_id
            AND ha.academic_year_id = p_academic_year_id
            AND coalesce(ha.is_active, true) = true
            AND (ha.start_date IS NULL OR ha.start_date <= CURRENT_DATE)
            AND (ha.end_date IS NULL OR ha.end_date >= CURRENT_DATE)
        )
      )
    ORDER BY p.id, c.name, p.full_name
  ),
  counted AS (
    SELECT
      sl.user_id,
      sl.full_name,
      sl.student_code,
      sl.email,
      sl.class_id,
      sl.class_name,
      sl.grade_level_id,
      count(*) OVER()::bigint AS total_count
    FROM student_list sl
  )
  SELECT
    c_res.user_id::uuid,
    c_res.full_name::text,
    c_res.student_code::text,
    c_res.email::text,
    c_res.class_id::uuid,
    c_res.class_name::text,
    c_res.grade_level_id::uuid,
    c_res.total_count::bigint
  FROM counted c_res
  ORDER BY
    c_res.class_name NULLS LAST,
    c_res.full_name,
    c_res.user_id
  LIMIT v_page_size
  OFFSET v_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.get_students_for_password_reset(uuid, uuid, uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_students_for_password_reset(uuid, uuid, uuid, text, integer, integer) TO authenticated;

COMMIT;
