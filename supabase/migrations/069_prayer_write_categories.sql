-- 기도 제목 작성 카테고리를 중보기도/개인기도로 넓힌다.
-- 기존 personal, family, health, church, mission, other 값은 그대로 둔다.

ALTER TABLE public.prayer_requests
  DROP CONSTRAINT IF EXISTS prayer_requests_category_check;

ALTER TABLE public.prayer_requests
  ADD CONSTRAINT prayer_requests_category_check
  CHECK (category IN ('intercession', 'personal', 'family', 'health', 'church', 'mission', 'other'));

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
