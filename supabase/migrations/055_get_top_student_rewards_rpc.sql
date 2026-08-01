BEGIN;

-- Migration 055: Create RPC to fetch top student rewards for public display
CREATE OR REPLACE FUNCTION public.get_top_student_rewards(p_limit integer DEFAULT 5)
RETURNS TABLE (
  id uuid,
  full_name text,
  unit_name text,
  available_reward_points integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 5), 1), 20);
BEGIN
  RETURN QUERY
  WITH student_posted_rewards AS (
    SELECT 
      t.student_id,
      COALESCE(SUM(t.points), 0)::integer AS posted_points
    FROM public.competition_point_transactions t
    WHERE t.ledger_type = 'STUDENT_REWARD'
      AND t.status = 'POSTED'
      AND t.student_id IS NOT NULL
    GROUP BY t.student_id
  ),
  student_used_rewards AS (
    SELECT 
      r.student_id,
      COALESCE(SUM(r.total_points), 0)::integer AS used_points
    FROM public.reward_redemptions r
    WHERE r.status IN ('PENDING', 'APPROVED')
      AND r.student_id IS NOT NULL
    GROUP BY r.student_id
  ),
  student_active_units AS (
    SELECT DISTINCT ON (e.student_id)
      e.student_id,
      c.name AS class_name
    FROM public.student_enrollments e
    JOIN public.academic_years ay ON ay.id = e.academic_year_id
    JOIN public.classes c ON c.id = e.class_id
    WHERE ay.is_current = true
      AND c.is_active = true
    ORDER BY e.student_id, e.created_at DESC
  )
  SELECT 
    p.id,
    p.full_name,
    u.class_name AS unit_name,
    (COALESCE(pr.posted_points, 0) - COALESCE(ur.used_points, 0))::integer AS available_reward_points
  FROM public.profiles p
  JOIN public.user_roles ur_role ON ur_role.user_id = p.id AND ur_role.role_code = 'STUDENT'
  JOIN student_active_units u ON u.student_id = p.id
  JOIN student_posted_rewards pr ON pr.student_id = p.id
  LEFT JOIN student_used_rewards ur ON ur.student_id = p.id
  WHERE p.is_active = true
    AND (COALESCE(pr.posted_points, 0) - COALESCE(ur.used_points, 0)) > 0
  ORDER BY available_reward_points DESC, p.full_name ASC
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_top_student_rewards(integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_top_student_rewards(integer) TO anon, authenticated;

COMMIT;
