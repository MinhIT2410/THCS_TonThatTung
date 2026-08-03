-- Migration 061: Supervisor Permissions and Actor Assignments
-- Consolidates Supervisor permissions, actor role validation, actor scope RPCs,
-- incident approval logic, and competition weeks/units RLS.

BEGIN;

-- 1. Add can_record_incident and can_approve_red_star columns to competition_actor_assignments
ALTER TABLE public.competition_actor_assignments
  ADD COLUMN IF NOT EXISTS can_record_incident boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_approve_red_star boolean NOT NULL DEFAULT false;

-- 2. Add CHECK constraints
ALTER TABLE public.competition_actor_assignments
  DROP CONSTRAINT IF EXISTS competition_actor_assignments_supervisor_approve_check;

ALTER TABLE public.competition_actor_assignments
  ADD CONSTRAINT competition_actor_assignments_supervisor_approve_check
  CHECK (can_approve_red_star = false OR assignment_type = 'SUPERVISOR');

ALTER TABLE public.competition_actor_assignments
  DROP CONSTRAINT IF EXISTS competition_actor_assignments_dates_check;

ALTER TABLE public.competition_actor_assignments
  ADD CONSTRAINT competition_actor_assignments_dates_check
  CHECK (end_date IS NULL OR end_date >= start_date);

-- 3. Update check_competition_actor_role trigger function
-- Uses user_roles.user_id and user_roles.role_code directly
CREATE OR REPLACE FUNCTION public.check_competition_actor_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Check user role using public.user_roles (role_code) directly
  IF NEW.assignment_type = 'SUPERVISOR' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = NEW.user_id AND role_code IN ('TEACHER', 'STAFF')
    ) THEN
      RAISE EXCEPTION 'Chỉ người dùng có vai trò Giáo viên (TEACHER) hoặc Nhân viên (STAFF) mới có thể được gán nhiệm vụ Giám thị.' USING errcode = 'P0004';
    END IF;
  ELSIF NEW.assignment_type IN ('LIEN_DOI_COMMAND', 'RED_STAR') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = NEW.user_id AND role_code = 'STUDENT'
    ) THEN
      RAISE EXCEPTION 'Chỉ người dùng có vai trò Học sinh (STUDENT) mới có thể được gán nhiệm vụ Ban chỉ huy Liên đội hoặc Sao đỏ.' USING errcode = 'P0004';
    END IF;
  END IF;

  -- Check class academic year match
  IF NEW.assigned_class_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.classes
      WHERE id = NEW.assigned_class_id AND academic_year_id = NEW.academic_year_id
    ) THEN
      RAISE EXCEPTION 'Lớp được phân công không thuộc năm học đã chọn.' USING errcode = 'P0004';
    END IF;
  END IF;

  -- Check grade level existence
  IF NEW.assigned_grade_level_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.grade_levels
      WHERE id = NEW.assigned_grade_level_id
    ) THEN
      RAISE EXCEPTION 'Khối không tồn tại.' USING errcode = 'P0004';
    END IF;
  END IF;

  -- Check end_date >= start_date
  IF NEW.end_date IS NOT NULL AND NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.' USING errcode = 'P0004';
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Preserve exact signature of get_user_competition_actor_scope(uuid, uuid)
-- RETURNS TABLE (has_access boolean, assignment_type text, is_admin_or_recorder boolean)
CREATE OR REPLACE FUNCTION public.get_user_competition_actor_scope(
  p_user_id uuid,
  p_target_class_id uuid
)
RETURNS TABLE (
  has_access boolean,
  assignment_type text,
  is_admin_or_recorder boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_grade_id uuid;
  v_rec record;
BEGIN
  -- Check if user is competition manager/recorder
  IF public.has_competition_permission(p_user_id, 'COMPETITION_RECORD') OR public.has_competition_permission(p_user_id, 'COMPETITION_MANAGE') THEN
    RETURN QUERY SELECT true, 'ADMIN_OR_RECORDER'::text, true;
    RETURN;
  END IF;

  -- Get grade_level_id for target_class_id if class_id provided
  IF p_target_class_id IS NOT NULL THEN
    SELECT grade_level_id INTO v_target_grade_id
    FROM public.classes
    WHERE id = p_target_class_id;
  END IF;

  -- Check homeroom teacher for target class
  IF p_target_class_id IS NOT NULL AND public.is_homeroom_teacher(p_user_id, p_target_class_id) THEN
    RETURN QUERY SELECT true, 'HOMEROOM_TEACHER'::text, false;
    RETURN;
  END IF;

  -- Check competition_actor_assignments in current active academic year
  FOR v_rec IN
    SELECT ca.assignment_type, ca.assigned_class_id, ca.assigned_grade_level_id
    FROM public.competition_actor_assignments ca
    JOIN public.academic_years ay ON ay.id = ca.academic_year_id
    WHERE ca.user_id = p_user_id
      AND ca.is_active = true
      AND ay.is_current = true
      AND ca.start_date <= CURRENT_DATE
      AND (ca.end_date IS NULL OR ca.end_date >= CURRENT_DATE)
      AND (ca.assignment_type <> 'SUPERVISOR' OR ca.can_record_incident = true)
  LOOP
    -- Entire school scope (both class and grade level are NULL)
    IF v_rec.assigned_class_id IS NULL AND v_rec.assigned_grade_level_id IS NULL THEN
      RETURN QUERY SELECT true, v_rec.assignment_type, false;
      RETURN;
    END IF;

    -- Grade level scope
    IF v_rec.assigned_grade_level_id IS NOT NULL AND v_target_grade_id IS NOT NULL AND v_rec.assigned_grade_level_id = v_target_grade_id THEN
      RETURN QUERY SELECT true, v_rec.assignment_type, false;
      RETURN;
    END IF;

    -- Class scope
    IF v_rec.assigned_class_id IS NOT NULL AND p_target_class_id IS NOT NULL AND v_rec.assigned_class_id = p_target_class_id THEN
      RETURN QUERY SELECT true, v_rec.assignment_type, false;
      RETURN;
    END IF;
  END LOOP;

  RETURN QUERY SELECT false, NULL::text, false;
END;
$$;

-- 5. Recreate get_my_competition_actor_assignments with new columns
DROP FUNCTION IF EXISTS public.get_my_competition_actor_assignments();

CREATE OR REPLACE FUNCTION public.get_my_competition_actor_assignments()
RETURNS TABLE (
  id uuid,
  assignment_type text,
  academic_year_id uuid,
  academic_year_code text,
  academic_year_name text,
  assigned_class_id uuid,
  class_name text,
  assigned_grade_level_id uuid,
  grade_level_code text,
  grade_level_name text,
  is_active boolean,
  start_date date,
  end_date date,
  can_record_incident boolean,
  can_approve_red_star boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.id,
    ca.assignment_type,
    ca.academic_year_id,
    ay.code AS academic_year_code,
    ay.name AS academic_year_name,
    ca.assigned_class_id,
    c.name AS class_name,
    ca.assigned_grade_level_id,
    g.code AS grade_level_code,
    g.name AS grade_level_name,
    ca.is_active,
    ca.start_date,
    ca.end_date,
    ca.can_record_incident,
    ca.can_approve_red_star
  FROM public.competition_actor_assignments ca
  JOIN public.academic_years ay ON ay.id = ca.academic_year_id
  LEFT JOIN public.classes c ON c.id = ca.assigned_class_id
  LEFT JOIN public.grade_levels g ON g.id = ca.assigned_grade_level_id
  WHERE ca.user_id = auth.uid()
    AND ca.is_active = true
    AND ay.is_current = true
    AND ca.start_date <= CURRENT_DATE
    AND (ca.end_date IS NULL OR ca.end_date >= CURRENT_DATE)
  ORDER BY ca.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_competition_actor_assignments() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_competition_actor_assignments() TO authenticated;

-- 6. Update approve_competition_incident RPC according to exact schema & execution order
CREATE OR REPLACE FUNCTION public.approve_competition_incident(p_incident_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_incident record;
  v_is_authorized boolean := false;
  v_rec_assignment record;
  v_sup_assignment record;
  v_rule record;
  v_tx_type text;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Vui lòng đăng nhập để thực hiện.' USING errcode = '42501';
  END IF;

  -- 1. Lock incident FOR UPDATE and join program for academic_year_id
  SELECT ci.*, cp.academic_year_id
  INTO v_incident
  FROM public.competition_incidents ci
  JOIN public.competition_programs cp ON cp.id = ci.program_id
  WHERE ci.id = p_incident_id
  FOR UPDATE;

  IF v_incident IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy sự việc thi đua.' USING errcode = 'P0002';
  END IF;

  -- 2. Status check: must be PENDING
  IF v_incident.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Sự việc không ở trạng thái chờ duyệt (Trạng thái hiện tại: %).', v_incident.status USING errcode = 'P0003';
  END IF;

  -- 3. Prevent self-approval unless SUPER_ADMIN or PRINCIPAL
  IF v_incident.recorded_by = v_caller_id AND NOT (public.has_app_role(v_caller_id, 'SUPER_ADMIN') OR public.has_app_role(v_caller_id, 'PRINCIPAL')) THEN
    RAISE EXCEPTION 'Người ghi nhận không được tự duyệt sự việc của chính mình.' USING errcode = '42501';
  END IF;

  -- 4. Authorization check: System permission OR Supervisor approving RED_STAR in scope
  IF public.has_competition_permission(v_caller_id, 'COMPETITION_APPROVE')
     OR public.has_competition_permission(v_caller_id, 'COMPETITION_MANAGE') THEN
    v_is_authorized := true;
  END IF;

  IF NOT v_is_authorized THEN
    -- Check if recorded_by had active RED_STAR assignment at incident occurred_at covering unit_id
    SELECT ca.*
    INTO v_rec_assignment
    FROM public.competition_actor_assignments ca
    WHERE ca.user_id = v_incident.recorded_by
      AND ca.assignment_type = 'RED_STAR'
      AND ca.academic_year_id = v_incident.academic_year_id
      AND ca.is_active = true
      AND ca.start_date <= (v_incident.occurred_at::date)
      AND (ca.end_date IS NULL OR ca.end_date >= (v_incident.occurred_at::date))
      AND (
        (ca.assigned_class_id IS NULL AND ca.assigned_grade_level_id IS NULL)
        OR (ca.assigned_class_id IS NOT NULL AND ca.assigned_class_id = v_incident.unit_id)
        OR (ca.assigned_grade_level_id IS NOT NULL AND v_incident.unit_id IN (
          SELECT cl.id FROM public.classes cl WHERE cl.grade_level_id = ca.assigned_grade_level_id
        ))
      )
    LIMIT 1;

    IF v_rec_assignment IS NOT NULL THEN
      -- Check if caller has active SUPERVISOR assignment with can_approve_red_star = true
      SELECT ca.*
      INTO v_sup_assignment
      FROM public.competition_actor_assignments ca
      WHERE ca.user_id = v_caller_id
        AND ca.assignment_type = 'SUPERVISOR'
        AND ca.can_approve_red_star = true
        AND ca.academic_year_id = v_incident.academic_year_id
        AND ca.is_active = true
        AND ca.start_date <= (v_incident.occurred_at::date)
        AND (ca.end_date IS NULL OR ca.end_date >= (v_incident.occurred_at::date))
        AND (
          (ca.assigned_class_id IS NULL AND ca.assigned_grade_level_id IS NULL)
          OR (ca.assigned_class_id IS NOT NULL AND ca.assigned_class_id = v_incident.unit_id)
          OR (ca.assigned_grade_level_id IS NOT NULL AND v_incident.unit_id IN (
            SELECT cl.id FROM public.classes cl WHERE cl.grade_level_id = ca.assigned_grade_level_id
          ))
        )
      LIMIT 1;

      IF v_sup_assignment IS NOT NULL THEN
        v_is_authorized := true;
      END IF;
    END IF;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Bạn không có quyền duyệt sự việc thi đua này.' USING errcode = '42501';
  END IF;

  -- 5. Rule check
  SELECT * INTO v_rule
  FROM public.competition_rules
  WHERE id = v_incident.rule_id;

  IF v_rule IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy quy tắc thi đua liên kết.' USING errcode = 'P0002';
  END IF;

  IF NOT v_rule.is_active THEN
    RAISE EXCEPTION 'Quy tắc thi đua này đang tạm khóa.' USING errcode = 'P0003';
  END IF;

  -- 6. Check effect scope
  IF v_rule.effect_scope = 'BOTH' THEN
    IF v_incident.student_id IS NULL OR v_incident.unit_id IS NULL THEN
      RAISE EXCEPTION 'Quy tắc thi đua yêu cầu phải có cả thông tin Đội viên và Chi đội.' USING errcode = 'P0004';
    END IF;
  ELSIF v_rule.effect_scope = 'STUDENT_ONLY' THEN
    IF v_incident.student_id IS NULL THEN
      RAISE EXCEPTION 'Quy tắc thi đua yêu cầu phải chọn Đội viên.' USING errcode = 'P0004';
    END IF;
  ELSIF v_rule.effect_scope = 'UNIT_ONLY' THEN
    IF v_incident.unit_id IS NULL THEN
      RAISE EXCEPTION 'Quy tắc thi đua yêu cầu phải chọn Chi đội.' USING errcode = 'P0004';
    END IF;
  END IF;

  -- 7. Check week lock using check_competition_week_lock
  IF v_rule.effect_scope IN ('UNIT_ONLY', 'BOTH') AND v_rule.unit_points <> 0 THEN
    PERFORM public.check_competition_week_lock(v_incident.program_id, v_incident.occurred_at);
  END IF;

  -- 8. Create point transactions (without program_id column, using exact existing schema)
  IF v_rule.effect_scope IN ('STUDENT_ONLY', 'BOTH') AND v_rule.student_merit_points <> 0 THEN
    v_tx_type := CASE WHEN v_rule.student_merit_points > 0 THEN 'CREDIT' ELSE 'DEBIT' END;
    INSERT INTO public.competition_point_transactions (
      incident_id, student_id, unit_id, ledger_type, points, transaction_type, status, effective_at, created_by
    ) VALUES (
      v_incident.id, v_incident.student_id, v_incident.unit_id, 'STUDENT_MERIT',
      v_rule.student_merit_points, v_tx_type, 'POSTED', v_incident.occurred_at, v_caller_id
    ) ON CONFLICT (incident_id, ledger_type) WHERE (incident_id IS NOT NULL AND transaction_type IN ('CREDIT', 'DEBIT')) DO NOTHING;
  END IF;

  IF v_rule.effect_scope IN ('STUDENT_ONLY', 'BOTH') AND v_rule.student_reward_points <> 0 THEN
    v_tx_type := CASE WHEN v_rule.student_reward_points > 0 THEN 'CREDIT' ELSE 'DEBIT' END;
    INSERT INTO public.competition_point_transactions (
      incident_id, student_id, unit_id, ledger_type, points, transaction_type, status, effective_at, created_by
    ) VALUES (
      v_incident.id, v_incident.student_id, v_incident.unit_id, 'STUDENT_REWARD',
      v_rule.student_reward_points, v_tx_type, 'POSTED', v_incident.occurred_at, v_caller_id
    ) ON CONFLICT (incident_id, ledger_type) WHERE (incident_id IS NOT NULL AND transaction_type IN ('CREDIT', 'DEBIT')) DO NOTHING;
  END IF;

  IF v_rule.effect_scope IN ('UNIT_ONLY', 'BOTH') AND v_rule.unit_points <> 0 THEN
    v_tx_type := CASE WHEN v_rule.unit_points > 0 THEN 'CREDIT' ELSE 'DEBIT' END;
    INSERT INTO public.competition_point_transactions (
      incident_id, student_id, unit_id, ledger_type, points, transaction_type, status, effective_at, created_by
    ) VALUES (
      v_incident.id, v_incident.student_id, v_incident.unit_id, 'UNIT_COMPETITION',
      v_rule.unit_points, v_tx_type, 'POSTED', v_incident.occurred_at, v_caller_id
    ) ON CONFLICT (incident_id, ledger_type) WHERE (incident_id IS NOT NULL AND transaction_type IN ('CREDIT', 'DEBIT')) DO NOTHING;
  END IF;

  -- 9. Update incident status to APPROVED
  UPDATE public.competition_incidents
  SET status = 'APPROVED',
      approved_by = v_caller_id,
      approved_at = now(),
      updated_at = now()
  WHERE id = p_incident_id;

  RETURN jsonb_build_object(
    'success', true,
    'incident_id', p_incident_id,
    'status', 'APPROVED'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_competition_incident(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_competition_incident(uuid) TO authenticated;

-- 7. Update RLS for competition_weeks and competition_week_units
DROP POLICY IF EXISTS "competition_weeks_select" ON public.competition_weeks;

CREATE POLICY "competition_weeks_select" ON public.competition_weeks
  FOR SELECT TO authenticated, anon
  USING (
    status = 'PUBLISHED'
    OR (
      status = 'OPEN' 
      AND auth.uid() IS NOT NULL
      AND (
        public.has_competition_permission(auth.uid(), 'COMPETITION_WEEK_MANAGE')
        OR public.has_competition_permission(auth.uid(), 'COMPETITION_RECORD')
        OR public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE')
        OR public.has_competition_permission(auth.uid(), 'COMPETITION_APPROVE')
        OR EXISTS (
          SELECT 1 FROM public.competition_actor_assignments ca
          WHERE ca.user_id = auth.uid() 
            AND ca.is_active = true
            AND ca.start_date <= CURRENT_DATE
            AND (ca.end_date IS NULL OR ca.end_date >= CURRENT_DATE)
        )
        OR EXISTS (
          SELECT 1 FROM public.homeroom_assignments ha
          WHERE ha.teacher_id = auth.uid() 
            AND ha.is_active = true
        )
      )
    )
    OR (
      status IN ('DRAFT', 'LOCKED', 'ARCHIVED')
      AND auth.uid() IS NOT NULL
      AND (
        public.has_competition_permission(auth.uid(), 'COMPETITION_WEEK_MANAGE')
        OR public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE')
        OR public.has_competition_permission(auth.uid(), 'COMPETITION_APPROVE')
      )
    )
  );

DROP POLICY IF EXISTS "competition_week_units_select" ON public.competition_week_units;

CREATE POLICY "competition_week_units_select" ON public.competition_week_units
  FOR SELECT TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM public.competition_weeks w
      WHERE w.id = competition_week_units.week_id
        AND (
          w.status = 'PUBLISHED'
          OR (
            w.status = 'OPEN' 
            AND auth.uid() IS NOT NULL
            AND (
              public.has_competition_permission(auth.uid(), 'COMPETITION_WEEK_MANAGE')
              OR public.has_competition_permission(auth.uid(), 'COMPETITION_RECORD')
              OR public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE')
              OR public.has_competition_permission(auth.uid(), 'COMPETITION_APPROVE')
              OR EXISTS (
                SELECT 1 FROM public.competition_actor_assignments ca
                WHERE ca.user_id = auth.uid() 
                  AND ca.is_active = true
                  AND ca.start_date <= CURRENT_DATE
                  AND (ca.end_date IS NULL OR ca.end_date >= CURRENT_DATE)
              )
              OR EXISTS (
                SELECT 1 FROM public.homeroom_assignments ha
                WHERE ha.teacher_id = auth.uid() 
                  AND ha.is_active = true
              )
            )
          )
          OR (
            w.status IN ('DRAFT', 'LOCKED', 'ARCHIVED')
            AND auth.uid() IS NOT NULL
            AND (
              public.has_competition_permission(auth.uid(), 'COMPETITION_WEEK_MANAGE')
              OR public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE')
              OR public.has_competition_permission(auth.uid(), 'COMPETITION_APPROVE')
            )
          )
        )
    )
  );

COMMIT;
