BEGIN;

-- ============================================================================
-- Migration 065: Allow users to view profiles related to accessible competition incidents
-- ============================================================================

-- 1. Create helper function: can_view_competition_related_profile
CREATE OR REPLACE FUNCTION public.can_view_competition_related_profile(
  p_user_id uuid,
  p_profile_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_user_id IS NULL OR p_profile_id IS NULL THEN
    RETURN false;
  END IF;

  -- Prevent callers from impersonating another authenticated user when
  -- invoking this SECURITY DEFINER function directly.
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;

  -- Check if p_profile_id is student_id or recorded_by in any competition_incident
  -- that p_user_id is allowed to view via can_view_competition_incident helper
  RETURN EXISTS (
    SELECT 1
    FROM public.competition_incidents ci
    WHERE (ci.student_id = p_profile_id OR ci.recorded_by = p_profile_id)
      AND public.can_view_competition_incident(p_user_id, ci.id) = true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.can_view_competition_related_profile(uuid, uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
public.can_view_competition_related_profile(uuid, uuid)
TO authenticated;

-- 2. Add RLS policy on public.profiles
DROP POLICY IF EXISTS
"Users can read profiles of accessible competition incidents"
ON public.profiles;

CREATE POLICY
"Users can read profiles of accessible competition incidents"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.can_view_competition_related_profile(auth.uid(), id)
  );

COMMIT;
