-- 영적, 정체, 진로 분류를 저장할 수 있게 한다.
-- 074를 건너뛰었어도 이 파일만 실행하면 기도카드분류 저장이 된다.

ALTER TABLE public.prayer_requests
  ADD COLUMN IF NOT EXISTS writer_name text;

ALTER TABLE public.prayer_requests
  DROP CONSTRAINT IF EXISTS prayer_requests_category_check;

ALTER TABLE public.prayer_requests
  ADD CONSTRAINT prayer_requests_category_check
  CHECK (category IN ('intercession', 'personal', 'family', 'health', 'church', 'mission', 'other', 'spirit', 'identity', 'path'));

DROP FUNCTION IF EXISTS public.create_prayer_request(text, text, text, boolean, text);
DROP FUNCTION IF EXISTS public.create_prayer_request(text, text, text, boolean, text, text);
DROP FUNCTION IF EXISTS public.update_prayer_request(uuid, text, text, text, boolean, text, text);
DROP FUNCTION IF EXISTS public.update_prayer_request(uuid, text, text, text, boolean, text, text, text);

CREATE OR REPLACE FUNCTION public.create_prayer_request(
  p_category text,
  p_title text,
  p_content text,
  p_is_anonymous boolean,
  p_visibility text,
  p_writer_name text DEFAULT NULL
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
  v_writer_name text := nullif(btrim(coalesce(p_writer_name, '')), '');
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
    writer_name,
    visibility,
    status
  )
  VALUES (
    v_actor,
    v_category,
    v_title,
    v_content,
    coalesce(p_is_anonymous, false),
    v_writer_name,
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
  p_status text,
  p_writer_name text DEFAULT NULL
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
  v_writer_name text := nullif(btrim(coalesce(p_writer_name, '')), '');
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

  IF NOT public.can_read_prayer(v_row.user_id, v_row.visibility) THEN
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
    writer_name = v_writer_name,
    visibility = v_visibility,
    status = v_status
  WHERE prayer_requests.id = p_id;

  RETURN p_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_prayer_request(text, text, text, boolean, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_prayer_request(uuid, text, text, text, boolean, text, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';