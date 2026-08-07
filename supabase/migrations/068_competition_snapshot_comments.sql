-- Migration 068: Add comment_text to competition_public_unit_snapshots and enforce comment publishing rules

-- 1. Add comment_text column to competition_public_unit_snapshots
ALTER TABLE public.competition_public_unit_snapshots 
  ADD COLUMN IF NOT EXISTS comment_text text NOT NULL DEFAULT 'Chưa có nhận xét';

-- 2. Update publish_snapshots_for_academic_year function to publish comments ONLY for locked/published weeks
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

  -- A. Snapshot Class/Unit Rankings for started weeks in programs under p_academic_year_id
  FOR v_week IN
    SELECT cw.*
    FROM public.competition_weeks cw
    JOIN public.competition_programs cp ON cp.id = cw.program_id
    WHERE cp.academic_year_id = p_academic_year_id
      AND cw.starts_on <= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
  LOOP
    -- Calculate strict week bounds in Asia/Ho_Chi_Minh time
    v_start_ts := v_week.starts_on::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh';
    v_end_ts := ((v_week.ends_on + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') - interval '1 microsecond';

    -- Ensure units exist in competition_week_units for this week
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
      comment_text,
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
        (cwu.starting_points + cwu.manual_bonus_points - cwu.manual_penalty_points + COALESCE(SUM(CASE WHEN COALESCE(t.program_id, inc.program_id) = v_week.program_id THEN t.points ELSE 0 END), 0))::integer AS calc_final_points,
        CASE
          WHEN v_week.status IN ('LOCKED', 'PUBLISHED')
          THEN COALESCE(NULLIF(TRIM(cwu.comment), ''), 'Chưa có nhận xét')
          ELSE 'Chưa có nhận xét'
        END AS calc_comment_text
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
      GROUP BY cwu.unit_id, c.name, c.grade_level_id, gl.name, cwu.starting_points, cwu.manual_bonus_points, cwu.manual_penalty_points, cwu.comment
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
      calc_comment_text,
      v_now
    FROM unit_ranked;

    v_published_weeks_count := v_published_weeks_count + 1;
  END LOOP;

  -- B. Snapshot Top 5 Student Rewards for p_academic_year_id
  DELETE FROM public.competition_public_student_snapshots
  WHERE academic_year_id = p_academic_year_id;

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
    GROUP BY t.student_id
  ),
  student_ranked AS (
    SELECT
      s.student_id,
      sau.full_name,
      sau.class_name AS unit_name,
      s.total_points,
      DENSE_RANK() OVER (ORDER BY s.total_points DESC, sau.full_name ASC)::integer AS calculated_rank
    FROM student_total_rewards s
    JOIN student_active_units sau ON sau.student_id = s.student_id
    WHERE s.total_points > 0
  )
  SELECT
    p_academic_year_id,
    student_id,
    full_name,
    unit_name,
    total_points,
    calculated_rank,
    v_now
  FROM student_ranked
  WHERE calculated_rank <= 5;

  RETURN jsonb_build_object(
    'success', true,
    'published_weeks_count', v_published_weeks_count,
    'published_at', v_now
  );
END;
$$;

-- 3. Update lock_competition_week RPC to immediately regenerate snapshots upon locking
CREATE OR REPLACE FUNCTION public.lock_competition_week(p_week_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_week record;
  v_academic_year_id uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL OR NOT public.has_competition_permission(v_caller_id, 'COMPETITION_WEEK_MANAGE') THEN
    RAISE EXCEPTION 'Quyền truy cập bị từ chối.' USING ERRCODE = '42501';
  END IF;

  SELECT cw.*, cp.academic_year_id INTO v_week 
  FROM public.competition_weeks cw
  JOIN public.competition_programs cp ON cp.id = cw.program_id
  WHERE cw.id = p_week_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy tuần thi đua.' USING ERRCODE = 'P0002';
  END IF;

  IF v_week.status <> 'OPEN' THEN
    RAISE EXCEPTION 'Tuần thi đua không ở trạng thái mở (Trạng thái hiện tại: %).', v_week.status USING ERRCODE = 'P0003';
  END IF;

  UPDATE public.competition_weeks
  SET status = 'LOCKED',
      locked_by = v_caller_id,
      locked_at = now(),
      updated_at = now()
  WHERE id = p_week_id;

  -- Immediately regenerate snapshots for the academic year so locked comments are copied to public
  IF v_week.academic_year_id IS NOT NULL THEN
    PERFORM public.publish_snapshots_for_academic_year(v_week.academic_year_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Đã khóa tuần thi đua và cập nhật nhận xét công khai.');
END;
$$;

-- 4. Update unlock_competition_week RPC to immediately regenerate snapshots upon unlocking
CREATE OR REPLACE FUNCTION public.unlock_competition_week(p_week_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_week record;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL OR NOT public.has_competition_permission(v_caller_id, 'COMPETITION_WEEK_MANAGE') THEN
    RAISE EXCEPTION 'Quyền truy cập bị từ chối.' USING ERRCODE = '42501';
  END IF;

  SELECT cw.*, cp.academic_year_id INTO v_week
  FROM public.competition_weeks cw
  JOIN public.competition_programs cp ON cp.id = cw.program_id
  WHERE cw.id = p_week_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy tuần thi đua.' USING ERRCODE = 'P0002';
  END IF;

  IF v_week.status <> 'LOCKED' AND v_week.status <> 'PUBLISHED' THEN
    RAISE EXCEPTION 'Tuần thi đua không ở trạng thái bị khóa hoặc công bố (Trạng thái hiện tại: %).', v_week.status USING ERRCODE = 'P0003';
  END IF;

  UPDATE public.competition_weeks
  SET status = 'OPEN',
      locked_by = NULL,
      locked_at = NULL,
      updated_at = now()
  WHERE id = p_week_id;

  -- Immediately regenerate snapshots for the academic year so comments revert to 'Chưa có nhận xét'
  IF v_week.academic_year_id IS NOT NULL THEN
    PERFORM public.publish_snapshots_for_academic_year(v_week.academic_year_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Đã mở lại tuần thi đua.');
END;
$$;
