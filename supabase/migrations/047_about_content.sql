-- 047_about_content.sql
-- Migration: Create public.about_items and public.about_item_images for advanced About page structure

-- Create about_items table
CREATE TABLE IF NOT EXISTS public.about_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL,
  short_title text NULL,
  summary text NULL,
  content text NULL,
  cover_image_url text NULL,
  logo_url text NULL,
  icon_name text NULL,
  accent_color text NULL,
  item_type text NOT NULL DEFAULT 'TEAM',
  parent_id uuid NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  published_at timestamptz NULL,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT about_items_slug_unique UNIQUE (slug),
  CONSTRAINT about_items_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT about_items_title_length_check CHECK (length(title) <= 150),
  CONSTRAINT about_items_slug_not_empty CHECK (length(trim(slug)) > 0),
  CONSTRAINT about_items_slug_regex_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT about_items_summary_length_check CHECK (summary IS NULL OR length(summary) <= 500),
  CONSTRAINT about_items_accent_color_hex_check CHECK (accent_color IS NULL OR accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT about_items_parent_not_self CHECK (parent_id IS NULL OR parent_id <> id),
  CONSTRAINT about_items_item_type_check CHECK (item_type IN ('ORGANIZATION', 'SCHOOL_UNIT', 'TEAM', 'CLUB', 'OTHER')),
  CONSTRAINT about_items_display_order_check CHECK (display_order >= 0),
  CONSTRAINT about_items_parent_fk FOREIGN KEY (parent_id) REFERENCES public.about_items(id) ON DELETE SET NULL
);

-- Create about_item_images table for galleries
CREATE TABLE IF NOT EXISTS public.about_item_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  about_item_id uuid NOT NULL,
  image_url text NOT NULL,
  caption text NULL,
  alt_text text NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT about_item_images_about_item_fk FOREIGN KEY (about_item_id) REFERENCES public.about_items(id) ON DELETE CASCADE,
  CONSTRAINT about_item_images_display_order_check CHECK (display_order >= 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_about_items_slug ON public.about_items(slug);
CREATE INDEX IF NOT EXISTS idx_about_items_is_published ON public.about_items(is_published);
CREATE INDEX IF NOT EXISTS idx_about_items_display_order ON public.about_items(display_order);
CREATE INDEX IF NOT EXISTS idx_about_items_parent_id ON public.about_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_about_item_images_about_item_id ON public.about_item_images(about_item_id);

-- Create updated_at trigger for about_items
DROP TRIGGER IF EXISTS trg_about_items_updated_at ON public.about_items;
CREATE TRIGGER trg_about_items_updated_at
BEFORE UPDATE ON public.about_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.about_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.about_item_images ENABLE ROW LEVEL SECURITY;

-- Select policies
DROP POLICY IF EXISTS "Public can read published about items" ON public.about_items;
CREATE POLICY "Public can read published about items"
ON public.about_items FOR SELECT
USING (is_published = true OR (auth.uid() IS NOT NULL AND public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL', 'CONTENT_EDITOR'])));

DROP POLICY IF EXISTS "Public can read images of published about items" ON public.about_item_images;
CREATE POLICY "Public can read images of published about items"
ON public.about_item_images FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.about_items
    WHERE about_items.id = about_item_images.about_item_id
      AND (about_items.is_published = true OR (auth.uid() IS NOT NULL AND public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL', 'CONTENT_EDITOR'])))
  )
);

-- Manage policies (all other operations for admins/editors)
DROP POLICY IF EXISTS "CMS admins can manage about items" ON public.about_items;
CREATE POLICY "CMS admins can manage about items"
ON public.about_items FOR ALL
TO authenticated
USING (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL', 'CONTENT_EDITOR']))
WITH CHECK (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL', 'CONTENT_EDITOR']));

DROP POLICY IF EXISTS "CMS admins can manage about item images" ON public.about_item_images;
CREATE POLICY "CMS admins can manage about item images"
ON public.about_item_images FOR ALL
TO authenticated
USING (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL', 'CONTENT_EDITOR']))
WITH CHECK (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN', 'PRINCIPAL', 'CONTENT_EDITOR']));

-- Transactional secure RPC to replace gallery images safely in one transaction
CREATE OR REPLACE FUNCTION public.replace_about_item_images(
  p_about_item_id uuid,
  p_images jsonb
)
RETURNS SETOF public.about_item_images
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid;
  v_image record;
  v_display_order integer;
  v_image_url text;
  v_caption text;
  v_alt_text text;
BEGIN
  -- 1. Check authentication
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  -- 2. Check role CMS
  IF NOT public.has_any_app_role(v_uid, ARRAY['SUPER_ADMIN', 'PRINCIPAL', 'CONTENT_EDITOR']) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 3. Validate about item exists
  IF NOT EXISTS (SELECT 1 FROM public.about_items WHERE id = p_about_item_id) THEN
    RAISE EXCEPTION 'About item not found';
  END IF;

  -- 4. Delete old images
  DELETE FROM public.about_item_images WHERE about_item_id = p_about_item_id;

  -- 5. Loop and insert new images
  FOR v_image IN SELECT * FROM jsonb_to_recordset(p_images) AS x(image_url text, caption text, alt_text text, display_order integer) LOOP
    v_image_url := trim(v_image.image_url);
    IF v_image_url IS NULL OR v_image_url = '' THEN
      RAISE EXCEPTION 'Image URL cannot be empty';
    END IF;

    v_caption := trim(v_image.caption);
    v_alt_text := trim(v_image.alt_text);
    v_display_order := COALESCE(v_image.display_order, 0);

    IF v_display_order < 0 THEN
      RAISE EXCEPTION 'Display order must be greater than or equal to 0';
    END IF;

    INSERT INTO public.about_item_images (
      about_item_id,
      image_url,
      caption,
      alt_text,
      display_order
    ) VALUES (
      p_about_item_id,
      v_image_url,
      v_caption,
      v_alt_text,
      v_display_order
    );
  END LOOP;

  -- 6. Return the updated images
  RETURN QUERY SELECT * FROM public.about_item_images WHERE about_item_id = p_about_item_id ORDER BY display_order ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_about_item_images(uuid, jsonb) TO authenticated;

-- Prevent hierarchy cycles (A -> B -> C -> A) trigger
CREATE OR REPLACE FUNCTION public.check_about_items_cycle()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_id uuid;
  v_visited_ids uuid[];
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Initialize visited array with the current id
  v_visited_ids := ARRAY[NEW.id];
  v_parent_id := NEW.parent_id;

  -- Loop through ancestor hierarchy
  WHILE v_parent_id IS NOT NULL LOOP
    IF v_parent_id = ANY(v_visited_ids) THEN
      RAISE EXCEPTION 'Không thể thiết lập mục cha vì sẽ tạo vòng lặp phân cấp.';
    END IF;

    v_visited_ids := array_append(v_visited_ids, v_parent_id);

    SELECT parent_id INTO v_parent_id
    FROM public.about_items
    WHERE id = v_parent_id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_about_items_prevent_cycle ON public.about_items;
CREATE TRIGGER trg_about_items_prevent_cycle
BEFORE INSERT OR UPDATE OF parent_id ON public.about_items
FOR EACH ROW
EXECUTE FUNCTION public.check_about_items_cycle();
