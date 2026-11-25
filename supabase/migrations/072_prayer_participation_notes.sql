-- 중보기도 글의 참여 내역에 기도 글을 남길 수 있게 한다.
-- 작성자가 아닌 회원이 볼 수 있는 중보기도 글에만 글을 남긴다.

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

  IF v_category IS DISTINCT FROM 'intercession' AND NOT public.is_prayer_super_admin() THEN
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
    RAISE EXCEPTION '기도는 1자 이상 500자 이하로 적어 주세요.';
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

  IF v_category IS DISTINCT FROM 'intercession' THEN
    RAISE EXCEPTION '중보기도 글에만 함께 기도할 수 있습니다.';
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

REVOKE ALL ON FUNCTION public.list_prayer_participants(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_prayer_participation(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_prayer_participants(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_prayer_participation(uuid, text) TO authenticated;
