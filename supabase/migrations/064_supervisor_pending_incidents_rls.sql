BEGIN;

-- ============================================================================
-- Migration 064: Allow SUPERVISOR actors to view pending competition incidents
-- and evidence based on rule's allowed_approver_types and assignment scope
-- ============================================================================

-- 1. Create helper function: can_view_competition_incident
CREATE OR REPLACE FUNCTION public.can_view_competition_incident(
  p_user_id uuid,
  p_incident_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_incident record;
  v_rule record;
  v_has_sup_assignment boolean;
BEGIN
  IF p_user_id IS NULL OR p_incident_id IS NULL THEN
    RETURN false;
  END IF;

  -- 1. Check global competition permissions: COMPETITION_RECORD, COMPETITION_APPROVE, COMPETITION_MANAGE
  IF public.has_competition_permission(p_user_id, 'COMPETITION_RECORD')
     OR public.has_competition_permission(p_user_id, 'COMPETITION_APPROVE')
     OR public.has_competition_permission(p_user_id, 'COMPETITION_MANAGE') THEN
    RETURN true;
  END IF;

  -- Load incident with program academic_year_id
  SELECT ci.*, cp.academic_year_id
  INTO v_incident
  FROM public.competition_incidents ci
  JOIN public.competition_programs cp ON cp.id = ci.program_id
  WHERE ci.id = p_incident_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- 2. Student or recorder can view their own incident
  IF v_incident.student_id = p_user_id OR v_incident.recorded_by = p_user_id THEN
    RETURN true;
  END IF;

  -- 3. SUPERVISOR approval permission for PENDING incidents
  IF v_incident.status <> 'PENDING' THEN
    RETURN false;
  END IF;

  -- Load linked rule
  SELECT * INTO v_rule
  FROM public.competition_rules
  WHERE id = v_incident.rule_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Rule must allow 'SUPERVISOR' as approver
  IF NOT (
    'SUPERVISOR' = ANY(
      COALESCE(v_rule.allowed_approver_types, ARRAY[]::text[])
    )
  ) THEN
    RETURN false;
  END IF;

  -- Check SUPERVISOR assignment in actor assignments
  SELECT EXISTS (
    SELECT 1
    FROM public.competition_actor_assignments ca
    WHERE ca.user_id = p_user_id
      AND ca.assignment_type = 'SUPERVISOR'
      AND ca.can_approve_red_star = true
      AND ca.is_active = true
      AND (ca.academic_year_id IS NOT DISTINCT FROM v_incident.academic_year_id)
      AND ca.start_date <= (v_incident.occurred_at::date)
      AND (ca.end_date IS NULL OR ca.end_date >= (v_incident.occurred_at::date))
      AND (
        (ca.assigned_class_id IS NULL AND ca.assigned_grade_level_id IS NULL)
        OR (v_incident.unit_id IS NOT NULL AND ca.assigned_class_id IS NOT NULL AND ca.assigned_class_id = v_incident.unit_id)
        OR (v_incident.unit_id IS NOT NULL AND ca.assigned_grade_level_id IS NOT NULL AND v_incident.unit_id IN (
          SELECT cl.id FROM public.classes cl WHERE cl.grade_level_id = ca.assigned_grade_level_id
        ))
      )
  ) INTO v_has_sup_assignment;

  RETURN COALESCE(v_has_sup_assignment, false);
END;
$$;

REVOKE ALL ON FUNCTION public.can_view_competition_incident(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_competition_incident(uuid, uuid) TO authenticated;

-- 2. Re-create RLS policy: competition_incidents_select
DROP POLICY IF EXISTS "competition_incidents_select" ON public.competition_incidents;

CREATE POLICY "competition_incidents_select" ON public.competition_incidents
  FOR SELECT TO authenticated
  USING (
    public.can_view_competition_incident(auth.uid(), id)
  );

-- 3. Re-create RLS policy: competition_incident_evidence_select
DROP POLICY IF EXISTS "competition_incident_evidence_select" ON public.competition_incident_evidence;

CREATE POLICY "competition_incident_evidence_select" ON public.competition_incident_evidence
  FOR SELECT TO authenticated
  USING (
    public.can_view_competition_incident(auth.uid(), incident_id)
  );

COMMIT;
