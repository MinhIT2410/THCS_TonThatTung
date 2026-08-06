BEGIN;

-- ============================================================================
-- Migration 066: Auto-publish competition rankings schedule configuration
-- & Dedicated Public Snapshot Architecture
-- ============================================================================

-- 1. Table: competition_auto_publish_configs
CREATE TABLE IF NOT EXISTS public.competition_auto_publish_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid NOT NULL UNIQUE REFERENCES public.academic_years(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  publish_times text[] NOT NULL DEFAULT ARRAY['06:00', '12:00', '18:00']::text[],
  last_published_at timestamptz NULL,
  next_publish_at timestamptz NULL,
  updated_by uuid NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.competition_auto_publish_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read competition_auto_publish_configs" ON public.competition_auto_publish_configs;
CREATE POLICY "Authenticated users can read competition_auto_publish_configs"
  ON public.competition_auto_publish_configs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anon can read competition_auto_publish_configs" ON public.competition_auto_publish_configs;

DROP POLICY IF EXISTS "Admins can manage competition_auto_publish_configs" ON public.competition_auto_publish_configs;
CREATE POLICY "Admins can manage competition_auto_publish_configs"
  ON public.competition_auto_publish_configs FOR ALL
  TO authenticated
  USING (
    public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE')
  )
  WITH CHECK (
    public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE')
  );

GRANT SELECT ON public.competition_auto_publish_configs TO authenticated;

-- 2. Public Snapshot Table: competition_public_unit_snapshots
-- Captures published class/unit leaderboard snapshots without locking weeks or altering base data.
CREATE TABLE IF NOT EXISTS public.competition_public_unit_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  week_id uuid NOT NULL REFERENCES public.competition_weeks(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  unit_name text NOT NULL,
  grade_level_id uuid NULL,
  grade_name text NULL,
  starting_points integer NOT NULL DEFAULT 100,
  manual_bonus_points integer NOT NULL DEFAULT 0,
  manual_penalty_points integer NOT NULL DEFAULT 0,
  incident_bonus_points integer NOT NULL DEFAULT 0,
  incident_penalty_points integer NOT NULL DEFAULT 0,
  final_points integer NOT NULL DEFAULT 100,
  rank integer NOT NULL DEFAULT 1,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT competition_public_unit_snapshots_week_unit_unique UNIQUE (week_id, unit_id)
);

ALTER TABLE public.competition_public_unit_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read competition_public_unit_snapshots" ON public.competition_public_unit_snapshots;
CREATE POLICY "Anyone can read competition_public_unit_snapshots"
  ON public.competition_public_unit_snapshots FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Admins can manage competition_public_unit_snapshots" ON public.competition_public_unit_snapshots;
CREATE POLICY "Admins can manage competition_public_unit_snapshots"
  ON public.competition_public_unit_snapshots FOR ALL
  TO authenticated
  USING (
    public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE')
  )
  WITH CHECK (
    public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE')
  );

GRANT SELECT ON public.competition_public_unit_snapshots TO authenticated, anon;

-- 3. Public Snapshot Table: competition_public_student_snapshots
-- Captures Top 5 student reward point snapshots without altering base balances.
CREATE TABLE IF NOT EXISTS public.competition_public_student_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  unit_name text NOT NULL,
  total_reward_points integer NOT NULL DEFAULT 0,
  rank integer NOT NULL DEFAULT 1,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT competition_public_student_snapshots_year_student_unique UNIQUE (academic_year_id, student_id)
);

ALTER TABLE public.competition_public_student_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read competition_public_student_snapshots" ON public.competition_public_student_snapshots;
CREATE POLICY "Anyone can read competition_public_student_snapshots"
  ON public.competition_public_student_snapshots FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Admins can manage competition_public_student_snapshots" ON public.competition_public_student_snapshots;
CREATE POLICY "Admins can manage competition_public_student_snapshots"
  ON public.competition_public_student_snapshots FOR ALL
  TO authenticated
  USING (
    public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE')
  )
  WITH CHECK (
    public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE')
  );

GRANT SELECT ON public.competition_public_student_snapshots TO authenticated, anon;

-- 4. Helper function: calculate_next_publish_at
CREATE OR REPLACE FUNCTION public.calculate_next_publish_at(
  p_publish_times text[]
)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now_vn timestamp;
  v_today_date date;
  v_current_time_str text;
  v_t text;
  v_next_time text := NULL;
  v_min_time text := NULL;
  v_target_timestamp timestamp;
BEGIN
  IF p_publish_times IS NULL OR array_length(p_publish_times, 1) IS NULL THEN
    RETURN NULL;
  END IF;

  v_now_vn := timezone('Asia/Ho_Chi_Minh', now());
  v_today_date := v_now_vn::date;
  v_current_time_str := to_char(v_now_vn, 'HH24:MI');

  FOR v_t IN SELECT unnest(p_publish_times) ORDER BY 1 ASC LOOP
    IF v_min_time IS NULL THEN
      v_min_time := v_t;
    END IF;
    IF v_t > v_current_time_str AND v_next_time IS NULL THEN
      v_next_time := v_t;
    END IF;
  END LOOP;

  IF v_next_time IS NOT NULL THEN
    v_target_timestamp := (v_today_date || ' ' || v_next_time || ':00')::timestamp;
  ELSIF v_min_time IS NOT NULL THEN
    v_target_timestamp := ((v_today_date + interval '1 day')::date || ' ' || v_min_time || ':00')::timestamp;
  ELSE
    RETURN NULL;
  END IF;

  RETURN timezone('Asia/Ho_Chi_Minh', v_target_timestamp);
END;
$$;

-- 5. Function: get_competition_auto_publish_config
CREATE OR REPLACE FUNCTION public.get_competition_auto_publish_config(
  p_academic_year_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_config record;
BEGIN
  IF p_academic_year_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_config
  FROM public.competition_auto_publish_configs
  WHERE academic_year_id = p_academic_year_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'academic_year_id', p_academic_year_id,
      'is_enabled', false,
      'publish_times', ARRAY['06:00', '12:00', '18:00']::text[],
      'last_published_at', NULL,
      'next_publish_at', NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'id', v_config.id,
    'academic_year_id', v_config.academic_year_id,
    'is_enabled', v_config.is_enabled,
    'publish_times', COALESCE(v_config.publish_times, ARRAY[]::text[]),
    'last_published_at', v_config.last_published_at,
    'next_publish_at', v_config.next_publish_at
  );
END;
$$;

-- 6. Function: save_competition_auto_publish_config
CREATE OR REPLACE FUNCTION public.save_competition_auto_publish_config(
  p_academic_year_id uuid,
  p_is_enabled boolean,
  p_publish_times text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_cleaned_times text[];
  v_next_pub timestamptz;
  v_config record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_competition_permission(v_user_id, 'COMPETITION_MANAGE') THEN
    RAISE EXCEPTION 'Bạn không có quyền quản lý cấu hình thi đua (Cần quyền COMPETITION_MANAGE).' USING ERRCODE = '42501';
  END IF;

  SELECT ARRAY_AGG(t ORDER BY t ASC) INTO v_cleaned_times
  FROM (
    SELECT DISTINCT unnest(p_publish_times) AS t
  ) sub
  WHERE t ~ '^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$';

  IF p_is_enabled AND (v_cleaned_times IS NULL OR array_length(v_cleaned_times, 1) = 0) THEN
    RAISE EXCEPTION 'Vui lòng chọn ít nhất một khung giờ công bố.' USING ERRCODE = 'P0001';
  END IF;

  IF p_is_enabled THEN
    v_next_pub := public.calculate_next_publish_at(v_cleaned_times);
  ELSE
    v_next_pub := NULL;
  END IF;

  INSERT INTO public.competition_auto_publish_configs (
    academic_year_id,
    is_enabled,
    publish_times,
    next_publish_at,
    updated_by,
    updated_at
  )
  VALUES (
    p_academic_year_id,
    p_is_enabled,
    COALESCE(v_cleaned_times, ARRAY[]::text[]),
    v_next_pub,
    v_user_id,
    now()
  )
  ON CONFLICT (academic_year_id) DO UPDATE SET
    is_enabled = EXCLUDED.is_enabled,
    publish_times = EXCLUDED.publish_times,
    next_publish_at = EXCLUDED.next_publish_at,
    updated_by = EXCLUDED.updated_by,
    updated_at = now()
  RETURNING * INTO v_config;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Đã lưu cấu hình tự động công bố thành công!',
    'config', jsonb_build_object(
      'id', v_config.id,
      'academic_year_id', v_config.academic_year_id,
      'is_enabled', v_config.is_enabled,
      'publish_times', v_config.publish_times,
      'last_published_at', v_config.last_published_at,
      'next_publish_at', v_config.next_publish_at
    )
  );
END;
$$;

-- 7. Internal Snapshot Generator Function: publish_snapshots_for_academic_year
CREATE OR REPLACE FUNCTION public.publish_snapshots_for_academic_year(
  p_academic_year_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := now();
  v_week record;
  v_start_ts timestamptz;
  v_end_ts timestamptz;
  v_published_weeks_count int := 0;
BEGIN
  IF p_academic_year_id IS NULL THEN
    RAISE EXCEPTION 'Mã năm học không hợp lệ.' USING ERRCODE = 'P0001';
  END IF;

  -- A. Snapshot Class/Unit Rankings for all weeks in programs under p_academic_year_id
  FOR v_week IN
    SELECT cw.*
    FROM public.competition_weeks cw
    JOIN public.competition_programs cp ON cp.id = cw.program_id
    WHERE cp.academic_year_id = p_academic_year_id
  LOOP
    -- Calculate strict week bounds in Asia/Ho_Chi_Minh time
    v_start_ts := v_week.starts_on::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh';
    v_end_ts := ((v_week.ends_on + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') - interval '1 microsecond';

    -- Ensure units exist in competition_week_units for this week
    IF NOT EXISTS (SELECT 1 FROM public.competition_week_units WHERE week_id = v_week.id) THEN
      INSERT INTO public.competition_week_units (
        week_id, unit_id, starting_points, status
      )
      SELECT
        v_week.id,
        c.id,
        COALESCE(v_week.default_starting_points, 100),
        'ACTIVE'
      FROM public.classes c
      WHERE (p_academic_year_id IS NULL OR c.academic_year_id = p_academic_year_id)
        AND c.is_active = true
      ON CONFLICT (week_id, unit_id) DO NOTHING;
    END IF;

    -- Delete old snapshot for this week
    DELETE FROM public.competition_public_unit_snapshots
    WHERE week_id = v_week.id;

    -- Compute and insert new snapshot from posted UNIT_COMPETITION transactions
    INSERT INTO public.competition_public_unit_snapshots (
      academic_year_id,
      week_id,
      unit_id,
      unit_name,
      grade_level_id,
      grade_name,
      starting_points,
      manual_bonus_points,
      manual_penalty_points,
      incident_bonus_points,
      incident_penalty_points,
      final_points,
      rank,
      published_at
    )
    WITH unit_calculated AS (
      SELECT
        cwu.unit_id,
        c.name AS unit_name,
        c.grade_level_id,
        gl.name AS grade_name,
        cwu.starting_points,
        cwu.manual_bonus_points,
        cwu.manual_penalty_points,
        COALESCE(SUM(CASE WHEN COALESCE(t.program_id, inc.program_id) = v_week.program_id AND t.points > 0 THEN t.points ELSE 0 END), 0)::integer AS inc_bonus,
        COALESCE(SUM(CASE WHEN COALESCE(t.program_id, inc.program_id) = v_week.program_id AND t.points < 0 THEN ABS(t.points) ELSE 0 END), 0)::integer AS inc_penalty,
        (cwu.starting_points + cwu.manual_bonus_points - cwu.manual_penalty_points + COALESCE(SUM(CASE WHEN COALESCE(t.program_id, inc.program_id) = v_week.program_id THEN t.points ELSE 0 END), 0))::integer AS calc_final_points
      FROM public.competition_week_units cwu
      JOIN public.classes c ON c.id = cwu.unit_id
      LEFT JOIN public.grade_levels gl ON gl.id = c.grade_level_id
      LEFT JOIN public.competition_point_transactions t
        ON t.unit_id = cwu.unit_id
       AND t.ledger_type = 'UNIT_COMPETITION'
       AND t.status = 'POSTED'
       AND t.effective_at >= v_start_ts
       AND t.effective_at <= v_end_ts
      LEFT JOIN public.competition_incidents inc
        ON inc.id = t.incident_id
      WHERE cwu.week_id = v_week.id
      GROUP BY cwu.unit_id, c.name, c.grade_level_id, gl.name, cwu.starting_points, cwu.manual_bonus_points, cwu.manual_penalty_points
    ),
    unit_ranked AS (
      SELECT
        *,
        RANK() OVER (
          PARTITION BY grade_level_id
          ORDER BY calc_final_points DESC, manual_penalty_points ASC, inc_penalty ASC, unit_name ASC
        )::integer AS calculated_rank
      FROM unit_calculated
    )
    SELECT
      p_academic_year_id,
      v_week.id,
      unit_id,
      unit_name,
      grade_level_id,
      grade_name,
      starting_points,
      manual_bonus_points,
      manual_penalty_points,
      inc_bonus,
      inc_penalty,
      calc_final_points,
      calculated_rank,
      v_now
    FROM unit_ranked;

    v_published_weeks_count := v_published_weeks_count + 1;
  END LOOP;

  -- B. Snapshot Top 5 Student Rewards for p_academic_year_id
  -- Delete old top student snapshots for this year
  DELETE FROM public.competition_public_student_snapshots
  WHERE academic_year_id = p_academic_year_id;

  -- Compute and insert new top 5 student snapshot
  INSERT INTO public.competition_public_student_snapshots (
    academic_year_id,
    student_id,
    full_name,
    unit_name,
    total_reward_points,
    rank,
    published_at
  )
  WITH student_active_units AS (
    SELECT DISTINCT ON (e.student_id)
      e.student_id,
      p.full_name,
      c.name AS class_name
    FROM public.student_enrollments e
    JOIN public.profiles p ON p.id = e.student_id
    JOIN public.classes c ON c.id = e.class_id
    WHERE e.academic_year_id = p_academic_year_id
      AND p.is_active = true
      AND c.is_active = true
    ORDER BY e.student_id, e.created_at DESC
  ),
  student_total_rewards AS (
    SELECT
      t.student_id,
      COALESCE(SUM(t.points), 0)::integer AS total_points
    FROM public.competition_point_transactions t
    WHERE t.ledger_type = 'STUDENT_REWARD'
      AND t.status = 'POSTED'
      AND t.student_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM student_active_units u WHERE u.student_id = t.student_id
      )
    GROUP BY t.student_id
  ),
  top_calculated AS (
    SELECT
      u.student_id,
      u.full_name,
      u.class_name AS unit_name,
      r.total_points AS calc_total_points
    FROM student_active_units u
    JOIN student_total_rewards r ON r.student_id = u.student_id
    WHERE r.total_points > 0
    ORDER BY r.total_points DESC, u.full_name ASC
    LIMIT 5
  ),
  top_ranked AS (
    SELECT
      *,
      ROW_NUMBER() OVER (ORDER BY calc_total_points DESC, full_name ASC)::integer AS calculated_rank
    FROM top_calculated
  )
  SELECT
    p_academic_year_id,
    student_id,
    full_name,
    unit_name,
    calc_total_points,
    calculated_rank,
    v_now
  FROM top_ranked;

  RETURN jsonb_build_object(
    'success', true,
    'published_weeks_count', v_published_weeks_count,
    'published_at', v_now
  );
END;
$$;

-- 8. Function: trigger_auto_publish_competition (Manual "Cập nhật ngay" or API call)
CREATE OR REPLACE FUNCTION public.trigger_auto_publish_competition(
  p_academic_year_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_config record;
  v_next_pub timestamptz;
  v_res jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_competition_permission(v_user_id, 'COMPETITION_MANAGE') THEN
    RAISE EXCEPTION 'Bạn không có quyền thực hiện công bố điểm (Cần quyền COMPETITION_MANAGE).' USING ERRCODE = '42501';
  END IF;

  -- Generate snapshots
  v_res := public.publish_snapshots_for_academic_year(p_academic_year_id);

  -- Update config state
  SELECT * INTO v_config
  FROM public.competition_auto_publish_configs
  WHERE academic_year_id = p_academic_year_id;

  IF FOUND AND v_config.is_enabled THEN
    v_next_pub := public.calculate_next_publish_at(v_config.publish_times);
    UPDATE public.competition_auto_publish_configs
    SET last_published_at = now(),
        next_publish_at = v_next_pub,
        updated_at = now()
    WHERE id = v_config.id;
  ELSIF FOUND THEN
    UPDATE public.competition_auto_publish_configs
    SET last_published_at = now(),
        updated_at = now()
    WHERE id = v_config.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Đã cập nhật snapshot công bố điểm và Top 5 thành công!',
    'published_weeks_count', COALESCE((v_res->>'published_weeks_count')::int, 0),
    'last_published_at', now()
  );
END;
$$;

-- 9. Background Worker Routine: process_auto_publish_schedules
-- Designed to be called by pg_cron or external scheduler service without requiring active user auth context.
CREATE OR REPLACE FUNCTION public.process_auto_publish_schedules()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cfg record;
  v_processed_count int := 0;
  v_next_pub timestamptz;
BEGIN
  FOR v_cfg IN
    SELECT *
    FROM public.competition_auto_publish_configs
    WHERE is_enabled = true
      AND (next_publish_at IS NULL OR next_publish_at <= now())
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.publish_snapshots_for_academic_year(v_cfg.academic_year_id);

    v_next_pub := public.calculate_next_publish_at(v_cfg.publish_times);

    UPDATE public.competition_auto_publish_configs
    SET last_published_at = now(),
        next_publish_at = v_next_pub,
        updated_at = now()
    WHERE id = v_cfg.id;

    v_processed_count := v_processed_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'processed_count', v_processed_count,
    'executed_at', now()
  );
END;
$$;

-- 10. RPC: get_top_student_rewards (Reads exclusively from published snapshots)
DROP FUNCTION IF EXISTS public.get_top_student_rewards(integer);
CREATE OR REPLACE FUNCTION public.get_top_student_rewards(p_limit integer DEFAULT 5)
RETURNS TABLE (
  id uuid,
  full_name text,
  unit_name text,
  total_reward_points integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 5), 1), 5);
  v_curr_year_id uuid;
BEGIN
  -- Get current academic year
  SELECT ay.id INTO v_curr_year_id
  FROM public.academic_years ay
  WHERE ay.is_current = true
  LIMIT 1;

  IF v_curr_year_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    s.student_id AS id,
    s.full_name,
    s.unit_name,
    s.total_reward_points
  FROM public.competition_public_student_snapshots s
  WHERE s.academic_year_id = v_curr_year_id
  ORDER BY s.rank ASC
  LIMIT v_limit;
END;
$$;

-- Strict Permissions & Access Control
-- 1. Lock internal snapshot generator from direct client calls
REVOKE ALL ON FUNCTION public.publish_snapshots_for_academic_year(uuid) FROM PUBLIC, anon, authenticated;

-- 2. Lock worker routine from direct client calls (reserved for pg_cron / n8n / backend scheduler)
REVOKE ALL ON FUNCTION public.process_auto_publish_schedules() FROM PUBLIC, anon, authenticated;

-- 3. Config read/write RPCs
REVOKE ALL ON FUNCTION public.get_competition_auto_publish_config(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_competition_auto_publish_config(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.save_competition_auto_publish_config(uuid, boolean, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_competition_auto_publish_config(uuid, boolean, text[]) TO authenticated;

REVOKE ALL ON FUNCTION public.trigger_auto_publish_competition(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trigger_auto_publish_competition(uuid) TO authenticated;

-- 4. Public Top 5 RPC
REVOKE ALL ON FUNCTION public.get_top_student_rewards(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_top_student_rewards(integer) TO anon, authenticated;

-- 5. Redefine create_competition_incident RPC with proper auto-approval logic
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
  v_status text := 'PENDING';
  v_title text := trim(p_title);
  v_item jsonb;
  v_occurred_at timestamptz := coalesce(p_occurred_at, now());
  v_has_access boolean := false;
  v_raw_actor_type text := null;
  v_actor_type text := null;
  v_is_full_recorder boolean := false;
  v_can_approve boolean := false;
  v_academic_year_id uuid;
  v_sup_count integer := 0;
  v_tx_type text;
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

  -- Determine auto-approval status based on rule allowed_approver_types AND caller approval authority
  IF CARDINALITY(v_rule.allowed_approver_types) = 0 OR v_rule.allowed_approver_types IS NULL THEN
    v_can_approve := true;
  ELSE
    -- Check 1: SUPER_ADMIN or PRINCIPAL
    IF public.has_app_role(v_caller_id, 'SUPER_ADMIN') OR public.has_app_role(v_caller_id, 'PRINCIPAL') THEN
      v_can_approve := true;
    END IF;

    -- Check 2: ADMIN in allowed_approver_types & caller has COMPETITION_APPROVE or COMPETITION_MANAGE
    IF NOT v_can_approve AND ('ADMIN' = ANY(v_rule.allowed_approver_types)) THEN
      IF public.has_competition_permission(v_caller_id, 'COMPETITION_APPROVE')
         OR public.has_competition_permission(v_caller_id, 'COMPETITION_MANAGE') THEN
        v_can_approve := true;
      END IF;
    END IF;

    -- Check 3: SUPERVISOR in allowed_approver_types & caller has supervisor assignment with can_approve_red_star
    IF NOT v_can_approve AND ('SUPERVISOR' = ANY(v_rule.allowed_approver_types)) THEN
      SELECT cp.academic_year_id INTO v_academic_year_id
      FROM public.competition_programs cp WHERE cp.id = p_program_id;

      SELECT count(*) INTO v_sup_count
      FROM public.competition_actor_assignments ca
      WHERE ca.user_id = v_caller_id
        AND ca.assignment_type = 'SUPERVISOR'
        AND ca.can_approve_red_star = true
        AND ca.academic_year_id = v_academic_year_id
        AND ca.is_active = true
        AND ca.start_date <= (v_occurred_at::date)
        AND (ca.end_date IS NULL OR ca.end_date >= (v_occurred_at::date))
        AND (
          (ca.assigned_class_id IS NULL AND ca.assigned_grade_level_id IS NULL)
          OR (ca.assigned_class_id IS NOT NULL AND ca.assigned_class_id = v_unit_id)
          OR (ca.assigned_grade_level_id IS NOT NULL AND v_unit_id IN (
            SELECT cl.id FROM public.classes cl WHERE cl.grade_level_id = ca.assigned_grade_level_id
          ))
        );

      IF v_sup_count > 0 THEN
        v_can_approve := true;
      END IF;
    END IF;
  END IF;

  IF v_can_approve THEN
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
        v_incident_id, NULL, v_unit_id, 'UNIT_COMPETITION',
        v_rule.unit_points, v_tx_type, 'POSTED', v_occurred_at, v_caller_id
      ) ON CONFLICT (incident_id, ledger_type) WHERE (incident_id IS NOT NULL AND transaction_type IN ('CREDIT', 'DEBIT')) DO NOTHING;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'id', v_incident_id,
    'status', v_status,
    'message', CASE WHEN v_status = 'APPROVED' THEN 'Đã ghi nhận và duyệt sự việc.' ELSE 'Đã ghi nhận sự việc và chuyển chờ duyệt.' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_competition_incident(uuid, uuid, uuid, uuid, timestamptz, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_competition_incident(uuid, uuid, uuid, uuid, timestamptz, text, text, text, jsonb) TO authenticated;

COMMIT;
