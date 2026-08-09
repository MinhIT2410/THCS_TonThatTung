BEGIN;

ALTER TABLE public.competition_weekly_reports
  ALTER COLUMN week_name DROP NOT NULL;

ALTER TABLE public.competition_weekly_reports
  ADD COLUMN IF NOT EXISTS period_type text NOT NULL DEFAULT 'WEEK',
  ADD COLUMN IF NOT EXISTS period_label text,
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date,
  ADD COLUMN IF NOT EXISTS semester integer,
  ADD COLUMN IF NOT EXISTS month integer;

ALTER TABLE public.competition_weekly_reports
  DROP CONSTRAINT IF EXISTS competition_weekly_reports_period_type_check,
  ADD CONSTRAINT competition_weekly_reports_period_type_check
    CHECK (period_type IN ('YEAR', 'SEMESTER', 'MONTH', 'WEEK'));

ALTER TABLE public.competition_weekly_reports
  DROP CONSTRAINT IF EXISTS competition_weekly_reports_semester_check,
  ADD CONSTRAINT competition_weekly_reports_semester_check
    CHECK (semester IS NULL OR semester IN (1, 2));

ALTER TABLE public.competition_weekly_reports
  DROP CONSTRAINT IF EXISTS competition_weekly_reports_month_check,
  ADD CONSTRAINT competition_weekly_reports_month_check
    CHECK (month IS NULL OR month BETWEEN 1 AND 12);

ALTER TABLE public.competition_weekly_reports
  DROP CONSTRAINT IF EXISTS competition_weekly_reports_period_range_check,
  ADD CONSTRAINT competition_weekly_reports_period_range_check
    CHECK (
      period_start IS NULL
      OR period_end IS NULL
      OR period_end >= period_start
    );

COMMENT ON COLUMN public.competition_weekly_reports.period_type IS
  'Report period type: YEAR, SEMESTER, MONTH, WEEK';

COMMENT ON COLUMN public.competition_weekly_reports.period_label IS
  'Human readable report period label';

COMMENT ON COLUMN public.competition_weekly_reports.period_start IS
  'Start date of the report period';

COMMENT ON COLUMN public.competition_weekly_reports.period_end IS
  'End date of the report period';

COMMIT;
