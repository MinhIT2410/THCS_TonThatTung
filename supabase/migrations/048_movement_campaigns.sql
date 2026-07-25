-- 048_movement_campaigns.sql
-- Migration: Create tables, constraints, triggers, and security policies for Movement Campaigns (Hoạt động phong trào)

BEGIN;

-- =========================================================
-- 1. CAMPAIGNS TABLE (public.movement_campaigns)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.movement_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  summary text NULL,
  content text NULL,
  cover_image_url text NULL,
  campaign_type text NOT NULL DEFAULT 'theo_dot',
  start_date timestamptz NULL,
  end_date timestamptz NULL,
  status text NOT NULL DEFAULT 'draft',
  is_featured boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  academic_year text NOT NULL DEFAULT '2025-2026',
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT movement_campaigns_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT movement_campaigns_title_length_check CHECK (length(title) <= 200),
  CONSTRAINT movement_campaigns_slug_not_empty CHECK (length(trim(slug)) > 0),
  CONSTRAINT movement_campaigns_slug_regex_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT movement_campaigns_summary_length_check CHECK (summary IS NULL OR length(summary) <= 500),
  CONSTRAINT movement_campaigns_academic_year_check CHECK (academic_year ~ '^\d{4}-\d{4}$'),
  CONSTRAINT movement_campaigns_dates_check CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CONSTRAINT movement_campaigns_type_check CHECK (
    campaign_type IN ('thuong_xuyen', 'theo_dot', 'cuoc_thi', 'cao_diem', 'ke_hoach_thang')
  ),
  CONSTRAINT movement_campaigns_status_check CHECK (
    status IN ('draft', 'sap_dien_ra', 'dang_dien_ra', 'da_ket_thuc', 'archived')
  ),
  CONSTRAINT movement_campaigns_display_order_check CHECK (display_order >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_movement_campaigns_slug ON public.movement_campaigns(slug);
CREATE INDEX IF NOT EXISTS idx_movement_campaigns_status ON public.movement_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_movement_campaigns_published ON public.movement_campaigns(is_published);
CREATE INDEX IF NOT EXISTS idx_movement_campaigns_type ON public.movement_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_movement_campaigns_start_date ON public.movement_campaigns(start_date);
CREATE INDEX IF NOT EXISTS idx_movement_campaigns_display_order ON public.movement_campaigns(display_order);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_movement_campaigns_updated_at ON public.movement_campaigns;
CREATE TRIGGER trg_movement_campaigns_updated_at
BEFORE UPDATE ON public.movement_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Trigger for created_by and updated_by using auth.uid() with locked search_path
CREATE OR REPLACE FUNCTION public.set_movement_campaign_user_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
    NEW.updated_by := auth.uid();
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.created_by := OLD.created_by;
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_movement_campaigns_user_audit ON public.movement_campaigns;
CREATE TRIGGER trg_movement_campaigns_user_audit
BEFORE INSERT OR UPDATE ON public.movement_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.set_movement_campaign_user_audit();

-- =========================================================
-- 2. EVENTS TABLE (public.movement_events)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.movement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.movement_campaigns(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NULL,
  event_date timestamptz NULL,
  location text NULL,
  status text NOT NULL DEFAULT 'sap_dien_ra',
  cover_image_url text NULL,
  summary_result text NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT movement_events_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT movement_events_status_check CHECK (
    status IN ('sap_dien_ra', 'dang_dien_ra', 'da_hoan_thanh', 'huy')
  ),
  CONSTRAINT movement_events_display_order_check CHECK (display_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_movement_events_campaign_id ON public.movement_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_movement_events_event_date ON public.movement_events(event_date);

DROP TRIGGER IF EXISTS trg_movement_events_updated_at ON public.movement_events;
CREATE TRIGGER trg_movement_events_updated_at
BEFORE UPDATE ON public.movement_events
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 3. EVIDENCE TABLE (public.movement_evidence)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.movement_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.movement_campaigns(id) ON DELETE CASCADE,
  event_id uuid NULL REFERENCES public.movement_events(id) ON DELETE CASCADE,
  title text NOT NULL,
  evidence_type text NOT NULL DEFAULT 'image',
  url text NOT NULL,
  notes text NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT movement_evidence_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT movement_evidence_url_not_empty CHECK (length(trim(url)) > 0),
  CONSTRAINT movement_evidence_type_check CHECK (
    evidence_type IN ('image', 'news_link', 'document_link', 'album_link', 'other_link')
  ),
  CONSTRAINT movement_evidence_display_order_check CHECK (display_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_movement_evidence_campaign_id ON public.movement_evidence(campaign_id);
CREATE INDEX IF NOT EXISTS idx_movement_evidence_event_id ON public.movement_evidence(event_id);

-- Trigger to validate that if event_id is specified, it exists and belongs to the same campaign_id
CREATE OR REPLACE FUNCTION public.check_movement_evidence_event_campaign()
RETURNS TRIGGER AS $$
DECLARE
  v_event_campaign_id uuid;
BEGIN
  IF NEW.event_id IS NOT NULL THEN
    SELECT campaign_id INTO v_event_campaign_id
    FROM public.movement_events
    WHERE id = NEW.event_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Hoạt động được chọn không tồn tại.';
    END IF;

    IF v_event_campaign_id <> NEW.campaign_id THEN
      RAISE EXCEPTION 'Hoạt động được chọn không thuộc phong trào của minh chứng.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_movement_evidence_check_event ON public.movement_evidence;
CREATE TRIGGER trg_movement_evidence_check_event
BEFORE INSERT OR UPDATE OF campaign_id, event_id ON public.movement_evidence
FOR EACH ROW
EXECUTE FUNCTION public.check_movement_evidence_event_campaign();

-- =========================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES & PERMISSIONS
-- =========================================================

ALTER TABLE public.movement_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movement_evidence ENABLE ROW LEVEL SECURITY;

-- Clean up any legacy helper if existed
DROP FUNCTION IF EXISTS public.is_cms_manager();

-- Public SELECT Policy: Only read published campaigns that are NOT in draft status
DROP POLICY IF EXISTS "Public can read published movement campaigns" ON public.movement_campaigns;
CREATE POLICY "Public can read published movement campaigns"
ON public.movement_campaigns FOR SELECT
USING (
  (is_published = true AND status <> 'draft')
  OR (auth.uid() IS NOT NULL AND public.has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN', 'PRINCIPAL', 'CONTENT_EDITOR']))
);

DROP POLICY IF EXISTS "Public can read events of published movement campaigns" ON public.movement_events;
CREATE POLICY "Public can read events of published movement campaigns"
ON public.movement_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.movement_campaigns
    WHERE movement_campaigns.id = movement_events.campaign_id
      AND (
        (movement_campaigns.is_published = true AND movement_campaigns.status <> 'draft')
        OR (auth.uid() IS NOT NULL AND public.has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN', 'PRINCIPAL', 'CONTENT_EDITOR']))
      )
  )
);

DROP POLICY IF EXISTS "Public can read evidence of published movement campaigns" ON public.movement_evidence;
CREATE POLICY "Public can read evidence of published movement campaigns"
ON public.movement_evidence FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.movement_campaigns
    WHERE movement_campaigns.id = movement_evidence.campaign_id
      AND (
        (movement_campaigns.is_published = true AND movement_campaigns.status <> 'draft')
        OR (auth.uid() IS NOT NULL AND public.has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN', 'PRINCIPAL', 'CONTENT_EDITOR']))
      )
  )
);

-- Admin & Editor Management Policies for Campaigns
-- Split into INSERT/UPDATE (CMS managers) and DELETE (SUPER_ADMIN only)
DROP POLICY IF EXISTS "CMS managers can manage movement campaigns" ON public.movement_campaigns;
DROP POLICY IF EXISTS "CMS managers can insert movement campaigns" ON public.movement_campaigns;
DROP POLICY IF EXISTS "CMS managers can update movement campaigns" ON public.movement_campaigns;
DROP POLICY IF EXISTS "Only super admin can delete movement campaigns" ON public.movement_campaigns;

CREATE POLICY "CMS managers can insert movement campaigns"
ON public.movement_campaigns FOR INSERT
TO authenticated
WITH CHECK (public.has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN', 'PRINCIPAL', 'CONTENT_EDITOR']));

CREATE POLICY "CMS managers can update movement campaigns"
ON public.movement_campaigns FOR UPDATE
TO authenticated
USING (public.has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN', 'PRINCIPAL', 'CONTENT_EDITOR']))
WITH CHECK (public.has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN', 'PRINCIPAL', 'CONTENT_EDITOR']));

CREATE POLICY "Only super admin can delete movement campaigns"
ON public.movement_campaigns FOR DELETE
TO authenticated
USING (public.has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN']));

-- Management Policies for Events and Evidence (CMS managers)
DROP POLICY IF EXISTS "CMS managers can manage movement events" ON public.movement_events;
CREATE POLICY "CMS managers can manage movement events"
ON public.movement_events FOR ALL
TO authenticated
USING (public.has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN', 'PRINCIPAL', 'CONTENT_EDITOR']))
WITH CHECK (public.has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN', 'PRINCIPAL', 'CONTENT_EDITOR']));

DROP POLICY IF EXISTS "CMS managers can manage movement evidence" ON public.movement_evidence;
CREATE POLICY "CMS managers can manage movement evidence"
ON public.movement_evidence FOR ALL
TO authenticated
USING (public.has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN', 'PRINCIPAL', 'CONTENT_EDITOR']))
WITH CHECK (public.has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN', 'PRINCIPAL', 'CONTENT_EDITOR']));

-- Table Grants
GRANT SELECT ON public.movement_campaigns, public.movement_events, public.movement_evidence TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.movement_campaigns, public.movement_events, public.movement_evidence TO authenticated;

COMMIT;
