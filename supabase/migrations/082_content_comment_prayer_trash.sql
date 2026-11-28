-- 댓글과 중보기도 CMS를 게시글과 같은 휴지통으로 맞춘다.
-- 댓글 기본 목록에서는 삭제된 댓글을 빼고, 복구는 최고관리자만 할 수 있다.
-- 중보기도는 바로 지우지 않고 deleted_at 으로 옮긴 뒤 복구할 수 있다.
-- 공개 목록과 통계에서는 휴지통 기도 제목을 보여 주지 않는다.

ALTER TABLE public.prayer_requests
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.prayer_requests
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

CREATE INDEX IF NOT EXISTS prayer_requests_deleted_at_idx
  ON public.prayer_requests (deleted_at DESC)
  WHERE deleted_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.list_prayer_requests(
  p_category text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_visibility text DEFAULT NULL,
  p_query text DEFAULT NULL,
  p_with_participants boolean DEFAULT NULL,
  p_limit integer DEFAULT 30,
  p_offset integer DEFAULT 0,
  p_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  category text,
  title text,
  content text,
  is_anonymous boolean,
  visibility text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  participant_count bigint,
  viewer_participating boolean,
  author_label text,
  author_user_id uuid,
  is_owner boolean,
  can_edit boolean,
  can_delete boolean,
  can_change_status boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.category,
    r.title,
    r.content,
    r.is_anonymous,
    r.visibility,
    r.status,
    r.created_at,
    r.updated_at,
    (
      SELECT count(*)::bigint
      FROM public.prayer_participants AS pp
      WHERE pp.prayer_id = r.id
        AND pp.prayed
    ) AS participant_count,
    EXISTS (
      SELECT 1
      FROM public.prayer_participants AS pp
      WHERE pp.prayer_id = r.id
        AND pp.user_id = public.effective_user_id()
        AND pp.prayed
    ) AS viewer_participating,
    CASE
      WHEN r.is_anonymous THEN public.prayer_author_label(r.user_id, true)
      ELSE coalesce(nullif(btrim(r.writer_name), ''), public.prayer_author_label(r.user_id, false))
    END AS author_label,
    CASE
      WHEN public.is_prayer_super_admin() THEN r.user_id
      ELSE NULL
    END AS author_user_id,
    (r.user_id = public.effective_user_id()) AS is_owner,
    (
      public.is_prayer_super_admin()
      OR r.user_id = public.effective_user_id()
    ) AS can_edit,
    public.is_prayer_super_admin() AS can_delete,
    (
      public.is_prayer_super_admin()
      OR public.can_view_private_prayers()
      OR r.user_id = public.effective_user_id()
    ) AS can_change_status
  FROM public.prayer_requests AS r
  WHERE auth.uid() IS NOT NULL
    AND r.deleted_at IS NULL
    AND public.can_read_prayer(r.user_id, r.visibility)
    AND (p_id IS NULL OR r.id = p_id)
    AND (
      p_category IS NULL
      OR btrim(p_category) = ''
      OR lower(btrim(p_category)) = 'all'
      OR (
        lower(btrim(p_category)) = 'personal'
        AND r.category IN ('personal', 'family', 'health', 'church', 'mission', 'other', 'spirit', 'identity', 'path')
      )
      OR (
        lower(btrim(p_category)) <> 'personal'
        AND r.category = lower(btrim(p_category))
      )
    )
    AND (
      p_status IS NULL
      OR btrim(p_status) = ''
      OR lower(btrim(p_status)) = 'all'
      OR r.status = lower(btrim(p_status))
    )
    AND (
      p_visibility IS NULL
      OR btrim(p_visibility) = ''
      OR lower(btrim(p_visibility)) = 'all'
      OR (
        lower(btrim(p_visibility)) = 'public'
        AND r.visibility = 'public'
      )
      OR (
        lower(btrim(p_visibility)) = 'private'
        AND r.visibility = 'private'
        AND public.can_read_prayer(r.user_id, r.visibility)
      )
    )
    AND (
      NULLIF(btrim(coalesce(p_query, '')), '') IS NULL
      OR r.title ILIKE '%' || replace(replace(replace(left(btrim(p_query), 80), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' ESCAPE E'\\'
      OR r.content ILIKE '%' || replace(replace(replace(left(btrim(p_query), 80), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' ESCAPE E'\\'
    )
    AND (
      NOT coalesce(p_with_participants, false)
      OR EXISTS (
        SELECT 1
        FROM public.prayer_participants AS pp
        WHERE pp.prayer_id = r.id
      )
    )
  ORDER BY r.created_at DESC
  LIMIT LEAST(GREATEST(coalesce(p_limit, 30), 1), 100)
  OFFSET GREATEST(coalesce(p_offset, 0), 0);
$$;

CREATE OR REPLACE FUNCTION public.get_prayer_stats()
RETURNS TABLE (
  together_count bigint,
  praying_count bigint,
  answered_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(*) FILTER (
      WHERE r.status = 'praying'
        AND r.category = 'intercession'
    )::bigint AS together_count,
    count(*) FILTER (
      WHERE r.status = 'praying'
        AND r.category IN ('personal', 'family', 'health', 'church', 'mission', 'other', 'spirit', 'identity', 'path')
    )::bigint AS praying_count,
    count(*) FILTER (WHERE r.status = 'answered')::bigint AS answered_count
  FROM public.prayer_requests AS r
  WHERE auth.uid() IS NOT NULL
    AND r.deleted_at IS NULL
    AND public.can_read_prayer(r.user_id, r.visibility);
$$;

CREATE OR REPLACE FUNCTION public.delete_prayer_request(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  IF public.effective_user_id() IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  IF NOT public.is_prayer_super_admin() THEN
    RAISE EXCEPTION '권한이 없습니다.';
  END IF;

  UPDATE public.prayer_requests
  SET
    deleted_at = now(),
    deleted_by = public.effective_user_id(),
    updated_at = now()
  WHERE prayer_requests.id = p_id
    AND prayer_requests.deleted_at IS NULL;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    RAISE EXCEPTION '기도 제목을 찾을 수 없거나 볼 수 없습니다.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_trashed_prayers_for_super_admin(
  p_query text DEFAULT NULL,
  p_limit integer DEFAULT 30,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  category text,
  title text,
  content text,
  is_anonymous boolean,
  visibility text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  participant_count bigint,
  viewer_participating boolean,
  author_label text,
  author_user_id uuid,
  is_owner boolean,
  can_edit boolean,
  can_delete boolean,
  can_change_status boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_prayer_super_admin() THEN
    RAISE EXCEPTION '접근 권한이 없습니다.';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.category,
    r.title,
    r.content,
    r.is_anonymous,
    r.visibility,
    r.status,
    r.created_at,
    r.updated_at,
    (
      SELECT count(*)::bigint
      FROM public.prayer_participants AS pp
      WHERE pp.prayer_id = r.id
        AND pp.prayed
    ) AS participant_count,
    EXISTS (
      SELECT 1
      FROM public.prayer_participants AS pp
      WHERE pp.prayer_id = r.id
        AND pp.user_id = public.effective_user_id()
        AND pp.prayed
    ) AS viewer_participating,
    CASE
      WHEN r.is_anonymous THEN public.prayer_author_label(r.user_id, true)
      ELSE coalesce(nullif(btrim(r.writer_name), ''), public.prayer_author_label(r.user_id, false))
    END AS author_label,
    r.user_id AS author_user_id,
    (r.user_id = public.effective_user_id()) AS is_owner,
    public.is_prayer_super_admin() AS can_edit,
    public.is_prayer_super_admin() AS can_delete,
    public.is_prayer_super_admin() AS can_change_status
  FROM public.prayer_requests AS r
  WHERE r.deleted_at IS NOT NULL
    AND (
      NULLIF(btrim(coalesce(p_query, '')), '') IS NULL
      OR r.title ILIKE '%' || replace(replace(replace(left(btrim(p_query), 80), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' ESCAPE E'\\'
      OR r.content ILIKE '%' || replace(replace(replace(left(btrim(p_query), 80), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' ESCAPE E'\\'
    )
  ORDER BY r.deleted_at DESC, r.created_at DESC
  LIMIT LEAST(GREATEST(coalesce(p_limit, 30), 1), 101)
  OFFSET GREATEST(coalesce(p_offset, 0), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.bulk_update_prayers_for_super_admin(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text := lower(trim(coalesce(p_payload->>'action', '')));
  v_ids uuid[];
  v_count integer := 0;
BEGIN
  IF NOT public.is_prayer_super_admin() THEN
    RAISE EXCEPTION '접근 권한이 없습니다.';
  END IF;

  SELECT coalesce(array_agg(value::uuid), ARRAY[]::uuid[])
  INTO v_ids
  FROM jsonb_array_elements_text(coalesce(p_payload->'ids', '[]'::jsonb));

  IF array_length(v_ids, 1) IS NULL THEN
    RAISE EXCEPTION '선택된 기도 제목이 없습니다.';
  END IF;

  IF v_action = 'delete' OR v_action = 'trash' THEN
    UPDATE public.prayer_requests
    SET
      deleted_at = now(),
      deleted_by = public.effective_user_id(),
      updated_at = now()
    WHERE id = ANY (v_ids)
      AND deleted_at IS NULL;
  ELSIF v_action = 'restore' THEN
    UPDATE public.prayer_requests
    SET
      deleted_at = NULL,
      deleted_by = NULL,
      updated_at = now()
    WHERE id = ANY (v_ids)
      AND deleted_at IS NOT NULL;
  ELSE
    RAISE EXCEPTION '지원하지 않는 작업입니다. (action: %)', v_action;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'affected', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.list_trashed_prayers_for_super_admin(text, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bulk_update_prayers_for_super_admin(jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.list_trashed_prayers_for_super_admin(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_update_prayers_for_super_admin(jsonb) TO authenticated;


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
          ELSE c.deleted_at IS NULL
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
    PERFORM public.assert_super_admin();

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

NOTIFY pgrst, 'reload schema';
