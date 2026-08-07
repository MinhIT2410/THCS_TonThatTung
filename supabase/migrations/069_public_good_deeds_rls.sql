-- Migration 069: Allow public (anon, authenticated) SELECT access for APPROVED competition incidents (Good Deeds)

-- 1. Update competition_incidents_select RLS policy
DROP POLICY IF EXISTS "competition_incidents_select" ON public.competition_incidents;

CREATE POLICY "competition_incidents_select" ON public.competition_incidents
  FOR SELECT TO anon, authenticated
  USING (
    status = 'APPROVED'
    OR (
      auth.uid() IS NOT NULL
      AND public.can_view_competition_incident(auth.uid(), id)
    )
  );

-- 2. Update competition_incident_evidence_select RLS policy
DROP POLICY IF EXISTS "competition_incident_evidence_select" ON public.competition_incident_evidence;

CREATE POLICY "competition_incident_evidence_select" ON public.competition_incident_evidence
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.competition_incidents ci
      WHERE ci.id = competition_incident_evidence.incident_id
        AND ci.status = 'APPROVED'
    )
    OR (
      auth.uid() IS NOT NULL
      AND public.can_view_competition_incident(auth.uid(), incident_id)
    )
  );

-- 3. Ensure competition_rules_select policy applies to anon and authenticated
DROP POLICY IF EXISTS "competition_rules_select" ON public.competition_rules;

CREATE POLICY "competition_rules_select" ON public.competition_rules
  FOR SELECT TO anon, authenticated
  USING (true);

-- 4. Ensure permissions are granted to anon and authenticated for SELECT
GRANT SELECT ON public.competition_incidents TO anon, authenticated;
GRANT SELECT ON public.competition_incident_evidence TO anon, authenticated;
GRANT SELECT ON public.competition_rules TO anon, authenticated;

-- 5. Re-confirm execute grant for get_public_good_deeds RPC
GRANT EXECUTE ON FUNCTION public.get_public_good_deeds(integer, integer) TO anon, authenticated;
