-- Migration 054: Allow anonymous users to view active competition programs, academic years, and classes
-- Reason: Public pages under /thi-dua display active programs, published weeks, and unit leaderboards to visitors without login.

GRANT SELECT ON public.competition_programs TO anon;
GRANT SELECT ON public.academic_years TO anon;
GRANT SELECT ON public.classes TO anon;

DROP POLICY IF EXISTS "competition_programs_anon_select" ON public.competition_programs;
CREATE POLICY "competition_programs_anon_select" ON public.competition_programs
  FOR SELECT TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS "academic_years_anon_select" ON public.academic_years;
CREATE POLICY "academic_years_anon_select" ON public.academic_years
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "classes_anon_select" ON public.classes;
CREATE POLICY "classes_anon_select" ON public.classes
  FOR SELECT TO anon
  USING (true);

