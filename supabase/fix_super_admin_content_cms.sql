-- ============================================================
-- Super-admin Content CMS: status/trash/notes + list/bulk RPCs
-- Supabase Dashboard → SQL Editor → Run
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
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
      AND lower(trim(role)) = 'super_admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- ---------- Columns ----------
ALTER TABLE public.board_posts
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.board_posts
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'public';

ALTER TABLE public.board_posts
  ADD COLUMN IF NOT EXISTS is_notice boolean NOT NULL DEFAULT false;

ALTER TABLE public.board_posts
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.board_posts
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users (id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'board_posts_status_check'
  ) THEN
    ALTER TABLE public.board_posts
      ADD CONSTRAINT board_posts_status_check
      CHECK (status IN ('public', 'private'));
  END IF;
END $$;

ALTER TABLE public.board_comments
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.board_comments
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS board_posts_cms_list_idx
  ON public.board_posts (deleted_at, status, post_type, created_at DESC);

CREATE INDEX IF NOT EXISTS board_posts_author_idx
  ON public.board_posts (author_id);

CREATE INDEX IF NOT EXISTS board_comments_cms_list_idx
  ON public.board_comments (deleted_at, is_hidden, created_at DESC);

-- Backfill public status (already default) + unique-name author_id
UPDATE public.board_posts p
SET author_id = matched.user_id
FROM (
  SELECT writer_name, user_id
  FROM (
    SELECT
      lower(trim(pr.name)) AS writer_name,
      pr.user_id,
      COUNT(*) OVER (PARTITION BY lower(trim(pr.name))) AS name_count
    FROM public.profiles pr
    WHERE pr.name IS NOT NULL
      AND btrim(pr.name) <> ''
  ) ranked
  WHERE name_count = 1
) matched
WHERE p.author_id IS NULL
  AND lower(trim(p.writer)) = matched.writer_name;

-- ---------- Admin notes ----------
CREATE TABLE IF NOT EXISTS public.admin_content_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id uuid NOT NULL,
  body text NOT NULL DEFAULT '',
  author_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id)
);

CREATE INDEX IF NOT EXISTS admin_content_notes_target_idx
  ON public.admin_content_notes (target_type, target_id);

ALTER TABLE public.admin_content_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage content notes" ON public.admin_content_notes;
CREATE POLICY "Super admins manage content notes"
  ON public.admin_content_notes
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ---------- Comment count excludes deleted ----------
CREATE OR REPLACE FUNCTION public.sync_board_post_comments_count(
  p_post_type text,
  p_post_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_board_post_meta(p_post_type, p_post_id);

  UPDATE public.board_post_meta
  SET
    comments_count = (
      SELECT COUNT(*)
      FROM public.board_comments
      WHERE post_type = p_post_type
        AND post_id = p_post_id
        AND is_hidden = false
        AND deleted_at IS NULL
    ),
    updated_at = now()
  WHERE post_type = p_post_type
    AND post_id = p_post_id;
END;
$$;

-- ---------- Public list view (visible posts only) ----------
DROP VIEW IF EXISTS public.board_post_list;

CREATE VIEW public.board_post_list AS
SELECT
  id,
  post_type,
  title,
  writer,
  thumbnail,
  created_at,
  youtube_url,
  has_image,
  author_id,
  status,
  is_notice,
  deleted_at
FROM public.board_posts
WHERE deleted_at IS NULL
  AND status = 'public';

GRANT SELECT ON public.board_post_list TO anon, authenticated;

-- ---------- Post RLS ----------
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
  );

-- Keep admin write policies; soft-delete uses UPDATE for trash.

-- ---------- Comment RLS ----------
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
    OR public.is_board_admin()
  );

-- ---------- Helpers ----------
CREATE OR REPLACE FUNCTION public.assert_super_admin()
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

  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION '접근 권한이 없습니다.';
  END IF;

  RETURN v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assert_super_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.board_type_label(p_post_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_post_type
    WHEN 'church_news' THEN '교회소식'
    WHEN 'album' THEN '교회앨범'
    WHEN 'sunday_sermon' THEN '주일예배'
    WHEN 'el_shaddai_choir' THEN '엘샤다이 찬양단'
    ELSE coalesce(p_post_type, '')
  END;
$$;

-- ---------- List posts ----------
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
  PERFORM public.assert_super_admin();

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

-- ---------- List comments ----------
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
  PERFORM public.assert_super_admin();

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

-- ---------- Bulk posts ----------
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
  v_uid := public.assert_super_admin();

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

-- ---------- Bulk comments ----------
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
  v_uid := public.assert_super_admin();

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

-- Soft-delete helpers for board admins (existing UI delete buttons)
CREATE OR REPLACE FUNCTION public.soft_delete_board_post(p_post_type text, p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_board_admin() THEN
    RAISE EXCEPTION '권한이 없습니다.';
  END IF;

  UPDATE public.board_posts
  SET
    deleted_at = now(),
    deleted_by = auth.uid()
  WHERE post_type = p_post_type
    AND id = p_post_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION '게시글을 찾을 수 없습니다.';
  END IF;
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
      OR public.is_board_admin()
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION '댓글을 삭제할 수 없습니다.';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_board_comment(uuid) TO authenticated;

-- ---------- Notes ----------
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
  PERFORM public.assert_super_admin();

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
    AND n.target_id = p_target_id;
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
  v_uid := public.assert_super_admin();

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

-- ---------- Member detail for author links ----------
-- Extended fields: see also migrations/023_get_member_detail_extended.sql
DROP FUNCTION IF EXISTS public.get_member_detail_for_super_admin(uuid);

CREATE OR REPLACE FUNCTION public.get_member_detail_for_super_admin(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  username text,
  name text,
  email text,
  phone text,
  birth_date date,
  congregant_type text,
  attending_church text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  posts_count bigint,
  comments_count bigint,
  received_likes_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_super_admin();

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION '대상 회원 ID가 없습니다.';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.username,
    p.name,
    p.email,
    p.phone,
    p.birth_date,
    p.congregant_type,
    p.attending_church,
    lower(trim(p.role)) AS role,
    p.created_at,
    u.last_sign_in_at,
    (
      SELECT count(*)::bigint
      FROM public.board_posts bp
      WHERE bp.author_id = p.user_id
        AND bp.deleted_at IS NULL
    ) AS posts_count,
    (
      SELECT count(*)::bigint
      FROM public.board_comments bc
      WHERE bc.user_id = p.user_id
        AND bc.deleted_at IS NULL
    ) AS comments_count,
    (
      (
        SELECT count(*)::bigint
        FROM public.post_likes pl
        INNER JOIN public.board_posts bp
          ON bp.post_type = pl.post_type
         AND bp.id::text = pl.post_id
        WHERE bp.author_id = p.user_id
          AND bp.deleted_at IS NULL
      )
      +
      (
        SELECT count(*)::bigint
        FROM public.comment_likes cl
        INNER JOIN public.board_comments bc
          ON bc.id = cl.comment_id
        WHERE bc.user_id = p.user_id
          AND bc.deleted_at IS NULL
      )
    ) AS received_likes_count
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE p.user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_detail_for_super_admin(uuid) TO authenticated;

-- ---------- Purge helpers (service role / edge function) ----------
CREATE OR REPLACE FUNCTION public.list_expired_trash_posts(p_days int DEFAULT 15, p_limit int DEFAULT 50)
RETURNS SETOF public.board_posts
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.board_posts
  WHERE deleted_at IS NOT NULL
    AND deleted_at <= now() - make_interval(days => greatest(p_days, 1))
  ORDER BY deleted_at ASC
  LIMIT greatest(p_limit, 1);
$$;

CREATE OR REPLACE FUNCTION public.list_expired_trash_comments(p_days int DEFAULT 15, p_limit int DEFAULT 200)
RETURNS SETOF public.board_comments
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.board_comments
  WHERE deleted_at IS NOT NULL
    AND deleted_at <= now() - make_interval(days => greatest(p_days, 1))
  ORDER BY deleted_at ASC
  LIMIT greatest(p_limit, 1);
$$;

-- Only service_role should call purge helpers from Edge Function.
REVOKE ALL ON FUNCTION public.list_expired_trash_posts(int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_expired_trash_comments(int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_expired_trash_posts(int, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_expired_trash_comments(int, int) TO service_role;

NOTIFY pgrst, 'reload schema';
