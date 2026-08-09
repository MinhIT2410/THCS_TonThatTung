BEGIN;
ALTER TABLE public.competition_weekly_reports
  ADD COLUMN IF NOT EXISTS class_report_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS report_config jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.competition_weekly_reports
  DROP CONSTRAINT IF EXISTS competition_weekly_reports_class_report_rows_check,
  ADD CONSTRAINT competition_weekly_reports_class_report_rows_check
    CHECK (jsonb_typeof(class_report_rows) = 'array');
ALTER TABLE public.competition_weekly_reports
  DROP CONSTRAINT IF EXISTS competition_weekly_reports_report_config_check,
  ADD CONSTRAINT competition_weekly_reports_report_config_check
    CHECK (jsonb_typeof(report_config) = 'object');
COMMENT ON COLUMN public.competition_weekly_reports.class_report_rows IS
  'Frozen snapshot of class-by-class student violations breakdown at report creation time.';
COMMENT ON COLUMN public.competition_weekly_reports.report_config IS
  'Frozen snapshot of CMS report template configuration (header, titles, footer) at report creation time.';
COMMIT;
