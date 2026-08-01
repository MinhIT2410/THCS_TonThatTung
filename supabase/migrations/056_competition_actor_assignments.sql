BEGIN;

-- Ensure update_updated_at_column helper function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Migration 056: Competition Actor Assignments (Giám thị, BCH Liên đội, Sao đỏ) & Homeroom Teacher Integration

-- 1. Table: public.competition_actor_assignments
CREATE TABLE IF NOT EXISTS public.competition_actor_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assignment_type text NOT NULL,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  assigned_class_id uuid NULL REFERENCES public.classes(id) ON DELETE SET NULL,
  assigned_grade_level_id uuid NULL REFERENCES public.grade_levels(id) ON DELETE SET NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT competition_actor_type_check CHECK (assignment_type IN ('SUPERVISOR', 'LIEN_DOI_COMMAND', 'RED_STAR')),
  CONSTRAINT competition_actor_dates_check CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT competition_actor_scope_check CHECK (NOT (assigned_class_id IS NOT NULL AND assigned_grade_level_id IS NOT NULL))
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_competition_actor_assignments_updated_at ON public.competition_actor_assignments;
CREATE TRIGGER trg_competition_actor_assignments_updated_at
  BEFORE UPDATE ON public.competition_actor_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_actor_assignments_user_active
  ON public.competition_actor_assignments(user_id, is_active, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_actor_assignments_type
  ON public.competition_actor_assignments(assignment_type, academic_year_id, is_active);

-- Enable RLS
ALTER TABLE public.competition_actor_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Authenticated users can read competition_actor_assignments" ON public.competition_actor_assignments;
DROP POLICY IF EXISTS "Read competition_actor_assignments" ON public.competition_actor_assignments;
CREATE POLICY "Read competition_actor_assignments"
  ON public.competition_actor_assignments FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE')
  );

DROP POLICY IF EXISTS "Admins and Managers can manage competition_actor_assignments" ON public.competition_actor_assignments;
CREATE POLICY "Admins and Managers can manage competition_actor_assignments"
  ON public.competition_actor_assignments FOR ALL
  TO authenticated
  USING (
    public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE')
  )
  WITH CHECK (
    public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE')
  );

-- 2. Trigger function to validate user role based on assignment type
CREATE OR REPLACE FUNCTION public.check_competition_actor_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Check user role
  IF NEW.assignment_type = 'SUPERVISOR' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = NEW.user_id AND role_code = 'TEACHER'
    ) THEN
      RAISE EXCEPTION 'Lỗi phân công: Giám thị phải là tài khoản Giáo viên.' USING errcode = 'P0004';
    END IF;
  ELSIF NEW.assignment_type IN ('LIEN_DOI_COMMAND', 'RED_STAR') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = NEW.user_id AND role_code = 'STUDENT'
    ) THEN
      RAISE EXCEPTION 'Lỗi phân công: BCH Liên đội và Sao đỏ phải là tài khoản Học sinh.' USING errcode = 'P0004';
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_competition_actor_role ON public.competition_actor_assignments;
CREATE TRIGGER trg_check_competition_actor_role
  BEFORE INSERT OR UPDATE ON public.competition_actor_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_competition_actor_role();

-- 3. Helper function to check user actor scope
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

-- 4. Redefine create_competition_incident RPC
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
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
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
  v_actor_type text := null;
  v_is_full_recorder boolean := false;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Chưa đăng nhập.' using errcode = '42501';
  end if;

  -- Verify real current class of student if p_student_id is provided
  if p_student_id is not null then
    v_unit_info := public.get_student_current_unit(p_student_id);
    if (v_unit_info->>'has_unit')::boolean = true then
      v_real_unit_id := (v_unit_info->>'class_id')::uuid;
    end if;

    if p_unit_id is null then
      v_unit_id := v_real_unit_id;
    else
      if v_real_unit_id is null or p_unit_id <> v_real_unit_id then
        raise exception 'Chi đội được gửi lên không khớp với lớp hiện tại của Đội viên.' using errcode = 'P0004';
      end if;
      v_unit_id := p_unit_id;
    end if;
  end if;

  -- Check caller authorization & scope
  select scope.has_access, scope.assignment_type, scope.is_admin_or_recorder
  into v_has_access, v_actor_type, v_is_full_recorder
  from public.get_user_competition_actor_scope(v_caller_id, v_unit_id) scope;

  if not coalesce(v_has_access, false) then
    raise exception 'Quyền truy cập bị từ chối hoặc ngoài phạm vi phân công được giao.' using errcode = '42501';
  end if;

  -- Fetch rule
  select * into v_rule
  from public.competition_rules
  where id = p_rule_id and program_id = p_program_id;

  if not found then
    raise exception 'Quy tắc thi đua không tồn tại hoặc không thuộc chương trình được chọn.' using errcode = 'P0002';
  end if;

  if not v_rule.is_active then
    raise exception 'Quy tắc thi đua này đang tạm khóa.' using errcode = 'P0003';
  end if;

  -- Enforce requires_evidence validation
  if v_rule.requires_evidence then
    if p_evidence_items is null or jsonb_typeof(p_evidence_items) <> 'array' or jsonb_array_length(p_evidence_items) = 0 then
      raise exception 'Quy tắc này yêu cầu phải có minh chứng.' using errcode = 'P0004';
    end if;

    declare
      v_valid_evidence_found boolean := false;
      v_type text;
      v_file_url text;
      v_ext_url text;
    begin
      for v_item in select * from jsonb_array_elements(p_evidence_items)
      loop
        v_type := coalesce(v_item->>'evidence_type', 'IMAGE');
        v_file_url := trim(coalesce(v_item->>'file_url', ''));
        v_ext_url := trim(coalesce(v_item->>'external_url', ''));

        if v_type = 'IMAGE' and v_file_url <> '' then
          v_valid_evidence_found := true;
        elsif v_type in ('INTERNAL_LINK', 'EXTERNAL_LINK') and (v_file_url <> '' or v_ext_url <> '') then
          v_valid_evidence_found := true;
        end if;
      end loop;

      if not v_valid_evidence_found then
        raise exception 'Quy tắc này yêu cầu phải có minh chứng.' using errcode = 'P0004';
      end if;
    end;
  end if;

  -- Validate scope requirements
  if v_rule.effect_scope = 'BOTH' then
    if p_student_id is null then
      raise exception 'Quy tắc này yêu cầu phải chọn Đội viên.' using errcode = 'P0004';
    end if;
    if v_unit_id is null then
      raise exception 'Đội viên chưa được phân vào chi đội.' using errcode = 'P0004';
    end if;
  elsif v_rule.effect_scope = 'STUDENT_ONLY' then
    if p_student_id is null then
      raise exception 'Quy tắc này yêu cầu phải chọn Đội viên.' using errcode = 'P0004';
    end if;
  elsif v_rule.effect_scope = 'UNIT_ONLY' then
    if v_unit_id is null then
      raise exception 'Quy tắc này yêu cầu phải xác định Chi đội.' using errcode = 'P0004';
    end if;
  end if;

  -- Enforce daily_limit validation
  if v_rule.daily_limit is not null and v_rule.daily_limit > 0 then
    declare
      v_existing_count integer := 0;
      v_occurred_date date := v_occurred_at::date;
    begin
      if v_rule.effect_scope in ('STUDENT_ONLY', 'BOTH') and p_student_id is not null then
        select count(*) into v_existing_count
        from public.competition_incidents
        where rule_id = v_rule.id
          and student_id = p_student_id
          and status not in ('REJECTED', 'CANCELLED')
          and occurred_at::date = v_occurred_date;
      elsif v_rule.effect_scope = 'UNIT_ONLY' and v_unit_id is not null then
        select count(*) into v_existing_count
        from public.competition_incidents
        where rule_id = v_rule.id
          and unit_id = v_unit_id
          and status not in ('REJECTED', 'CANCELLED')
          and occurred_at::date = v_occurred_date;
      else
        select count(*) into v_existing_count
        from public.competition_incidents
        where rule_id = v_rule.id
          and (
            (p_student_id is not null and student_id = p_student_id) or
            (v_unit_id is not null and unit_id = v_unit_id)
          )
          and status not in ('REJECTED', 'CANCELLED')
          and occurred_at::date = v_occurred_date;
      end if;

      if v_existing_count >= v_rule.daily_limit then
        raise exception 'Đã đạt giới hạn tối đa % lần ghi nhận/ngày cho quy tắc này.', v_rule.daily_limit using errcode = 'P0004';
      end if;
    end;
  end if;

  if v_title is null or v_title = '' then
    v_title := v_rule.name;
  end if;

  -- Determine status:
  -- If recorded by SUPERVISOR, LIEN_DOI_COMMAND, RED_STAR, or HOMEROOM_TEACHER (not full admin/recorder), ALWAYS PENDING!
  if v_is_full_recorder then
    if v_rule.requires_approval then
      v_status := 'PENDING';
    else
      v_status := 'APPROVED';
    end if;
  else
    v_status := 'PENDING';
  end if;

  -- Check locked week if auto-approved and unit points apply
  if v_status = 'APPROVED' and v_rule.effect_scope in ('UNIT_ONLY', 'BOTH') and v_rule.unit_points <> 0 then
    perform public.check_competition_week_lock(p_program_id, v_occurred_at);
  end if;

  -- Insert incident
  insert into public.competition_incidents (
    program_id, rule_id, student_id, unit_id, occurred_at, title, description, evidence_note, status, recorded_by, approved_by, approved_at
  ) values (
    p_program_id, p_rule_id, p_student_id, v_unit_id, v_occurred_at, v_title, p_description, p_evidence_note,
    v_status, v_caller_id, case when v_status = 'APPROVED' then v_caller_id else null end, case when v_status = 'APPROVED' then now() else null end
  )
  returning id into v_incident_id;

  -- Insert evidence items if provided
  if p_evidence_items is not null and jsonb_array_length(p_evidence_items) > 0 then
    for v_item in select * from jsonb_array_elements(p_evidence_items)
    loop
      insert into public.competition_incident_evidence (
        incident_id, evidence_type, file_url, external_url, caption, display_order, uploaded_by
      ) values (
        v_incident_id,
        coalesce(v_item->>'evidence_type', 'IMAGE'),
        v_item->>'file_url',
        v_item->>'external_url',
        v_item->>'caption',
        coalesce((v_item->>'display_order')::integer, 0),
        v_caller_id
      );
    end loop;
  end if;

  -- If status is APPROVED immediately, create point transactions
  if v_status = 'APPROVED' then
    if v_rule.effect_scope in ('STUDENT_ONLY', 'BOTH') and v_rule.student_merit_points <> 0 then
      insert into public.competition_point_transactions (
        incident_id, student_id, unit_id, ledger_type, points, transaction_type, status, effective_at, created_by
      ) values (
        v_incident_id, p_student_id, v_unit_id, 'STUDENT_MERIT', v_rule.student_merit_points,
        case when v_rule.student_merit_points > 0 then 'CREDIT' else 'DEBIT' end, 'POSTED', v_occurred_at, v_caller_id
      ) on conflict (incident_id, ledger_type) where (incident_id is not null and transaction_type in ('CREDIT', 'DEBIT')) do nothing;
    end if;

    if v_rule.effect_scope in ('STUDENT_ONLY', 'BOTH') and v_rule.student_reward_points <> 0 then
      insert into public.competition_point_transactions (
        incident_id, student_id, unit_id, ledger_type, points, transaction_type, status, effective_at, created_by
      ) values (
        v_incident_id, p_student_id, v_unit_id, 'STUDENT_REWARD', v_rule.student_reward_points,
        case when v_rule.student_reward_points > 0 then 'CREDIT' else 'DEBIT' end, 'POSTED', v_occurred_at, v_caller_id
      ) on conflict (incident_id, ledger_type) where (incident_id is not null and transaction_type in ('CREDIT', 'DEBIT')) do nothing;
    end if;

    if v_rule.effect_scope in ('UNIT_ONLY', 'BOTH') and v_rule.unit_points <> 0 then
      insert into public.competition_point_transactions (
        incident_id, student_id, unit_id, ledger_type, points, transaction_type, status, effective_at, created_by
      ) values (
        v_incident_id, p_student_id, v_unit_id, 'UNIT_COMPETITION', v_rule.unit_points,
        case when v_rule.unit_points > 0 then 'CREDIT' else 'DEBIT' end, 'POSTED', v_occurred_at, v_caller_id
      ) on conflict (incident_id, ledger_type) where (incident_id is not null and transaction_type in ('CREDIT', 'DEBIT')) do nothing;
    end if;
  end if;

  return jsonb_build_object(
    'incident_id', v_incident_id,
    'status', v_status
  );
end;
$$;

-- 5. RPC to get homeroom competition incidents
CREATE OR REPLACE FUNCTION public.get_homeroom_competition_incidents(
  p_program_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  program_id uuid,
  rule_id uuid,
  student_id uuid,
  unit_id uuid,
  occurred_at timestamptz,
  title text,
  description text,
  evidence_note text,
  status text,
  recorded_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz,
  student_name text,
  unit_name text,
  rule_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_class_ids uuid[];
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập.' USING errcode = '42501';
  END IF;

  SELECT array_agg(ha.class_id) INTO v_class_ids
  FROM public.homeroom_assignments ha
  JOIN public.academic_years ay ON ay.id = ha.academic_year_id
  WHERE ha.teacher_id = v_caller_id
    AND ay.is_current = true;

  IF v_class_ids IS NULL OR array_length(v_class_ids, 1) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    i.id,
    i.program_id,
    i.rule_id,
    i.student_id,
    i.unit_id,
    i.occurred_at,
    i.title,
    i.description,
    i.evidence_note,
    i.status,
    i.recorded_by,
    i.approved_by,
    i.approved_at,
    i.created_at,
    p.full_name AS student_name,
    c.name AS unit_name,
    r.name AS rule_name
  FROM public.competition_incidents i
  LEFT JOIN public.profiles p ON p.id = i.student_id
  LEFT JOIN public.classes c ON c.id = i.unit_id
  LEFT JOIN public.competition_rules r ON r.id = i.rule_id
  WHERE i.unit_id = ANY(v_class_ids)
    AND (p_program_id IS NULL OR i.program_id = p_program_id)
  ORDER BY i.occurred_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 100)
  OFFSET GREATEST(p_offset, 0);
END;
$$;

-- 6. RPC to get caller's active actor assignments
CREATE OR REPLACE FUNCTION public.get_my_competition_actor_assignments()
RETURNS TABLE (
  id uuid,
  assignment_type text,
  academic_year_id uuid,
  assigned_class_id uuid,
  assigned_class_name text,
  assigned_grade_level_id uuid,
  assigned_grade_name text,
  start_date date,
  end_date date,
  is_active boolean
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
    ca.assigned_class_id,
    c.name AS assigned_class_name,
    ca.assigned_grade_level_id,
    g.name AS assigned_grade_name,
    ca.start_date,
    ca.end_date,
    ca.is_active
  FROM public.competition_actor_assignments ca
  JOIN public.academic_years ay ON ay.id = ca.academic_year_id
  LEFT JOIN public.classes c ON c.id = ca.assigned_class_id
  LEFT JOIN public.grade_levels g ON g.id = ca.assigned_grade_level_id
  WHERE ca.user_id = auth.uid()
    AND ca.is_active = true
    AND ay.is_current = true
    AND ca.start_date <= CURRENT_DATE
    AND (ca.end_date IS NULL OR ca.end_date >= CURRENT_DATE);
END;
$$;

-- 7. RPC to search candidates for competition assignment (SUPERVISOR, LIEN_DOI_COMMAND, RED_STAR)
CREATE OR REPLACE FUNCTION public.search_competition_assignment_candidates(
  p_assignment_type text,
  p_search text DEFAULT NULL,
  p_academic_year_id uuid DEFAULT NULL,
  p_class_id uuid DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 30
)
RETURNS TABLE (
  id uuid,
  full_name text,
  student_code text,
  current_class_id uuid,
  current_class_name text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role_code text;
  v_page_size integer := LEAST(GREATEST(p_page_size, 1), 50);
  v_offset integer := (GREATEST(p_page, 1) - 1) * v_page_size;
  v_search text := trim(p_search);
  v_year_id uuid := p_academic_year_id;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập.' USING errcode = '42501';
  END IF;

  IF NOT public.has_competition_permission(
    auth.uid(),
    'COMPETITION_MANAGE'
  ) THEN
    RAISE EXCEPTION 'Bạn không có quyền quản lý phân công nhiệm vụ.' USING errcode = '42501';
  END IF;

  IF p_assignment_type = 'SUPERVISOR' THEN
    v_role_code := 'TEACHER';
  ELSIF p_assignment_type IN ('LIEN_DOI_COMMAND', 'RED_STAR') THEN
    v_role_code := 'STUDENT';
  ELSE
    RAISE EXCEPTION 'Loại nhiệm vụ không hợp lệ.' USING errcode = 'P0004';
  END IF;

  IF v_year_id IS NULL THEN
    SELECT ay.id INTO v_year_id
    FROM public.academic_years ay
    WHERE ay.is_current = true
    LIMIT 1;
  END IF;

  RETURN QUERY
  WITH candidate_base AS (
    SELECT DISTINCT ON (p.id)
      p.id AS user_id,
      p.full_name,
      p.student_code,
      c.id AS class_id,
      c.name AS class_name
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role_code = v_role_code
    LEFT JOIN public.student_enrollments se ON se.student_id = p.id 
      AND (v_year_id IS NULL OR se.academic_year_id = v_year_id)
    LEFT JOIN public.classes c ON c.id = se.class_id
    WHERE p.is_active = true
      AND (
        v_search IS NULL OR v_search = '' OR
        p.full_name ILIKE '%' || v_search || '%' OR
        (v_role_code = 'STUDENT' AND p.student_code ILIKE '%' || v_search || '%')
      )
      AND (p_class_id IS NULL OR se.class_id = p_class_id)
    ORDER BY p.id, se.created_at DESC
  ),
  counted AS (
    SELECT COUNT(*) AS total FROM candidate_base
  )
  SELECT
    cb.user_id AS id,
    cb.full_name,
    cb.student_code,
    cb.class_id AS current_class_id,
    cb.class_name AS current_class_name,
    cnt.total AS total_count
  FROM candidate_base cb, counted cnt
  ORDER BY cb.full_name ASC
  LIMIT v_page_size
  OFFSET v_offset;
END;
$$;

-- Revoke default PUBLIC permissions on trigger and internal helper functions
REVOKE ALL ON FUNCTION public.check_competition_actor_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_competition_actor_scope(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Revoke and re-grant execute permissions for frontend RPCs
REVOKE ALL ON FUNCTION public.create_competition_incident(uuid, uuid, uuid, uuid, timestamptz, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_competition_incident(uuid, uuid, uuid, uuid, timestamptz, text, text, text, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.get_homeroom_competition_incidents(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_homeroom_competition_incidents(uuid, integer, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.get_my_competition_actor_assignments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_competition_actor_assignments() TO authenticated;

REVOKE ALL ON FUNCTION public.search_competition_assignment_candidates(text, text, uuid, uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_competition_assignment_candidates(text, text, uuid, uuid, integer, integer) TO authenticated;

COMMIT;
