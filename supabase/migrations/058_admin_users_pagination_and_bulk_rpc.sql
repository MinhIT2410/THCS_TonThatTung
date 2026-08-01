BEGIN;

-- 058_admin_users_pagination_and_bulk_rpc.sql
-- Server-side pagination RPC for admin user management and bulk assignment RPC.

-- 1. Drop old function signatures if existed previously
DROP FUNCTION IF EXISTS public.bulk_assign_user_role(
  text,
  text,
  uuid[],
  boolean,
  boolean,
  text,
  boolean,
  text
);

DROP FUNCTION IF EXISTS public.bulk_assign_user_role(
  text,
  text,
  uuid[],
  text,
  text,
  boolean,
  boolean,
  boolean,
  boolean
);

DROP FUNCTION IF EXISTS public.get_admin_users_paginated(
  text,
  text,
  boolean,
  boolean,
  integer,
  integer
);

-- 2. Create indexes to speed up user searching and filtering
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles (full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles (is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_code ON public.user_roles (role_code);

-- 3. RPC get_admin_users_paginated
CREATE OR REPLACE FUNCTION public.get_admin_users_paginated(
  p_search text DEFAULT NULL,
  p_role_code text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_unassigned_only boolean DEFAULT false,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 50
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  roles text[],
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := case
    when p_page_size between 1 and 100 then p_page_size
    else 50
  end;
  v_offset integer;
  v_search text := nullif(trim(p_search), '');
  v_role_filter text := nullif(trim(p_role_code), '');
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Yêu cầu đăng nhập để thực hiện thao tác này.' USING errcode = '42501';
  END IF;

  -- Security check: Only SUPER_ADMIN and PRINCIPAL are allowed to view admin user list & login emails
  IF NOT (
    public.has_app_role(v_caller_id, 'SUPER_ADMIN') OR
    public.has_app_role(v_caller_id, 'PRINCIPAL')
  ) THEN
    RAISE EXCEPTION 'Quyền truy cập bị từ chối. Bạn không có quyền xem danh sách người dùng.' USING errcode = '42501';
  END IF;

  v_offset := (v_page - 1) * v_page_size;

  RETURN QUERY
  WITH filtered_users AS (
    SELECT
      p.id AS f_user_id,
      coalesce(p.full_name, 'Chưa cập nhật tên') AS f_full_name,
      au.email AS f_email,
      coalesce(p.is_active, true) AS f_is_active,
      p.created_at AS f_created_at,
      p.updated_at AS f_updated_at
    FROM public.profiles p
    LEFT JOIN auth.users au ON p.id = au.id
    WHERE
      -- Search term filter
      (v_search IS NULL OR (
        p.full_name ILIKE '%' || v_search || '%' OR
        au.email ILIKE '%' || v_search || '%' OR
        p.id::text ILIKE '%' || v_search || '%'
      ))
      -- Active status filter
      AND (p_is_active IS NULL OR p.is_active = p_is_active)
      -- Role & unassigned filter logic
      AND (
        ( (p_unassigned_only = true OR v_role_filter = 'unassigned')
          AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id)
        )
        OR
        ( p_unassigned_only = false
          AND (
            v_role_filter IS NULL OR v_role_filter = 'all'
            OR (v_role_filter = 'unassigned' AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id))
            OR (v_role_filter <> 'unassigned' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role_code = v_role_filter))
          )
        )
      )
  ),
  user_roles_mapped AS (
    SELECT
      fu.f_user_id AS user_id,
      fu.f_full_name AS full_name,
      fu.f_email AS email,
      fu.f_is_active AS is_active,
      fu.f_created_at AS created_at,
      fu.f_updated_at AS updated_at,
      coalesce(
        (SELECT array_agg(ur.role_code ORDER BY ur.role_code)
         FROM public.user_roles ur
         WHERE ur.user_id = fu.f_user_id),
        ARRAY[]::text[]
      ) AS roles
    FROM filtered_users fu
  ),
  counted AS (
    SELECT
      urm.*,
      count(*) OVER() AS total_count
    FROM user_roles_mapped urm
  )
  SELECT
    c.user_id,
    c.full_name,
    c.email,
    c.roles,
    c.is_active,
    c.created_at,
    c.updated_at,
    c.total_count
  FROM counted c
  ORDER BY c.created_at DESC NULLS LAST, c.full_name
  LIMIT v_page_size
  OFFSET v_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_users_paginated(text, text, boolean, boolean, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_users_paginated(text, text, boolean, boolean, integer, integer) TO authenticated;

-- 4. RPC bulk_assign_user_role
CREATE OR REPLACE FUNCTION public.bulk_assign_user_role(
  p_role_code text,
  p_selection_mode text DEFAULT 'PAGE_SELECTION',
  p_user_ids uuid[] DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_filter_role_code text DEFAULT NULL,
  p_filter_is_active boolean DEFAULT NULL,
  p_unassigned_only boolean DEFAULT false,
  p_only_without_roles boolean DEFAULT false,
  p_require_student_identity boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_matched_count bigint := 0;
  v_inserted_count bigint := 0;
  v_skipped_count bigint := 0;
  v_has_permission boolean := false;
  v_sanitized_role text;
  v_sanitized_search text;
  v_sanitized_filter_role text;
BEGIN
  -- 1. Verify login
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Yêu cầu đăng nhập để thực hiện thao tác này.' USING errcode = '42501';
  END IF;

  -- 2. Verify authorization: Only SUPER_ADMIN and PRINCIPAL
  v_has_permission := public.has_app_role(v_caller_id, 'SUPER_ADMIN') OR
                       public.has_app_role(v_caller_id, 'PRINCIPAL');

  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Quyền truy cập bị từ chối. Bạn không có quyền quản lý vai trò người dùng.' USING errcode = '42501';
  END IF;

  -- 3. Validate p_role_code: Currently only supports STUDENT
  v_sanitized_role := trim(p_role_code);
  IF v_sanitized_role <> 'STUDENT' THEN
    RAISE EXCEPTION 'Chức năng hàng loạt hiện chỉ hỗ trợ gán vai trò Học sinh.' USING errcode = 'P0001';
  END IF;

  -- 4. Validate p_selection_mode
  IF p_selection_mode NOT IN ('PAGE_SELECTION', 'PAGE', 'FILTERED_ALL') THEN
    RAISE EXCEPTION 'Chế độ lựa chọn "%" không hợp lệ.', p_selection_mode USING errcode = 'P0001';
  END IF;

  v_sanitized_search := nullif(trim(p_search), '');
  v_sanitized_filter_role := nullif(trim(p_filter_role_code), '');

  -- 5. Gather target user IDs matching selection and mandatory DB constraints
  CREATE TEMP TABLE tmp_bulk_target_users ON COMMIT DROP AS
  SELECT p.id
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  WHERE
    (
      -- Selection by page UUID array
      (p_selection_mode IN ('PAGE_SELECTION', 'PAGE') AND p_user_ids IS NOT NULL AND p.id = ANY(p_user_ids))
      OR
      -- Selection by FILTERED_ALL with mandatory database restrictions
      (
        p_selection_mode = 'FILTERED_ALL' AND
        (v_sanitized_search IS NULL OR p.full_name ILIKE '%' || v_sanitized_search || '%' OR au.email ILIKE '%' || v_sanitized_search || '%' OR p.id::text ILIKE '%' || v_sanitized_search || '%') AND
        (p_filter_is_active IS NULL OR p.is_active = p_filter_is_active) AND
        (
          p_unassigned_only = true OR v_sanitized_filter_role = 'unassigned' OR
          (v_sanitized_filter_role IS NULL OR v_sanitized_filter_role = 'all' OR
          EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role_code = v_sanitized_filter_role))
        ) AND
        -- Mandatory constraint 1: Target account MUST NOT have any existing roles in user_roles
        NOT EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = p.id
        ) AND
        -- Mandatory constraint 2: Target account MUST have student_code or exist in student_enrollments
        (
          nullif(trim(p.student_code), '') IS NOT NULL
          OR EXISTS (
            SELECT 1
            FROM public.student_enrollments se
            WHERE se.student_id = p.id
          )
        )
      )
    )
    AND (
      NOT p_only_without_roles OR NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id)
    )
    AND (
      NOT p_require_student_identity OR (
        nullif(trim(p.student_code), '') IS NOT NULL OR
        EXISTS (SELECT 1 FROM public.student_enrollments se WHERE se.student_id = p.id)
      )
    );

  SELECT count(*) INTO v_matched_count FROM tmp_bulk_target_users;

  -- 6. Insert set-based
  IF v_matched_count > 0 THEN
    WITH inserted_rows AS (
      INSERT INTO public.user_roles (
        user_id,
        role_code,
        created_by,
        created_at
      )
      SELECT
        t.id,
        'STUDENT',
        v_caller_id,
        now()
      FROM tmp_bulk_target_users t
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = t.id
          AND ur.role_code = 'STUDENT'
      )
      RETURNING user_id
    )
    SELECT count(*) INTO v_inserted_count FROM inserted_rows;
  END IF;

  v_skipped_count := v_matched_count - v_inserted_count;

  RETURN jsonb_build_object(
    'matched_count', v_matched_count,
    'inserted_count', v_inserted_count,
    'skipped_count', v_skipped_count,
    'role_code', 'STUDENT'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.bulk_assign_user_role(text, text, uuid[], text, text, boolean, boolean, boolean, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_assign_user_role(text, text, uuid[], text, text, boolean, boolean, boolean, boolean) TO authenticated;

COMMIT;
