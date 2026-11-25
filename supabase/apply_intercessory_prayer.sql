-- ============================================================
-- 중보기도 (intercessory prayer)
-- Supabase SQL Editor에서 이 파일 전체를 한 번 실행하세요.
-- 같은 내용: supabase/apply_intercessory_prayer.sql
--
-- 이벤트(추수감사 미니게임) 테이블, 함수, 데이터는 변경하지 않습니다.
-- 권한은 클라이언트 role 값이 아니라 profiles 와 기존
-- is_senior_pastor / is_pastor_story_designated_writer 를 사용합니다.
--
-- 회원 공개(public): 로그인한 회원
-- 비공개(private): 담임목사, 지정 담임목사 계정, 최고관리자, 관리자
-- 익명 작성자 실명: 최고관리자만
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_prayer_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE user_id = public.effective_user_id()
        AND lower(trim(role)) = 'super_admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.can_view_private_prayers()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_prayer_super_admin()
    OR public.is_senior_pastor()
    OR public.is_pastor_story_designated_writer()
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE user_id = public.effective_user_id()
        AND lower(trim(role)) = 'admin'
    );
$$;

REVOKE ALL ON FUNCTION public.is_prayer_super_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_view_private_prayers() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.prayer_author_label(p_user_id uuid, p_is_anonymous boolean)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label text;
BEGIN
  IF coalesce(p_is_anonymous, false) AND NOT public.is_prayer_super_admin() THEN
    RETURN '익명';
  END IF;

  SELECT CASE
    WHEN prof.nickname_enabled IS TRUE
      AND prof.nickname IS NOT NULL
      AND btrim(prof.nickname) <> ''
      THEN btrim(prof.nickname)
    ELSE coalesce(nullif(btrim(prof.name), ''), '회원')
  END
  INTO v_label
  FROM public.profiles AS prof
  WHERE prof.user_id = public.resolve_primary_user_id(p_user_id)
  LIMIT 1;

  RETURN coalesce(v_label, '회원');
END;
$$;

REVOKE ALL ON FUNCTION public.prayer_author_label(uuid, boolean) FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.prayer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_anonymous boolean NOT NULL DEFAULT false,
  visibility text NOT NULL DEFAULT 'public',
  status text NOT NULL DEFAULT 'praying',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prayer_requests_category_check
    CHECK (category IN ('intercession', 'personal', 'family', 'health', 'church', 'mission', 'other')),
  CONSTRAINT prayer_requests_visibility_check
    CHECK (visibility IN ('public', 'private')),
  CONSTRAINT prayer_requests_status_check
    CHECK (status IN ('praying', 'answered')),
  CONSTRAINT prayer_requests_title_len
    CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  CONSTRAINT prayer_requests_content_len
    CHECK (char_length(btrim(content)) BETWEEN 1 AND 4000)
);

CREATE TABLE IF NOT EXISTS public.prayer_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id uuid NOT NULL REFERENCES public.prayer_requests (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prayer_participants_unique UNIQUE (prayer_id, user_id),
  CONSTRAINT prayer_participants_message_len
    CHECK (message IS NULL OR char_length(btrim(message)) BETWEEN 1 AND 500)
);

CREATE INDEX IF NOT EXISTS prayer_requests_created_at_idx
  ON public.prayer_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS prayer_requests_category_idx
  ON public.prayer_requests (category);
CREATE INDEX IF NOT EXISTS prayer_requests_status_idx
  ON public.prayer_requests (status);
CREATE INDEX IF NOT EXISTS prayer_requests_visibility_idx
  ON public.prayer_requests (visibility);
CREATE INDEX IF NOT EXISTS prayer_requests_user_id_idx
  ON public.prayer_requests (user_id);
CREATE INDEX IF NOT EXISTS prayer_participants_prayer_id_idx
  ON public.prayer_participants (prayer_id);

ALTER TABLE public.prayer_participants
  ADD COLUMN IF NOT EXISTS message text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prayer_participants_message_len'
      AND conrelid = 'public.prayer_participants'::regclass
  ) THEN
    ALTER TABLE public.prayer_participants
      ADD CONSTRAINT prayer_participants_message_len
      CHECK (message IS NULL OR char_length(btrim(message)) BETWEEN 1 AND 500);
  END IF;
END;
$$;

COMMENT ON TABLE public.prayer_requests IS
  '중보기도 제목. user_id는 익명이어도 저장한다. anon/authenticated 직접 SELECT 는 허용하지 않는다.';
COMMENT ON COLUMN public.prayer_requests.visibility IS
  'public = 로그인 회원 공개, private = 담임목사·최고관리자만';
COMMENT ON COLUMN public.prayer_requests.user_id IS
  '작성 계정. 화면의 익명 여부와 별개로 항상 저장된다.';

CREATE OR REPLACE FUNCTION public.prayer_requests_before_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION '권한이 없습니다.';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prayer_requests_before_update ON public.prayer_requests;
CREATE TRIGGER trg_prayer_requests_before_update
  BEFORE UPDATE ON public.prayer_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.prayer_requests_before_update();

REVOKE ALL ON FUNCTION public.prayer_requests_before_update() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_participants ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.prayer_requests FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.prayer_participants FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS prayer_requests_select_visible ON public.prayer_requests;
CREATE POLICY prayer_requests_select_visible
  ON public.prayer_requests
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      visibility = 'public'
      OR public.can_view_private_prayers()
    )
  );

DROP POLICY IF EXISTS prayer_participants_select_admin ON public.prayer_participants;
CREATE POLICY prayer_participants_select_admin
  ON public.prayer_participants
  FOR SELECT
  TO authenticated
  USING (public.is_prayer_super_admin());

-- 직접 INSERT/UPDATE/DELETE 정책은 두지 않는다.
-- 쓰기는 SECURITY DEFINER 함수만 허용하고, 함수 안에서 권한을 다시 확인한다.

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
        AND r.category IN ('personal', 'family', 'health', 'church', 'mission', 'other')
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
        AND r.category IN ('personal', 'family', 'health', 'church', 'mission', 'other')
    )::bigint AS praying_count,
    count(*) FILTER (WHERE r.status = 'answered')::bigint AS answered_count
  FROM public.prayer_requests AS r
  WHERE auth.uid() IS NOT NULL
    AND (
      r.visibility = 'public'
      OR public.can_view_private_prayers()
    );
$$;

CREATE OR REPLACE FUNCTION public.get_prayer_access()
RETURNS TABLE (
  can_view_private boolean,
  is_super_admin boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.can_view_private_prayers() AS can_view_private,
    public.is_prayer_super_admin() AS is_super_admin
  WHERE auth.uid() IS NOT NULL;
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

  IF v_category NOT IN ('intercession', 'personal', 'family', 'health', 'church', 'mission', 'other') THEN
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

  IF v_category NOT IN ('intercession', 'personal', 'family', 'health', 'church', 'mission', 'other') THEN
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

CREATE OR REPLACE FUNCTION public.set_prayer_status(p_id uuid, p_status text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := public.effective_user_id();
  v_row public.prayer_requests%ROWTYPE;
  v_status text := lower(btrim(coalesce(p_status, '')));
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  IF v_status NOT IN ('praying', 'answered') THEN
    RAISE EXCEPTION '기도 상태를 선택해 주세요.';
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
    OR public.can_view_private_prayers()
    OR (v_row.user_id = v_actor AND v_row.visibility = 'public')
  ) THEN
    RAISE EXCEPTION '권한이 없습니다.';
  END IF;

  UPDATE public.prayer_requests
  SET status = v_status
  WHERE prayer_requests.id = p_id;

  RETURN v_status;
END;
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

  DELETE FROM public.prayer_requests
  WHERE prayer_requests.id = p_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    RAISE EXCEPTION '기도 제목을 찾을 수 없거나 볼 수 없습니다.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_prayer_participation(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := public.effective_user_id();
  v_visibility text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  SELECT prayer_requests.visibility
  INTO v_visibility
  FROM public.prayer_requests
  WHERE prayer_requests.id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '기도 제목을 찾을 수 없거나 볼 수 없습니다.';
  END IF;

  IF v_visibility = 'private' AND NOT public.can_view_private_prayers() THEN
    RAISE EXCEPTION '기도 제목을 찾을 수 없거나 볼 수 없습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.prayer_participants
    WHERE prayer_id = p_id
      AND user_id = v_actor
  ) THEN
    DELETE FROM public.prayer_participants
    WHERE prayer_id = p_id
      AND user_id = v_actor;

    RETURN false;
  END IF;

  BEGIN
    INSERT INTO public.prayer_participants (prayer_id, user_id)
    VALUES (p_id, v_actor);
  EXCEPTION
    WHEN unique_violation THEN
      RETURN true;
  END;

  RETURN true;
END;
$$;

DROP FUNCTION IF EXISTS public.list_prayer_participants(uuid);

CREATE FUNCTION public.list_prayer_participants(p_id uuid)
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

  IF v_category NOT IN ('intercession', 'personal', 'family', 'health', 'church', 'mission', 'other')
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

  IF v_category NOT IN ('intercession', 'personal', 'family', 'health', 'church', 'mission', 'other') THEN
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

REVOKE ALL ON FUNCTION public.list_prayer_requests(text, text, text, text, boolean, integer, integer, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_prayer_stats() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_prayer_access() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_prayer_request(text, text, text, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_prayer_request(uuid, text, text, text, boolean, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_prayer_status(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_prayer_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.toggle_prayer_participation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_prayer_participants(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_prayer_participation(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.list_prayer_requests(text, text, text, text, boolean, integer, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_prayer_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_prayer_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_prayer_request(text, text, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_prayer_request(uuid, text, text, text, boolean, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_prayer_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_prayer_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_prayer_participation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_prayer_participants(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_prayer_participation(uuid, text) TO authenticated;

DO $$
BEGIN
  IF has_table_privilege('anon', 'public.prayer_requests', 'SELECT')
    OR has_table_privilege('authenticated', 'public.prayer_requests', 'SELECT')
    OR has_table_privilege('anon', 'public.prayer_participants', 'SELECT')
    OR has_table_privilege('authenticated', 'public.prayer_participants', 'SELECT') THEN
    RAISE EXCEPTION 'prayer tables must not be directly readable by anon or authenticated';
  END IF;

  IF has_function_privilege('anon', 'public.list_prayer_requests(text, text, text, text, boolean, integer, integer, uuid)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.prayer_author_label(uuid, boolean)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.prayer_author_label(uuid, boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'prayer author lookup must stay internal';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.list_prayer_requests(text, text, text, text, boolean, integer, integer, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated members must be able to call list_prayer_requests';
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
