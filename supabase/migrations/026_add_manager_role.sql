-- ============================================================
-- Manager role: profiles.role + board/comment permissions
--
-- Roles: member | manager | admin | super_admin
--
-- manager:
--   - write/upload on all boards
--   - edit/delete/hide own posts only
--   - delete/hide any comments
--   - no member mgmt / CMS / system settings
--
-- admin (+ existing):
--   - full board post management
--   - CMS access (content RPCs)
-- ============================================================

-- ---------- 1) profiles.role CHECK ----------
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('member', 'manager', 'admin', 'super_admin'));

-- ---------- 2) Helper functions ----------
CREATE OR REPLACE FUNCTION public.is_board_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND lower(trim(role)) IN ('admin', 'super_admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_board_admin() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_board_writer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND lower(trim(role)) IN ('manager', 'admin', 'super_admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_board_writer() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_comment_moderator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND lower(trim(role)) IN ('manager', 'admin', 'super_admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_comment_moderator() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_cms_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND lower(trim(role)) IN ('admin', 'super_admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_cms_admin() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.assert_cms_admin()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  IF NOT public.is_cms_admin() THEN
    RAISE EXCEPTION '접근 권한이 없습니다.';
  END IF;

  RETURN v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assert_cms_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.can_manage_board_post(p_author_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_board_admin()
    OR (
      public.is_board_writer()
      AND p_author_id IS NOT NULL
      AND p_author_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_board_post(uuid) TO authenticated;

-- ---------- 3) board_posts RLS ----------
DROP POLICY IF EXISTS "Anyone can read board posts" ON public.board_posts;
CREATE POLICY "Anyone can read board posts"
  ON public.board_posts
  FOR SELECT
  TO anon, authenticated
  USING (
    (
      deleted_at IS NULL
      AND status = 'public'
    )
    OR public.is_board_admin()
    OR (
      author_id = auth.uid()
      AND deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Admins can insert board posts" ON public.board_posts;
DROP POLICY IF EXISTS "Board writers can insert board posts" ON public.board_posts;
CREATE POLICY "Board writers can insert board posts"
  ON public.board_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_board_writer());

DROP POLICY IF EXISTS "Admins can update board posts" ON public.board_posts;
DROP POLICY IF EXISTS "Board staff can update board posts" ON public.board_posts;
CREATE POLICY "Board staff can update board posts"
  ON public.board_posts
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_board_post(author_id))
  WITH CHECK (public.can_manage_board_post(author_id));

DROP POLICY IF EXISTS "Admins can delete board posts" ON public.board_posts;
DROP POLICY IF EXISTS "Board staff can delete board posts" ON public.board_posts;
CREATE POLICY "Board staff can delete board posts"
  ON public.board_posts
  FOR DELETE
  TO authenticated
  USING (public.can_manage_board_post(author_id));

-- ---------- 4) Storage (board-uploads) ----------
DROP POLICY IF EXISTS "Admins can upload board files" ON storage.objects;
DROP POLICY IF EXISTS "Board writers can upload board files" ON storage.objects;
CREATE POLICY "Board writers can upload board files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'board-uploads'
    AND public.is_board_writer()
  );

DROP POLICY IF EXISTS "Admins can update board files" ON storage.objects;
DROP POLICY IF EXISTS "Board writers can update board files" ON storage.objects;
CREATE POLICY "Board writers can update board files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'board-uploads' AND public.is_board_writer())
  WITH CHECK (bucket_id = 'board-uploads' AND public.is_board_writer());

DROP POLICY IF EXISTS "Admins can delete board files" ON storage.objects;
DROP POLICY IF EXISTS "Board writers can delete board files" ON storage.objects;
CREATE POLICY "Board writers can delete board files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'board-uploads' AND public.is_board_writer());

-- ---------- 5) board_comments RLS ----------
DROP POLICY IF EXISTS "Anyone can read visible comments" ON public.board_comments;
CREATE POLICY "Anyone can read visible comments"
  ON public.board_comments
  FOR SELECT
  TO anon, authenticated
  USING (
    (
      deleted_at IS NULL
      AND is_hidden = false
    )
    OR auth.uid() = user_id
    OR public.is_comment_moderator()
  );

DROP POLICY IF EXISTS "Admins can update comments" ON public.board_comments;
DROP POLICY IF EXISTS "Comment moderators can update comments" ON public.board_comments;
CREATE POLICY "Comment moderators can update comments"
  ON public.board_comments
  FOR UPDATE
  TO authenticated
  USING (public.is_comment_moderator())
  WITH CHECK (public.is_comment_moderator());

DROP POLICY IF EXISTS "Admins can delete comments" ON public.board_comments;
DROP POLICY IF EXISTS "Comment moderators can delete comments" ON public.board_comments;
CREATE POLICY "Comment moderators can delete comments"
  ON public.board_comments
  FOR DELETE
  TO authenticated
  USING (public.is_comment_moderator());

-- ---------- 6) Soft-delete RPCs ----------
CREATE OR REPLACE FUNCTION public.soft_delete_board_post(p_post_type text, p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id uuid;
BEGIN
  SELECT author_id
  INTO v_author_id
  FROM public.board_posts
  WHERE post_type = p_post_type
    AND id = p_post_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION '게시글을 찾을 수 없습니다.';
  END IF;

  IF NOT public.can_manage_board_post(v_author_id) THEN
    RAISE EXCEPTION '권한이 없습니다.';
  END IF;

  UPDATE public.board_posts
  SET
    deleted_at = now(),
    deleted_by = auth.uid()
  WHERE post_type = p_post_type
    AND id = p_post_id
    AND deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_board_post(text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.soft_delete_board_comment(p_comment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  UPDATE public.board_comments
  SET
    deleted_at = now(),
    deleted_by = auth.uid(),
    is_hidden = true
  WHERE id = p_comment_id
    AND deleted_at IS NULL
    AND (
      user_id = auth.uid()
      OR public.is_comment_moderator()
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION '댓글을 삭제할 수 없습니다.';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_board_comment(uuid) TO authenticated;

-- ---------- 7) Member role update (allow manager) ----------
CREATE OR REPLACE FUNCTION public.update_member_role_by_super_admin(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid uuid;
  v_target_user_id uuid;
  v_target_member_role text;
  v_new_member_role text;
  v_raw_new_role text;
BEGIN
  v_caller_uid := auth.uid();

  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles AS caller
    WHERE caller.user_id = v_caller_uid
      AND lower(trim(caller.role)) = 'super_admin'
  ) THEN
    RAISE EXCEPTION '접근 권한이 없습니다. (현재 role: %)',
      coalesce(
        (
          SELECT lower(trim(caller.role))
          FROM public.profiles AS caller
          WHERE caller.user_id = v_caller_uid
        ),
        '없음'
      );
  END IF;

  IF p_payload IS NULL THEN
    RAISE EXCEPTION '요청 데이터가 없습니다.';
  END IF;

  v_target_user_id := nullif(trim(p_payload->>'target_user_id'), '')::uuid;
  v_raw_new_role := p_payload->>'new_role';

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION '대상 회원 ID가 없습니다. (payload: %)', p_payload::text;
  END IF;

  v_new_member_role := lower(trim(coalesce(v_raw_new_role, '')));

  IF v_new_member_role NOT IN ('member', 'manager', 'admin') THEN
    RAISE EXCEPTION '변경할 수 없는 권한입니다. (요청 role: %)', coalesce(v_raw_new_role, 'NULL');
  END IF;

  SELECT lower(trim(target.role))
  INTO v_target_member_role
  FROM public.profiles AS target
  WHERE target.user_id = v_target_user_id;

  IF v_target_member_role IS NULL THEN
    RAISE EXCEPTION '회원을 찾을 수 없습니다. (user_id: %)', v_target_user_id;
  END IF;

  IF v_target_member_role = 'super_admin' THEN
    RAISE EXCEPTION '최고관리자 권한은 변경할 수 없습니다.';
  END IF;

  IF v_target_member_role NOT IN ('member', 'manager', 'admin') THEN
    RAISE EXCEPTION '변경할 수 없는 권한입니다. (현재 role: %)', v_target_member_role;
  END IF;

  IF v_target_member_role = v_new_member_role THEN
    RAISE EXCEPTION '이미 % 권한입니다.', v_new_member_role;
  END IF;

  UPDATE public.profiles AS target
  SET role = v_new_member_role
  WHERE target.user_id = v_target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_member_role_by_super_admin(jsonb) TO authenticated;

-- ---------- 8) Member list sort order ----------
CREATE OR REPLACE FUNCTION public.list_profiles_for_super_admin(p_search text DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  username text,
  name text,
  email text,
  role text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION '접근 권한이 없습니다.';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.username,
    p.name,
    p.email,
    lower(trim(p.role)) AS role,
    p.created_at
  FROM public.profiles AS p
  WHERE (
    p_search IS NULL
    OR trim(p_search) = ''
    OR p.name ILIKE '%' || trim(p_search) || '%'
    OR p.email ILIKE '%' || trim(p_search) || '%'
  )
  ORDER BY
    CASE lower(trim(p.role))
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'manager' THEN 3
      WHEN 'member' THEN 4
      ELSE 5
    END,
    p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_profiles_for_super_admin(text) TO authenticated;

-- ---------- 9) CMS RPCs: allow admin (assert_cms_admin) ----------
CREATE OR REPLACE FUNCTION public.list_content_posts_for_super_admin(p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE (
  id uuid,
  post_type text,
  board_label text,
  title text,
  thumbnail text,
  has_image boolean,
  writer text,
  author_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  views_count bigint,
  comments_count bigint,
  likes_count bigint,
  status text,
  is_notice boolean,
  deleted_at timestamptz,
  has_attachment boolean,
  has_admin_note boolean,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search text := lower(trim(coalesce(p_payload->>'search', '')));
  v_search_field text := lower(trim(coalesce(p_payload->>'search_field', 'all')));
  v_post_type text := nullif(trim(coalesce(p_payload->>'post_type', '')), '');
  v_status text := lower(trim(coalesce(p_payload->>'status', 'all')));
  v_has_image boolean := CASE
    WHEN lower(coalesce(p_payload->>'has_image', '')) IN ('1', 'true', 'yes') THEN true
    ELSE NULL
  END;
  v_has_attachment boolean := CASE
    WHEN lower(coalesce(p_payload->>'has_attachment', '')) IN ('1', 'true', 'yes') THEN true
    ELSE NULL
  END;
  v_date_from timestamptz := NULL;
  v_date_to timestamptz := NULL;
  v_sort text := lower(trim(coalesce(p_payload->>'sort', 'newest')));
  v_limit int := greatest(1, least(100, coalesce((p_payload->>'limit')::int, 20)));
  v_offset int := greatest(0, coalesce((p_payload->>'offset')::int, 0));
  v_period text := lower(trim(coalesce(p_payload->>'period', '')));
BEGIN
  PERFORM public.assert_cms_admin();

  IF p_payload ? 'date_from' AND nullif(trim(p_payload->>'date_from'), '') IS NOT NULL THEN
    v_date_from := (p_payload->>'date_from')::timestamptz;
  END IF;

  IF p_payload ? 'date_to' AND nullif(trim(p_payload->>'date_to'), '') IS NOT NULL THEN
    v_date_to := (p_payload->>'date_to')::timestamptz;
  END IF;

  IF v_period = 'today' THEN
    v_date_from := date_trunc('day', timezone('Asia/Seoul', now()));
    v_date_to := NULL;
  ELSIF v_period = '7d' THEN
    v_date_from := now() - interval '7 days';
  ELSIF v_period = '30d' THEN
    v_date_from := now() - interval '30 days';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      p.id,
      p.post_type,
      public.board_type_label(p.post_type) AS board_label,
      p.title,
      p.thumbnail,
      p.has_image,
      p.writer,
      p.author_id,
      p.created_at,
      p.updated_at,
      coalesce(m.views_count, 0)::bigint AS views_count,
      coalesce(m.comments_count, 0)::bigint AS comments_count,
      coalesce(m.likes_count, 0)::bigint AS likes_count,
      p.status,
      p.is_notice,
      p.deleted_at,
      (
        jsonb_typeof(p.attachments) = 'array'
        AND jsonb_array_length(p.attachments) > 0
      )
      OR (p.attachment_url IS NOT NULL AND btrim(p.attachment_url) <> '') AS has_attachment,
      EXISTS (
        SELECT 1
        FROM public.admin_content_notes n
        WHERE n.target_type = 'post'
          AND n.target_id = p.id
          AND btrim(n.body) <> ''
      ) AS has_admin_note
    FROM public.board_posts p
    LEFT JOIN public.board_post_meta m
      ON m.post_type = p.post_type
     AND m.post_id = p.id::text
    WHERE (v_post_type IS NULL OR p.post_type = v_post_type)
      AND (
        CASE v_status
          WHEN 'notice' THEN p.is_notice = true AND p.deleted_at IS NULL
          WHEN 'public' THEN p.status = 'public' AND p.deleted_at IS NULL
          WHEN 'private' THEN p.status = 'private' AND p.deleted_at IS NULL
          WHEN 'deleted' THEN p.deleted_at IS NOT NULL
          ELSE true
        END
      )
      AND (v_has_image IS NULL OR p.has_image = v_has_image)
      AND (
        v_has_attachment IS NULL
        OR (
          (
            jsonb_typeof(p.attachments) = 'array'
            AND jsonb_array_length(p.attachments) > 0
          )
          OR (p.attachment_url IS NOT NULL AND btrim(p.attachment_url) <> '')
        ) = v_has_attachment
      )
      AND (v_date_from IS NULL OR p.created_at >= v_date_from)
      AND (v_date_to IS NULL OR p.created_at <= v_date_to)
      AND (
        v_search = ''
        OR (
          CASE v_search_field
            WHEN 'title' THEN lower(p.title) LIKE '%' || v_search || '%'
            WHEN 'content' THEN lower(p.content) LIKE '%' || v_search || '%'
            WHEN 'writer' THEN lower(p.writer) LIKE '%' || v_search || '%'
            WHEN 'board' THEN lower(public.board_type_label(p.post_type)) LIKE '%' || v_search || '%'
              OR lower(p.post_type) LIKE '%' || v_search || '%'
            WHEN 'attachment' THEN lower(coalesce(p.attachment_name, '')) LIKE '%' || v_search || '%'
              OR lower(coalesce(p.attachments::text, '')) LIKE '%' || v_search || '%'
            ELSE
              lower(p.title) LIKE '%' || v_search || '%'
              OR lower(p.content) LIKE '%' || v_search || '%'
              OR lower(p.writer) LIKE '%' || v_search || '%'
              OR lower(public.board_type_label(p.post_type)) LIKE '%' || v_search || '%'
              OR lower(coalesce(p.attachment_name, '')) LIKE '%' || v_search || '%'
              OR lower(coalesce(p.attachments::text, '')) LIKE '%' || v_search || '%'
          END
        )
      )
  ),
  counted AS (
    SELECT count(*)::bigint AS total_count FROM filtered
  )
  SELECT
    f.*,
    c.total_count
  FROM filtered f
  CROSS JOIN counted c
  ORDER BY
    CASE WHEN v_sort = 'oldest' THEN f.created_at END ASC NULLS LAST,
    CASE WHEN v_sort = 'newest' THEN f.created_at END DESC NULLS LAST,
    CASE WHEN v_sort = 'views' THEN f.views_count END DESC NULLS LAST,
    CASE WHEN v_sort = 'comments' THEN f.comments_count END DESC NULLS LAST,
    CASE WHEN v_sort = 'likes' THEN f.likes_count END DESC NULLS LAST,
    CASE WHEN v_sort = 'writer' THEN lower(f.writer) END ASC NULLS LAST,
    f.created_at DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_content_posts_for_super_admin(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_content_comments_for_super_admin(p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE (
  id uuid,
  body text,
  post_id text,
  post_type text,
  board_label text,
  post_title text,
  author_name text,
  user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  is_hidden boolean,
  deleted_at timestamptz,
  has_admin_note boolean,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search text := lower(trim(coalesce(p_payload->>'search', '')));
  v_search_field text := lower(trim(coalesce(p_payload->>'search_field', 'all')));
  v_post_type text := nullif(trim(coalesce(p_payload->>'post_type', '')), '');
  v_status text := lower(trim(coalesce(p_payload->>'status', 'all')));
  v_date_from timestamptz := NULL;
  v_date_to timestamptz := NULL;
  v_sort text := lower(trim(coalesce(p_payload->>'sort', 'newest')));
  v_limit int := greatest(1, least(100, coalesce((p_payload->>'limit')::int, 20)));
  v_offset int := greatest(0, coalesce((p_payload->>'offset')::int, 0));
  v_period text := lower(trim(coalesce(p_payload->>'period', '')));
BEGIN
  PERFORM public.assert_cms_admin();

  IF p_payload ? 'date_from' AND nullif(trim(p_payload->>'date_from'), '') IS NOT NULL THEN
    v_date_from := (p_payload->>'date_from')::timestamptz;
  END IF;

  IF p_payload ? 'date_to' AND nullif(trim(p_payload->>'date_to'), '') IS NOT NULL THEN
    v_date_to := (p_payload->>'date_to')::timestamptz;
  END IF;

  IF v_period = 'today' THEN
    v_date_from := date_trunc('day', timezone('Asia/Seoul', now()));
  ELSIF v_period = '7d' THEN
    v_date_from := now() - interval '7 days';
  ELSIF v_period = '30d' THEN
    v_date_from := now() - interval '30 days';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      c.id,
      c.body,
      c.post_id,
      c.post_type,
      public.board_type_label(c.post_type) AS board_label,
      coalesce(p.title, '(삭제된 게시글)') AS post_title,
      c.author_name,
      c.user_id,
      c.created_at,
      c.updated_at,
      c.is_hidden,
      c.deleted_at,
      EXISTS (
        SELECT 1
        FROM public.admin_content_notes n
        WHERE n.target_type = 'comment'
          AND n.target_id = c.id
          AND btrim(n.body) <> ''
      ) AS has_admin_note
    FROM public.board_comments c
    LEFT JOIN public.board_posts p
      ON p.id::text = c.post_id
     AND p.post_type = c.post_type
    WHERE (v_post_type IS NULL OR c.post_type = v_post_type)
      AND (
        CASE v_status
          WHEN 'public' THEN c.deleted_at IS NULL AND c.is_hidden = false
          WHEN 'private' THEN c.deleted_at IS NULL AND c.is_hidden = true
          WHEN 'deleted' THEN c.deleted_at IS NOT NULL
          ELSE true
        END
      )
      AND (v_date_from IS NULL OR c.created_at >= v_date_from)
      AND (v_date_to IS NULL OR c.created_at <= v_date_to)
      AND (
        v_search = ''
        OR (
          CASE v_search_field
            WHEN 'content' THEN lower(c.body) LIKE '%' || v_search || '%'
            WHEN 'comment' THEN lower(c.body) LIKE '%' || v_search || '%'
            WHEN 'writer' THEN lower(c.author_name) LIKE '%' || v_search || '%'
            WHEN 'board' THEN lower(public.board_type_label(c.post_type)) LIKE '%' || v_search || '%'
            WHEN 'title' THEN lower(coalesce(p.title, '')) LIKE '%' || v_search || '%'
            ELSE
              lower(c.body) LIKE '%' || v_search || '%'
              OR lower(c.author_name) LIKE '%' || v_search || '%'
              OR lower(coalesce(p.title, '')) LIKE '%' || v_search || '%'
              OR lower(public.board_type_label(c.post_type)) LIKE '%' || v_search || '%'
          END
        )
      )
  ),
  counted AS (
    SELECT count(*)::bigint AS total_count FROM filtered
  )
  SELECT
    f.*,
    ct.total_count
  FROM filtered f
  CROSS JOIN counted ct
  ORDER BY
    CASE WHEN v_sort = 'oldest' THEN f.created_at END ASC NULLS LAST,
    CASE WHEN v_sort = 'newest' THEN f.created_at END DESC NULLS LAST,
    CASE WHEN v_sort = 'writer' THEN lower(f.author_name) END ASC NULLS LAST,
    f.created_at DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_content_comments_for_super_admin(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.bulk_update_posts_for_super_admin(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_action text := lower(trim(coalesce(p_payload->>'action', '')));
  v_ids uuid[];
  v_count int := 0;
BEGIN
  v_uid := public.assert_cms_admin();

  SELECT coalesce(array_agg(value::uuid), ARRAY[]::uuid[])
  INTO v_ids
  FROM jsonb_array_elements_text(coalesce(p_payload->'ids', '[]'::jsonb));

  IF array_length(v_ids, 1) IS NULL THEN
    RAISE EXCEPTION '선택된 게시글이 없습니다.';
  END IF;

  IF v_action = 'hide' OR v_action = 'private' THEN
    UPDATE public.board_posts
    SET status = 'private'
    WHERE id = ANY (v_ids)
      AND deleted_at IS NULL;
  ELSIF v_action = 'publish' OR v_action = 'public' THEN
    UPDATE public.board_posts
    SET status = 'public'
    WHERE id = ANY (v_ids)
      AND deleted_at IS NULL;
  ELSIF v_action = 'delete' OR v_action = 'trash' THEN
    UPDATE public.board_posts
    SET
      deleted_at = now(),
      deleted_by = v_uid
    WHERE id = ANY (v_ids)
      AND deleted_at IS NULL;
  ELSIF v_action = 'restore' THEN
    UPDATE public.board_posts
    SET
      deleted_at = NULL,
      deleted_by = NULL
    WHERE id = ANY (v_ids)
      AND deleted_at IS NOT NULL;
  ELSE
    RAISE EXCEPTION '지원하지 않는 작업입니다. (action: %)', v_action;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'affected', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_update_posts_for_super_admin(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.bulk_update_comments_for_super_admin(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_action text := lower(trim(coalesce(p_payload->>'action', '')));
  v_ids uuid[];
  v_count int := 0;
BEGIN
  v_uid := public.assert_cms_admin();

  SELECT coalesce(array_agg(value::uuid), ARRAY[]::uuid[])
  INTO v_ids
  FROM jsonb_array_elements_text(coalesce(p_payload->'ids', '[]'::jsonb));

  IF array_length(v_ids, 1) IS NULL THEN
    RAISE EXCEPTION '선택된 댓글이 없습니다.';
  END IF;

  IF v_action = 'hide' OR v_action = 'private' THEN
    UPDATE public.board_comments
    SET is_hidden = true
    WHERE id = ANY (v_ids)
      AND deleted_at IS NULL;
  ELSIF v_action = 'publish' OR v_action = 'public' THEN
    UPDATE public.board_comments
    SET is_hidden = false
    WHERE id = ANY (v_ids)
      AND deleted_at IS NULL;
  ELSIF v_action = 'delete' OR v_action = 'trash' THEN
    UPDATE public.board_comments
    SET
      deleted_at = now(),
      deleted_by = v_uid,
      is_hidden = true
    WHERE id = ANY (v_ids)
      AND deleted_at IS NULL;
  ELSIF v_action = 'restore' THEN
    UPDATE public.board_comments
    SET
      deleted_at = NULL,
      deleted_by = NULL,
      is_hidden = false
    WHERE id = ANY (v_ids)
      AND deleted_at IS NOT NULL;
  ELSE
    RAISE EXCEPTION '지원하지 않는 작업입니다. (action: %)', v_action;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'affected', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_update_comments_for_super_admin(jsonb) TO authenticated;

-- Content notes: admin + super_admin
DROP POLICY IF EXISTS "Super admins manage content notes" ON public.admin_content_notes;
CREATE POLICY "CMS admins manage content notes"
  ON public.admin_content_notes
  FOR ALL
  TO authenticated
  USING (public.is_cms_admin())
  WITH CHECK (public.is_cms_admin());

CREATE OR REPLACE FUNCTION public.get_admin_content_note_for_super_admin(
  p_target_type text,
  p_target_id uuid
)
RETURNS TABLE (
  id uuid,
  target_type text,
  target_id uuid,
  body text,
  author_id uuid,
  author_name text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_cms_admin();

  RETURN QUERY
  SELECT
    n.id,
    n.target_type,
    n.target_id,
    n.body,
    n.author_id,
    coalesce(pr.name, '') AS author_name,
    n.created_at,
    n.updated_at
  FROM public.admin_content_notes n
  LEFT JOIN public.profiles pr ON pr.user_id = n.author_id
  WHERE n.target_type = p_target_type
    AND n.target_id = p_target_id
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_content_note_for_super_admin(text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_admin_content_note_for_super_admin(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_target_type text := lower(trim(coalesce(p_payload->>'target_type', '')));
  v_target_id uuid := nullif(trim(coalesce(p_payload->>'target_id', '')), '')::uuid;
  v_body text := coalesce(p_payload->>'body', '');
BEGIN
  v_uid := public.assert_cms_admin();

  IF v_target_type NOT IN ('post', 'comment') OR v_target_id IS NULL THEN
    RAISE EXCEPTION '메모 대상이 올바르지 않습니다.';
  END IF;

  INSERT INTO public.admin_content_notes (target_type, target_id, body, author_id)
  VALUES (v_target_type, v_target_id, v_body, v_uid)
  ON CONFLICT (target_type, target_id)
  DO UPDATE SET
    body = EXCLUDED.body,
    author_id = EXCLUDED.author_id,
    updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_admin_content_note_for_super_admin(jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
