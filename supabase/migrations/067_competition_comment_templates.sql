-- Migration 067: Create competition_comment_templates table, RLS, and seed data

CREATE TABLE IF NOT EXISTS public.competition_comment_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  comment_type text NOT NULL CHECK (comment_type IN ('PRAISE', 'VIOLATION', 'NEUTRAL')),
  display_order integer NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.competition_comment_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "authenticated_select_comment_templates" ON public.competition_comment_templates;
DROP POLICY IF EXISTS "manage_comment_templates" ON public.competition_comment_templates;

-- Policy 1: Authenticated users can read
CREATE POLICY "authenticated_select_comment_templates"
ON public.competition_comment_templates
FOR SELECT
TO authenticated
USING (true);

-- Policy 2: COMPETITION_MANAGE permission holders can manage (FOR ALL)
CREATE POLICY "manage_comment_templates"
ON public.competition_comment_templates
FOR ALL
TO authenticated
USING (public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE'))
WITH CHECK (public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE'));

-- Seed 7 initial comment templates
INSERT INTO public.competition_comment_templates (code, title, content, comment_type, display_order)
VALUES
  ('PRAISE_GOOD_DISCIPLINE', 'Nề nếp tốt', 'Chi đội thực hiện tốt nề nếp và nội quy trong tuần.', 'PRAISE', 10),
  ('PRAISE_ACTIVE_PARTICIPATION', 'Tham gia tích cực', 'Chi đội tham gia tích cực các hoạt động và phong trào trong tuần.', 'PRAISE', 20),
  ('PRAISE_PROGRESS', 'Có tiến bộ', 'Chi đội có nhiều tiến bộ so với tuần trước.', 'PRAISE', 30),
  ('VIOLATION_DISCIPLINE', 'Cần cải thiện nề nếp', 'Chi đội còn một số hạn chế về nề nếp và cần khắc phục trong tuần tiếp theo.', 'VIOLATION', 40),
  ('VIOLATION_LATE', 'Còn tình trạng đi trễ', 'Chi đội còn học sinh đi trễ và cần tăng cường nhắc nhở.', 'VIOLATION', 50),
  ('VIOLATION_UNIFORM', 'Chưa thực hiện tốt đồng phục', 'Chi đội chưa thực hiện tốt quy định về đồng phục.', 'VIOLATION', 60),
  ('NEUTRAL_GENERAL', 'Nhận xét chung', 'Chi đội duy trì hoạt động thi đua trong tuần.', 'NEUTRAL', 100)
ON CONFLICT (code) DO NOTHING;
