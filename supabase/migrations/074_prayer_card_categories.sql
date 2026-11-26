-- 기도카드분류에 영적, 정체, 진로를 저장하고 개인기도 게시판 집계에 포함합니다.

ALTER TABLE public.prayer_requests
  DROP CONSTRAINT IF EXISTS prayer_requests_category_check;

ALTER TABLE public.prayer_requests
  ADD CONSTRAINT prayer_requests_category_check
  CHECK (category IN ('intercession', 'personal', 'family', 'health', 'church', 'mission', 'other', 'spirit', 'identity', 'path'));

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
    ) AS participant_count,
    EXISTS (
      SELECT 1
      FROM public.prayer_participants AS pp
      WHERE pp.prayer_id = r.id
        AND pp.user_id = public.effective_user_id()
    ) AS viewer_participating,
    public.prayer_author_label(r.user_id, r.is_anonymous) AS author_label,
    CASE
      WHEN public.is_prayer_super_admin() THEN r.user_id
      ELSE NULL
    END AS author_user_id,
    (r.user_id = public.effective_user_id()) AS is_owner,
    (
      (
        public.is_prayer_super_admin()
        OR r.user_id = public.effective_user_id()
      )
      AND (
        r.visibility = 'public'
        OR public.can_view_private_prayers()
      )
    ) AS can_edit,
    public.is_prayer_super_admin() AS can_delete,
    (
      public.is_prayer_super_admin()
      OR public.can_view_private_prayers()
      OR (
        r.user_id = public.effective_user_id()
        AND r.visibility = 'public'
      )
    ) AS can_change_status
  FROM public.prayer_requests AS r
  WHERE auth.uid() IS NOT NULL
    AND (
      r.visibility = 'public'
      OR public.can_view_private_prayers()
    )
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
        AND public.can_view_private_prayers()
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
    AND (
      r.visibility = 'public'
      OR public.can_view_private_prayers()
    );
$$;

CREATE OR REPLACE FUNCTION public.create_prayer_request(
  p_category text,
  p_title text,
  p_content text,
  p_is_anonymous boolean,
  p_visibility text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := public.effective_user_id();
  v_category text := lower(btrim(coalesce(p_category, '')));
  v_title text := btrim(coalesce(p_title, ''));
  v_content text := btrim(coalesce(p_content, ''));
  v_visibility text := lower(btrim(coalesce(p_visibility, '')));
  v_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  IF v_category NOT IN ('intercession', 'personal', 'family', 'health', 'church', 'mission', 'other', 'spirit', 'identity', 'path') THEN
    RAISE EXCEPTION '카테고리를 선택해 주세요.';
  END IF;

  IF char_length(v_title) < 1 OR char_length(v_title) > 120 THEN
    RAISE EXCEPTION '기도 제목은 1자 이상 120자 이하로 입력해 주세요.';
  END IF;

  IF char_length(v_content) < 1 OR char_length(v_content) > 4000 THEN
    RAISE EXCEPTION '기도 내용은 1자 이상 4000자 이하로 입력해 주세요.';
  END IF;

  IF v_visibility NOT IN ('public', 'private') THEN
    RAISE EXCEPTION '공개 범위를 선택해 주세요.';
  END IF;

  INSERT INTO public.prayer_requests (
    user_id,
    category,
    title,
    content,
    is_anonymous,
    visibility,
    status
  )
  VALUES (
    v_actor,
    v_category,
    v_title,
    v_content,
    coalesce(p_is_anonymous, false),
    v_visibility,
    'praying'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_prayer_request(
  p_id uuid,
  p_category text,
  p_title text,
  p_content text,
  p_is_anonymous boolean,
  p_visibility text,
  p_status text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := public.effective_user_id();
  v_row public.prayer_requests%ROWTYPE;
  v_category text := lower(btrim(coalesce(p_category, '')));
  v_title text := btrim(coalesce(p_title, ''));
  v_content text := btrim(coalesce(p_content, ''));
  v_visibility text := lower(btrim(coalesce(p_visibility, '')));
  v_status text := lower(btrim(coalesce(p_status, '')));
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  SELECT *
  INTO v_row
  FROM public.prayer_requests
  WHERE prayer_requests.id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '기도 제목을 찾을 수 없거나 볼 수 없습니다.';
  END IF;

  IF v_row.visibility = 'private' AND NOT public.can_view_private_prayers() THEN
    RAISE EXCEPTION '기도 제목을 찾을 수 없거나 볼 수 없습니다.';
  END IF;

  IF NOT (
    public.is_prayer_super_admin()
    OR v_row.user_id = v_actor
  ) THEN
    RAISE EXCEPTION '권한이 없습니다.';
  END IF;

  IF v_category NOT IN ('intercession', 'personal', 'family', 'health', 'church', 'mission', 'other', 'spirit', 'identity', 'path') THEN
    RAISE EXCEPTION '카테고리를 선택해 주세요.';
  END IF;

  IF char_length(v_title) < 1 OR char_length(v_title) > 120 THEN
    RAISE EXCEPTION '기도 제목은 1자 이상 120자 이하로 입력해 주세요.';
  END IF;

  IF char_length(v_content) < 1 OR char_length(v_content) > 4000 THEN
    RAISE EXCEPTION '기도 내용은 1자 이상 4000자 이하로 입력해 주세요.';
  END IF;

  IF v_visibility NOT IN ('public', 'private') THEN
    RAISE EXCEPTION '공개 범위를 선택해 주세요.';
  END IF;

  IF v_status NOT IN ('praying', 'answered') THEN
    RAISE EXCEPTION '기도 상태를 선택해 주세요.';
  END IF;

  UPDATE public.prayer_requests
  SET
    category = v_category,
    title = v_title,
    content = v_content,
    is_anonymous = coalesce(p_is_anonymous, false),
    visibility = v_visibility,
    status = v_status
  WHERE prayer_requests.id = p_id;

  RETURN p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_prayer_participants(p_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  created_at timestamptz,
  message text,
  is_mine boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category text;
  v_visibility text;
BEGIN
  IF public.effective_user_id() IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  SELECT prayer_requests.category, prayer_requests.visibility
  INTO v_category, v_visibility
  FROM public.prayer_requests
  WHERE prayer_requests.id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '기도 제목을 찾을 수 없거나 볼 수 없습니다.';
  END IF;

  IF v_visibility = 'private' AND NOT public.can_view_private_prayers() THEN
    RAISE EXCEPTION '기도 제목을 찾을 수 없거나 볼 수 없습니다.';
  END IF;

  IF v_category NOT IN ('intercession', 'personal', 'family', 'health', 'church', 'mission', 'other', 'spirit', 'identity', 'path')
    AND NOT public.is_prayer_super_admin() THEN
    RAISE EXCEPTION '권한이 없습니다.';
  END IF;

  RETURN QUERY
  SELECT
    pp.user_id,
    public.prayer_author_label(pp.user_id, false) AS display_name,
    pp.created_at,
    pp.message,
    (pp.user_id = public.effective_user_id()) AS is_mine
  FROM public.prayer_participants AS pp
  WHERE pp.prayer_id = p_id
  ORDER BY pp.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_prayer_participation(p_id uuid, p_message text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := public.effective_user_id();
  v_owner uuid;
  v_visibility text;
  v_category text;
  v_status text;
  v_message text := btrim(coalesce(p_message, ''));
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  IF char_length(v_message) < 1 OR char_length(v_message) > 500 THEN
    RAISE EXCEPTION '1자 이상 500자 이하로 적어 주세요.';
  END IF;

  SELECT prayer_requests.user_id, prayer_requests.visibility, prayer_requests.category, prayer_requests.status
  INTO v_owner, v_visibility, v_category, v_status
  FROM public.prayer_requests
  WHERE prayer_requests.id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '기도 제목을 찾을 수 없거나 볼 수 없습니다.';
  END IF;

  IF v_visibility = 'private' AND NOT public.can_view_private_prayers() THEN
    RAISE EXCEPTION '기도 제목을 찾을 수 없거나 볼 수 없습니다.';
  END IF;

  IF v_category NOT IN ('intercession', 'personal', 'family', 'health', 'church', 'mission', 'other', 'spirit', 'identity', 'path') THEN
    RAISE EXCEPTION '이 기도 글에는 남길 수 없습니다.';
  END IF;

  IF v_status IS DISTINCT FROM 'praying' THEN
    RAISE EXCEPTION '응답이 완료된 기도에는 남길 수 없습니다.';
  END IF;

  IF v_owner = v_actor THEN
    RAISE EXCEPTION '작성자는 응답 완료로 기도를 마무리합니다.';
  END IF;

  INSERT INTO public.prayer_participants (prayer_id, user_id, message)
  VALUES (p_id, v_actor, v_message)
  ON CONFLICT (prayer_id, user_id) DO UPDATE
  SET message = EXCLUDED.message,
      created_at = now();
END;
$$;

NOTIFY pgrst, 'reload schema';
