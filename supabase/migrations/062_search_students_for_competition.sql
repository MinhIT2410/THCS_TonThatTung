-- Migration 062: Search Students for Competition with unaccent and current year enrollment priority

BEGIN;

-- Enable unaccent extension for accent-insensitive search
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Drop function if exists to avoid signature/return type mismatch
DROP FUNCTION IF EXISTS public.search_competition_students(text, integer);

-- Create search_competition_students RPC function
CREATE OR REPLACE FUNCTION public.search_competition_students(
  p_search_term text,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  full_name text,
  student_code text,
  avatar_url text,
  class_id uuid,
  class_name text,
  academic_year_id uuid,
  academic_year_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_search text := nullif(trim(p_search_term), '');
  v_norm_search text;
  v_limit integer := greatest(least(coalesce(p_limit, 20), 50), 1);
BEGIN
  IF v_search IS NULL OR length(v_search) < 2 THEN
    RETURN;
  END IF;

  v_norm_search := '%' || unaccent(lower(v_search)) || '%';

  RETURN QUERY
  WITH current_year AS (
    SELECT ay.id, ay.name
    FROM public.academic_years ay
    WHERE ay.is_current = true
    LIMIT 1
  ),
  matching_students AS (
    SELECT DISTINCT ON (p.id)
      p.id,
      coalesce(p.full_name, 'Chưa đặt tên') AS full_name,
      p.student_code,
      p.avatar_url,
      se.class_id,
      c.name AS class_name,
      cy.id AS academic_year_id,
      cy.name AS academic_year_name
    FROM public.profiles p
    JOIN public.user_roles ur
      ON ur.user_id = p.id
     AND ur.role_code = 'STUDENT'
    JOIN current_year cy ON true
    JOIN public.student_enrollments se
      ON se.student_id = p.id
     AND se.academic_year_id = cy.id
    JOIN public.classes c
      ON c.id = se.class_id
    WHERE coalesce(p.is_active, true) = true
      AND (
        unaccent(lower(coalesce(p.full_name, ''))) LIKE v_norm_search
        OR p.student_code ILIKE '%' || v_search || '%'
      )
    ORDER BY p.id
    LIMIT v_limit * 3
  )
  SELECT
    ms.id,
    ms.full_name,
    ms.student_code,
    ms.avatar_url,
    ms.class_id,
    ms.class_name,
    ms.academic_year_id,
    ms.academic_year_name
  FROM matching_students ms
  ORDER BY
    CASE
      WHEN unaccent(lower(ms.full_name)) = unaccent(lower(v_search)) THEN 1
      WHEN unaccent(lower(ms.full_name)) LIKE unaccent(lower(v_search)) || '%' THEN 2
      ELSE 3
    END,
    ms.full_name ASC
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.search_competition_students(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_competition_students(text, integer) TO authenticated;

COMMIT;
