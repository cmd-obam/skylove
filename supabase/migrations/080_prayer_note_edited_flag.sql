-- 함께 기도하기 행에 첫 글을 남겨도 수정됨으로 보이지 않게 한다.
-- edited_at 은 이미 있던 글의 내용이 실제로 바뀐 뒤에만 기록한다.

ALTER TABLE public.prayer_participants
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

CREATE OR REPLACE FUNCTION public.list_prayer_participants(p_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  created_at timestamptz,
  updated_at timestamptz,
  message text,
  is_mine boolean,
  is_edited boolean,
  staff_label text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_category text;
  v_visibility text;
BEGIN
  IF public.effective_user_id() IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  SELECT prayer_requests.user_id, prayer_requests.category, prayer_requests.visibility
  INTO v_owner, v_category, v_visibility
  FROM public.prayer_requests
  WHERE prayer_requests.id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '기도 제목을 찾을 수 없거나 볼 수 없습니다.';
  END IF;

  IF NOT public.can_read_prayer(v_owner, v_visibility) THEN
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
    pp.updated_at,
    pp.message,
    (pp.user_id = public.effective_user_id()) AS is_mine,
    (pp.edited_at IS NOT NULL) AS is_edited,
    (
      SELECT CASE lower(trim(prof.role))
        WHEN 'super_admin' THEN '관리자'
        WHEN 'admin' THEN '관리자'
        WHEN 'senior_pastor' THEN '담임목사'
        ELSE NULL
      END
      FROM public.profiles AS prof
      WHERE prof.user_id = public.resolve_primary_user_id(pp.user_id)
      LIMIT 1
    ) AS staff_label
  FROM public.prayer_participants AS pp
  WHERE pp.prayer_id = p_id
    AND pp.message IS NOT NULL
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

  IF NOT public.can_read_prayer(v_owner, v_visibility) THEN
    RAISE EXCEPTION '기도 제목을 찾을 수 없거나 볼 수 없습니다.';
  END IF;

  IF v_category NOT IN ('intercession', 'personal', 'family', 'health', 'church', 'mission', 'other', 'spirit', 'identity', 'path') THEN
    RAISE EXCEPTION '이 기도 글에는 남길 수 없습니다.';
  END IF;

  IF v_status IS DISTINCT FROM 'praying' THEN
    RAISE EXCEPTION '응답이 완료된 기도에는 남길 수 없습니다.';
  END IF;

  INSERT INTO public.prayer_participants (prayer_id, user_id, message, prayed, updated_at, edited_at)
  VALUES (p_id, v_actor, v_message, false, NULL, NULL)
  ON CONFLICT (prayer_id, user_id) DO UPDATE
  SET message = EXCLUDED.message,
      edited_at = CASE
        WHEN public.prayer_participants.message IS NOT NULL
         AND btrim(public.prayer_participants.message) IS DISTINCT FROM EXCLUDED.message
        THEN now()
        ELSE public.prayer_participants.edited_at
      END,
      updated_at = CASE
        WHEN public.prayer_participants.message IS NOT NULL
         AND btrim(public.prayer_participants.message) IS DISTINCT FROM EXCLUDED.message
        THEN now()
        ELSE public.prayer_participants.updated_at
      END;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_prayer_participation(p_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := public.effective_user_id();
  v_owner uuid;
  v_visibility text;
  v_target uuid := p_user_id;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  IF v_target IS NULL THEN
    RAISE EXCEPTION '삭제할 기도를 찾을 수 없습니다.';
  END IF;

  IF v_target IS DISTINCT FROM v_actor AND NOT public.is_prayer_super_admin() THEN
    RAISE EXCEPTION '본인이 남긴 기도만 삭제할 수 있습니다.';
  END IF;

  SELECT prayer_requests.user_id, prayer_requests.visibility
  INTO v_owner, v_visibility
  FROM public.prayer_requests
  WHERE prayer_requests.id = p_id;

  IF NOT FOUND OR NOT public.can_read_prayer(v_owner, v_visibility) THEN
    RAISE EXCEPTION '기도 제목을 찾을 수 없거나 볼 수 없습니다.';
  END IF;

  UPDATE public.prayer_participants
  SET message = NULL,
      edited_at = NULL,
      updated_at = now()
  WHERE prayer_id = p_id
    AND user_id = v_target;

  DELETE FROM public.prayer_participants
  WHERE prayer_id = p_id
    AND user_id = v_target
    AND message IS NULL
    AND prayed = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_prayer_participants(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_prayer_participation(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_prayer_participation(uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
