-- Migration 063: Add allowed_recorder_types and allowed_approver_types to competition_rules and update RPCs
BEGIN;

ALTER TABLE public.competition_rules
ADD COLUMN IF NOT EXISTS allowed_recorder_types text[] NOT NULL DEFAULT '{"ADMIN","SUPERVISOR","RED_STAR"}'::text[],
ADD COLUMN IF NOT EXISTS allowed_approver_types text[] NOT NULL DEFAULT '{"ADMIN"}'::text[];

-- Add check constraints to enforce valid actor types
ALTER TABLE public.competition_rules
DROP CONSTRAINT IF EXISTS check_competition_rules_allowed_recorder_types;

ALTER TABLE public.competition_rules
ADD CONSTRAINT check_competition_rules_allowed_recorder_types
CHECK (allowed_recorder_types <@ ARRAY['ADMIN', 'SUPERVISOR', 'RED_STAR']::text[]);

ALTER TABLE public.competition_rules
DROP CONSTRAINT IF EXISTS check_competition_rules_allowed_approver_types;

ALTER TABLE public.competition_rules
ADD CONSTRAINT check_competition_rules_allowed_approver_types
CHECK (allowed_approver_types <@ ARRAY['ADMIN', 'SUPERVISOR']::text[]);

-- Backfill legacy data:
-- 1. If requires_approval is false, set allowed_approver_types = ARRAY[]::text[]
UPDATE public.competition_rules
SET allowed_approver_types = '{}'::text[]
WHERE requires_approval = false;

-- 2. If requires_approval is true, set allowed_approver_types = ARRAY['ADMIN'] if empty
UPDATE public.competition_rules
SET allowed_approver_types = '{"ADMIN"}'::text[]
WHERE requires_approval = true AND (allowed_approver_types IS NULL OR cardinality(allowed_approver_types) = 0);

-- 3. Default allowed_recorder_types if empty
UPDATE public.competition_rules
SET allowed_recorder_types = '{"ADMIN","SUPERVISOR","RED_STAR"}'::text[]
WHERE allowed_recorder_types IS NULL OR cardinality(allowed_recorder_types) = 0;


-- ============================================================================
-- 1. RPC: create_competition_incident
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_competition_incident(
  p_program_id uuid,
  p_rule_id uuid,
  p_student_id uuid default null,
  p_unit_id uuid default null,
  p_occurred_at timestamptz default now(),
  p_title text default null,
  p_description text default null,
  p_evidence_note text default null,
  p_evidence_items jsonb default '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_rule record;
  v_unit_id uuid := p_unit_id;
  v_real_unit_id uuid := null;
  v_unit_info jsonb;
  v_incident_id uuid;
  v_status text;
  v_title text := trim(p_title);
  v_item jsonb;
  v_occurred_at timestamptz := coalesce(p_occurred_at, now());
  v_has_access boolean := false;
  v_raw_actor_type text := null;
  v_actor_type text := null;
  v_is_full_recorder boolean := false;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập.' USING errcode = '42501';
  END IF;

  -- Verify real current class of student if p_student_id is provided
  IF p_student_id IS NOT NULL THEN
    v_unit_info := public.get_student_current_unit(p_student_id);
    IF (v_unit_info->>'has_unit')::boolean = true THEN
      v_real_unit_id := (v_unit_info->>'class_id')::uuid;
    END IF;

    IF p_unit_id IS NULL THEN
      v_unit_id := v_real_unit_id;
    ELSE
      IF v_real_unit_id IS NULL OR p_unit_id <> v_real_unit_id THEN
        RAISE EXCEPTION 'Chi đội được gửi lên không khớp với lớp hiện tại của Đội viên.' USING errcode = 'P0004';
      END IF;
      v_unit_id := p_unit_id;
    END IF;
  END IF;

  -- Check caller authorization & scope
  SELECT scope.has_access, scope.assignment_type, scope.is_admin_or_recorder
  INTO v_has_access, v_raw_actor_type, v_is_full_recorder
  FROM public.get_user_competition_actor_scope(v_caller_id, v_unit_id) scope;

  IF NOT COALESCE(v_has_access, false) THEN
    RAISE EXCEPTION 'Quyền truy cập bị từ chối hoặc ngoài phạm vi phân công được giao.' USING errcode = '42501';
  END IF;

  -- Determine caller actor_type
  IF v_is_full_recorder OR v_raw_actor_type = 'ADMIN_OR_RECORDER'
     OR public.has_competition_permission(v_caller_id, 'COMPETITION_RECORD')
     OR public.has_competition_permission(v_caller_id, 'COMPETITION_MANAGE') THEN
    v_actor_type := 'ADMIN';
  ELSIF v_raw_actor_type = 'SUPERVISOR' THEN
    v_actor_type := 'SUPERVISOR';
  ELSIF v_raw_actor_type = 'RED_STAR' THEN
    v_actor_type := 'RED_STAR';
  ELSE
    v_actor_type := NULL;
  END IF;

  -- Fetch rule
  SELECT * INTO v_rule
  FROM public.competition_rules
  WHERE id = p_rule_id AND program_id = p_program_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quy tắc thi đua không tồn tại hoặc không thuộc chương trình được chọn.' USING errcode = 'P0002';
  END IF;

  IF NOT v_rule.is_active THEN
    RAISE EXCEPTION 'Quy tắc thi đua này đang tạm khóa.' USING errcode = 'P0003';
  END IF;

  -- Check allowed_recorder_types
  IF v_actor_type IS NULL OR NOT (v_actor_type = ANY(COALESCE(v_rule.allowed_recorder_types, ARRAY['ADMIN', 'SUPERVISOR', 'RED_STAR']::text[]))) THEN
    RAISE EXCEPTION 'Bạn không được phép ghi nhận quy tắc thi đua này.' USING errcode = '42501';
  END IF;

  -- Enforce requires_evidence validation
  IF v_rule.requires_evidence THEN
    IF p_evidence_items IS NULL OR jsonb_typeof(p_evidence_items) <> 'array' OR jsonb_array_length(p_evidence_items) = 0 THEN
      RAISE EXCEPTION 'Quy tắc này yêu cầu phải có minh chứng.' USING errcode = 'P0004';
    END IF;

    DECLARE
      v_valid_evidence_found boolean := false;
      v_type text;
      v_file_url text;
      v_ext_url text;
    BEGIN
      FOR v_item IN SELECT * FROM jsonb_array_elements(p_evidence_items)
      LOOP
        v_type := COALESCE(v_item->>'evidence_type', 'IMAGE');
        v_file_url := trim(COALESCE(v_item->>'file_url', ''));
        v_ext_url := trim(COALESCE(v_item->>'external_url', ''));

        IF v_type = 'IMAGE' AND v_file_url <> '' THEN
          v_valid_evidence_found := true;
        ELSIF v_type IN ('INTERNAL_LINK', 'EXTERNAL_LINK') AND (v_file_url <> '' OR v_ext_url <> '') THEN
          v_valid_evidence_found := true;
        END IF;
      END LOOP;

      IF NOT v_valid_evidence_found THEN
        RAISE EXCEPTION 'Quy tắc này yêu cầu phải có minh chứng.' USING errcode = 'P0004';
      END IF;
    END;
  END IF;

  -- Validate scope requirements
  IF v_rule.effect_scope = 'BOTH' THEN
    IF p_student_id IS NULL THEN
      RAISE EXCEPTION 'Quy tắc này yêu cầu phải chọn Đội viên.' USING errcode = 'P0004';
    END IF;
    IF v_unit_id IS NULL THEN
      RAISE EXCEPTION 'Đội viên chưa được phân vào chi đội.' USING errcode = 'P0004';
    END IF;
  ELSIF v_rule.effect_scope = 'STUDENT_ONLY' THEN
    IF p_student_id IS NULL THEN
      RAISE EXCEPTION 'Quy tắc này yêu cầu phải chọn Đội viên.' USING errcode = 'P0004';
    END IF;
  ELSIF v_rule.effect_scope = 'UNIT_ONLY' THEN
    IF v_unit_id IS NULL THEN
      RAISE EXCEPTION 'Quy tắc này yêu cầu phải xác định Chi đội.' USING errcode = 'P0004';
    END IF;
  END IF;

  -- Enforce daily_limit validation
  IF v_rule.daily_limit IS NOT NULL AND v_rule.daily_limit > 0 THEN
    DECLARE
      v_existing_count integer := 0;
      v_occurred_date date := v_occurred_at::date;
    BEGIN
      IF v_rule.effect_scope IN ('STUDENT_ONLY', 'BOTH') AND p_student_id IS NOT NULL THEN
        SELECT count(*) INTO v_existing_count
        FROM public.competition_incidents
        WHERE rule_id = v_rule.id
          AND student_id = p_student_id
          AND status NOT IN ('REJECTED', 'CANCELLED')
          AND occurred_at::date = v_occurred_date;
      ELSIF v_rule.effect_scope = 'UNIT_ONLY' AND v_unit_id IS NOT NULL THEN
        SELECT count(*) INTO v_existing_count
        FROM public.competition_incidents
        WHERE rule_id = v_rule.id
          AND unit_id = v_unit_id
          AND status NOT IN ('REJECTED', 'CANCELLED')
          AND occurred_at::date = v_occurred_date;
      ELSE
        SELECT count(*) INTO v_existing_count
        FROM public.competition_incidents
        WHERE rule_id = v_rule.id
          AND (
            (p_student_id IS NOT NULL AND student_id = p_student_id) OR
            (v_unit_id IS NOT NULL AND unit_id = v_unit_id)
          )
          AND status NOT IN ('REJECTED', 'CANCELLED')
          AND occurred_at::date = v_occurred_date;
      END IF;

      IF v_existing_count >= v_rule.daily_limit THEN
        RAISE EXCEPTION 'Đã đạt giới hạn tối đa % lần ghi nhận/ngày cho quy tắc này.', v_rule.daily_limit USING errcode = 'P0004';
      END IF;
    END;
  END IF;

  IF v_title IS NULL OR v_title = '' THEN
    v_title := v_rule.name;
  END IF;

  -- Determine status based on cardinality of allowed_approver_types
  IF CARDINALITY(v_rule.allowed_approver_types) = 0 OR v_rule.allowed_approver_types IS NULL THEN
    v_status := 'APPROVED';
  ELSE
    v_status := 'PENDING';
  END IF;

  -- Check locked week if auto-approved and unit points apply
  IF v_status = 'APPROVED' AND v_rule.effect_scope IN ('UNIT_ONLY', 'BOTH') AND v_rule.unit_points <> 0 THEN
    PERFORM public.check_competition_week_lock(p_program_id, v_occurred_at);
  END IF;

  -- Insert incident
  INSERT INTO public.competition_incidents (
    program_id, rule_id, student_id, unit_id, occurred_at, title, description, evidence_note, status, recorded_by, approved_by, approved_at
  ) VALUES (
    p_program_id, p_rule_id, p_student_id, v_unit_id, v_occurred_at, v_title, p_description, p_evidence_note,
    v_status, v_caller_id, CASE WHEN v_status = 'APPROVED' THEN v_caller_id ELSE NULL END, CASE WHEN v_status = 'APPROVED' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_incident_id;

  -- Insert evidence items if provided
  IF p_evidence_items IS NOT NULL AND jsonb_array_length(p_evidence_items) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_evidence_items)
    LOOP
      INSERT INTO public.competition_incident_evidence (
        incident_id, evidence_type, file_url, external_url, caption, display_order, uploaded_by
      ) VALUES (
        v_incident_id,
        COALESCE(v_item->>'evidence_type', 'IMAGE'),
        v_item->>'file_url',
        v_item->>'external_url',
        v_item->>'caption',
        COALESCE((v_item->>'display_order')::integer, 0),
        v_caller_id
      );
    END LOOP;
  END IF;

  -- Create point transactions if auto-approved
  IF v_status = 'APPROVED' THEN
    DECLARE
      v_tx_type text;
    BEGIN
      IF v_rule.effect_scope IN ('STUDENT_ONLY', 'BOTH') AND v_rule.student_merit_points <> 0 THEN
        v_tx_type := CASE WHEN v_rule.student_merit_points > 0 THEN 'CREDIT' ELSE 'DEBIT' END;
        INSERT INTO public.competition_point_transactions (
          incident_id, student_id, unit_id, ledger_type, points, transaction_type, status, effective_at, created_by
        ) VALUES (
          v_incident_id, p_student_id, v_unit_id, 'STUDENT_MERIT',
          v_rule.student_merit_points, v_tx_type, 'POSTED', v_occurred_at, v_caller_id
        ) ON CONFLICT (incident_id, ledger_type) WHERE (incident_id IS NOT NULL AND transaction_type IN ('CREDIT', 'DEBIT')) DO NOTHING;
      END IF;

      IF v_rule.effect_scope IN ('STUDENT_ONLY', 'BOTH') AND v_rule.student_reward_points <> 0 THEN
        v_tx_type := CASE WHEN v_rule.student_reward_points > 0 THEN 'CREDIT' ELSE 'DEBIT' END;
        INSERT INTO public.competition_point_transactions (
          incident_id, student_id, unit_id, ledger_type, points, transaction_type, status, effective_at, created_by
        ) VALUES (
          v_incident_id, p_student_id, v_unit_id, 'STUDENT_REWARD',
          v_rule.student_reward_points, v_tx_type, 'POSTED', v_occurred_at, v_caller_id
        ) ON CONFLICT (incident_id, ledger_type) WHERE (incident_id IS NOT NULL AND transaction_type IN ('CREDIT', 'DEBIT')) DO NOTHING;
      END IF;

      IF v_rule.effect_scope IN ('UNIT_ONLY', 'BOTH') AND v_rule.unit_points <> 0 THEN
        v_tx_type := CASE WHEN v_rule.unit_points > 0 THEN 'CREDIT' ELSE 'DEBIT' END;
        INSERT INTO public.competition_point_transactions (
          incident_id, student_id, unit_id, ledger_type, points, transaction_type, status, effective_at, created_by
        ) VALUES (
          v_incident_id, p_student_id, v_unit_id, 'UNIT_COMPETITION',
          v_rule.unit_points, v_tx_type, 'POSTED', v_occurred_at, v_caller_id
        ) ON CONFLICT (incident_id, ledger_type) WHERE (incident_id IS NOT NULL AND transaction_type IN ('CREDIT', 'DEBIT')) DO NOTHING;
      END IF;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'incident_id', v_incident_id,
    'status', v_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_competition_incident(uuid, uuid, uuid, uuid, timestamptz, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_competition_incident(uuid, uuid, uuid, uuid, timestamptz, text, text, text, jsonb) TO authenticated;


-- ============================================================================
-- 2. RPC: approve_competition_incident
-- ============================================================================
CREATE OR REPLACE FUNCTION public.approve_competition_incident(p_incident_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_incident record;
  v_rule record;
  v_is_authorized boolean := false;
  v_sup_assignment record;
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

  -- 4. Load rule to check allowed_approver_types
  SELECT * INTO v_rule
  FROM public.competition_rules
  WHERE id = v_incident.rule_id;

  IF v_rule IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy quy tắc thi đua liên kết.' USING errcode = 'P0002';
  END IF;

  IF NOT v_rule.is_active THEN
    RAISE EXCEPTION 'Quy tắc thi đua này đang tạm khóa.' USING errcode = 'P0003';
  END IF;

  IF CARDINALITY(v_rule.allowed_approver_types) = 0 OR v_rule.allowed_approver_types IS NULL THEN
    RAISE EXCEPTION 'Sự việc này không có quy định xét duyệt thủ công.' USING errcode = '42501';
  END IF;

  -- 5. Authorization check against v_rule.allowed_approver_types
  -- Check if caller is ADMIN and ADMIN is allowed
  IF ('ADMIN' = ANY(v_rule.allowed_approver_types)) AND
     (public.has_competition_permission(v_caller_id, 'COMPETITION_APPROVE') OR public.has_competition_permission(v_caller_id, 'COMPETITION_MANAGE')) THEN
    v_is_authorized := true;
  END IF;

  -- Check if caller is SUPERVISOR and SUPERVISOR is allowed
  IF NOT v_is_authorized AND ('SUPERVISOR' = ANY(v_rule.allowed_approver_types)) THEN
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

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Bạn không có quyền duyệt sự việc thi đua này.' USING errcode = '42501';
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

  -- 8. Create point transactions
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


-- ============================================================================
-- 3. RPC: reject_competition_incident
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reject_competition_incident(
  p_incident_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_incident record;
  v_rule record;
  v_is_authorized boolean := false;
  v_sup_assignment record;
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
    RAISE EXCEPTION 'Sự việc không ở trạng thái chờ duyệt.' USING errcode = 'P0003';
  END IF;

  -- 3. Load rule to check allowed_approver_types
  SELECT * INTO v_rule
  FROM public.competition_rules
  WHERE id = v_incident.rule_id;

  IF v_rule IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy quy tắc thi đua liên kết.' USING errcode = 'P0002';
  END IF;

  IF CARDINALITY(v_rule.allowed_approver_types) = 0 OR v_rule.allowed_approver_types IS NULL THEN
    RAISE EXCEPTION 'Sự việc này không có quy định xét duyệt thủ công.' USING errcode = '42501';
  END IF;

  -- 4. Authorization check against v_rule.allowed_approver_types
  -- Check if caller is ADMIN and ADMIN is allowed
  IF ('ADMIN' = ANY(v_rule.allowed_approver_types)) AND
     (public.has_competition_permission(v_caller_id, 'COMPETITION_APPROVE') OR public.has_competition_permission(v_caller_id, 'COMPETITION_MANAGE')) THEN
    v_is_authorized := true;
  END IF;

  -- Check if caller is SUPERVISOR and SUPERVISOR is allowed
  IF NOT v_is_authorized AND ('SUPERVISOR' = ANY(v_rule.allowed_approver_types)) THEN
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

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Bạn không có quyền từ chối sự việc thi đua này.' USING errcode = '42501';
  END IF;

  -- 5. Update incident status to REJECTED
  UPDATE public.competition_incidents
  SET status = 'REJECTED',
      rejected_by = v_caller_id,
      rejected_at = now(),
      rejection_reason = p_reason,
      updated_at = now()
  WHERE id = p_incident_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Đã từ chối ghi nhận sự việc.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reject_competition_incident(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_competition_incident(uuid, text) TO authenticated;

COMMIT;
