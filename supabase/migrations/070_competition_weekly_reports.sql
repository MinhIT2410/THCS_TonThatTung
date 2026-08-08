-- ============================================================
-- Migration 070
-- Weekly competition report snapshots
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.competition_weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Snapshot references.
  -- SET NULL để biên bản lịch sử không bị xóa theo dữ liệu nguồn.
  academic_year_id uuid
    REFERENCES public.academic_years(id)
    ON DELETE SET NULL,

  academic_year_name text NOT NULL,

  week_id uuid
    REFERENCES public.competition_weeks(id)
    ON DELETE SET NULL,

  week_name text NOT NULL,

  -- NULL = báo cáo toàn trường / tất cả khối.
  grade_level_id uuid
    REFERENCES public.grade_levels(id)
    ON DELETE SET NULL,

  grade_name text NOT NULL,

  total_violations integer NOT NULL DEFAULT 0
    CHECK (total_violations >= 0),

  -- Snapshot thống kê tại thời điểm lưu.
  violation_stats jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(violation_stats) = 'array'),

  supervisor_notes text NOT NULL DEFAULT '',

  created_by uuid
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  creator_name text NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.competition_weekly_reports IS
  'Immutable snapshots of weekly competition violation reports.';

COMMENT ON COLUMN public.competition_weekly_reports.violation_stats IS
  'Frozen JSON snapshot of violation statistics and top violating classes at report creation time.';

COMMENT ON COLUMN public.competition_weekly_reports.grade_level_id IS
  'NULL means all grade levels / school-wide report.';


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_comp_weekly_reports_year_week
  ON public.competition_weekly_reports (
    academic_year_id,
    week_id
  );

CREATE INDEX IF NOT EXISTS idx_comp_weekly_reports_grade
  ON public.competition_weekly_reports (
    grade_level_id
  );

CREATE INDEX IF NOT EXISTS idx_comp_weekly_reports_created_by
  ON public.competition_weekly_reports (
    created_by
  );

CREATE INDEX IF NOT EXISTS idx_comp_weekly_reports_created_at
  ON public.competition_weekly_reports (
    created_at DESC
  );


-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.competition_weekly_reports
ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- SELECT
--
-- Được xem nếu:
-- 1. COMPETITION_MANAGE / COMPETITION_WEEK_MANAGE -> toàn bộ
-- 2. Chính người tạo báo cáo
-- 3. Giám thị đang được phân công hợp lệ:
--    - đúng năm học
--    - SUPERVISOR
--    - active
--    - trong thời hạn
--    - can_record_incident = true
--    - đúng khối được phân công
--    - hoặc assignment toàn trường
-- ------------------------------------------------------------

DROP POLICY IF EXISTS
  "competition_weekly_reports_select"
ON public.competition_weekly_reports;

CREATE POLICY "competition_weekly_reports_select"
ON public.competition_weekly_reports
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    public.has_competition_permission(
      auth.uid(),
      'COMPETITION_MANAGE'
    )

    OR public.has_competition_permission(
      auth.uid(),
      'COMPETITION_WEEK_MANAGE'
    )

    OR created_by = auth.uid()

    OR EXISTS (
      SELECT 1
      FROM public.competition_actor_assignments ca
      WHERE ca.user_id = auth.uid()
        AND ca.assignment_type = 'SUPERVISOR'
        AND ca.is_active = true
        AND ca.can_record_incident = true

        -- Báo cáo phải thuộc đúng năm học được phân công.
        AND (
          competition_weekly_reports.academic_year_id IS NULL
          OR ca.academic_year_id =
             competition_weekly_reports.academic_year_id
        )

        AND ca.start_date <= CURRENT_DATE
        AND (
          ca.end_date IS NULL
          OR ca.end_date >= CURRENT_DATE
        )

        AND (
          -- Giám thị toàn trường.
          (
            ca.assigned_class_id IS NULL
            AND ca.assigned_grade_level_id IS NULL
          )

          -- Giám thị được giao đúng khối.
          OR (
            ca.assigned_grade_level_id IS NOT NULL
            AND competition_weekly_reports.grade_level_id
                = ca.assigned_grade_level_id
          )
        )
    )
  )
);


-- ------------------------------------------------------------
-- INSERT
--
-- Người tạo bắt buộc phải là chính auth.uid().
--
-- Được lưu nếu:
-- 1. Competition Manager / Week Manager
-- 2. Giám thị active đúng khối.
--
-- Giám thị phụ trách một khối KHÔNG được tạo báo cáo
-- "Tất cả khối" (grade_level_id IS NULL).
-- Chỉ assignment toàn trường hoặc Manager mới làm được.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS
  "competition_weekly_reports_insert"
ON public.competition_weekly_reports;

CREATE POLICY "competition_weekly_reports_insert"
ON public.competition_weekly_reports
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND created_by = auth.uid()

  AND (
    public.has_competition_permission(
      auth.uid(),
      'COMPETITION_MANAGE'
    )

    OR public.has_competition_permission(
      auth.uid(),
      'COMPETITION_WEEK_MANAGE'
    )

    OR EXISTS (
      SELECT 1
      FROM public.competition_actor_assignments ca
      WHERE ca.user_id = auth.uid()
        AND ca.assignment_type = 'SUPERVISOR'
        AND ca.is_active = true
        AND ca.can_record_incident = true
        AND ca.academic_year_id =
            competition_weekly_reports.academic_year_id

        AND ca.start_date <= CURRENT_DATE
        AND (
          ca.end_date IS NULL
          OR ca.end_date >= CURRENT_DATE
        )

        AND (
          -- Giám thị toàn trường:
          -- được lưu báo cáo toàn trường hoặc từng khối.
          (
            ca.assigned_class_id IS NULL
            AND ca.assigned_grade_level_id IS NULL
          )

          -- Giám thị phụ trách khối:
          -- chỉ được lưu đúng khối đó.
          OR (
            ca.assigned_grade_level_id IS NOT NULL
            AND competition_weekly_reports.grade_level_id
                = ca.assigned_grade_level_id
          )
        )
    )
  )
);


-- ------------------------------------------------------------
-- UPDATE
--
-- Snapshot đã lưu là bất biến.
-- Không tạo UPDATE policy.
-- ------------------------------------------------------------


-- ------------------------------------------------------------
-- DELETE
--
-- Chỉ người quản lý thi đua / quản lý tuần được xóa báo cáo.
-- Giám thị không thể sửa hoặc xóa biên bản đã lưu.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS
  "competition_weekly_reports_delete"
ON public.competition_weekly_reports;

CREATE POLICY "competition_weekly_reports_delete"
ON public.competition_weekly_reports
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    public.has_competition_permission(
      auth.uid(),
      'COMPETITION_MANAGE'
    )
    OR public.has_competition_permission(
      auth.uid(),
      'COMPETITION_WEEK_MANAGE'
    )
  )
);


-- ============================================================
-- TABLE PRIVILEGES
-- ============================================================

REVOKE ALL
ON TABLE public.competition_weekly_reports
FROM anon;

REVOKE UPDATE
ON TABLE public.competition_weekly_reports
FROM authenticated;

GRANT SELECT, INSERT, DELETE
ON TABLE public.competition_weekly_reports
TO authenticated;


COMMIT;
