-- ============================================================
-- board_posts: scheduled status + scheduled_at + auto-publish
-- Supabase Dashboard → SQL Editor → Run
-- ============================================================

ALTER TABLE public.board_posts
  DROP CONSTRAINT IF EXISTS board_posts_status_check;

ALTER TABLE public.board_posts
  ADD CONSTRAINT board_posts_status_check
  CHECK (status IN ('public', 'private', 'scheduled'));

ALTER TABLE public.board_posts
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

COMMENT ON COLUMN public.board_posts.scheduled_at IS
  'When status=scheduled, post becomes public at this timestamptz (UTC).';

CREATE INDEX IF NOT EXISTS board_posts_scheduled_due_idx
  ON public.board_posts (scheduled_at)
  WHERE status = 'scheduled' AND deleted_at IS NULL;

-- Public list remains public-only (scheduled never appears for members).
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

-- Publish due scheduled posts (service_role / cron / edge).
CREATE OR REPLACE FUNCTION public.publish_due_board_posts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  WITH due AS (
    SELECT id
    FROM public.board_posts
    WHERE status = 'scheduled'
      AND deleted_at IS NULL
      AND scheduled_at IS NOT NULL
      AND scheduled_at <= now()
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.board_posts p
  SET
    status = 'public',
    created_at = coalesce(p.scheduled_at, p.created_at),
    updated_at = now()
  FROM due
  WHERE p.id = due.id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN coalesce(v_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.publish_due_board_posts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_due_board_posts() TO service_role;
-- Safe to call from clients: only flips due scheduled rows to public.
GRANT EXECUTE ON FUNCTION public.publish_due_board_posts() TO anon, authenticated;

-- Also allow authenticated CMS/admin to trigger publish of due posts (optional manual).
CREATE OR REPLACE FUNCTION public.publish_due_board_posts_for_admin()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_cms_admin();
  RETURN public.publish_due_board_posts();
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_due_board_posts_for_admin() TO authenticated;

-- CMS list: include scheduled filter + scheduled_at column.
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
  scheduled_at timestamptz,
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

  -- Opportunistically publish due posts when CMS loads.
  PERFORM public.publish_due_board_posts();

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
      ) AS has_admin_note,
      p.scheduled_at
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
          WHEN 'scheduled' THEN p.status = 'scheduled' AND p.deleted_at IS NULL
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

-- CMS bulk publish also clears schedule.
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
    SET
      status = 'private',
      scheduled_at = NULL
    WHERE id = ANY (v_ids)
      AND deleted_at IS NULL;
  ELSIF v_action = 'publish' OR v_action = 'public' THEN
    UPDATE public.board_posts
    SET
      status = 'public',
      scheduled_at = NULL
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

NOTIFY pgrst, 'reload schema';
