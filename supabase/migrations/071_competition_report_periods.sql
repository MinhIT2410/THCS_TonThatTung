-- ============================================================
-- Migration 071
-- Extend competition_weekly_reports to support multi-period reports (Year, Semester, Month, Week)
-- ============================================================

BEGIN;

ALTER TABLE public.competition_weekly_reports
  ADD COLUMN IF NOT EXISTS period_type text NOT NULL DEFAULT 'WEEK',
  ADD COLUMN IF NOT EXISTS period_label text,
  ADD COLUMN IF NOT EXISTS period_start text,
  ADD COLUMN IF NOT EXISTS period_end text,
  ADD COLUMN IF NOT EXISTS semester integer,
  ADD COLUMN IF NOT EXISTS month integer;

COMMENT ON COLUMN public.competition_weekly_reports.period_type IS
  'Period type for report: YEAR, SEMESTER, MONTH, WEEK';

COMMENT ON COLUMN public.competition_weekly_reports.period_label IS
  'Human readable label for the report period (e.g., Học kỳ I - Năm học 2025-2026)';

COMMENT ON COLUMN public.competition_weekly_reports.period_start IS
  'Start date of the report period (YYYY-MM-DD)';

COMMENT ON COLUMN public.competition_weekly_reports.period_end IS
  'End date of the report period (YYYY-MM-DD)';

COMMIT;
