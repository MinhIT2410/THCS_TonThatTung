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

COMMIT;
