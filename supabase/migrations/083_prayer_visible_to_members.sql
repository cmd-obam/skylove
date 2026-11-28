-- 로그인한 회원은 공개·비공개 기도 제목을 모두 볼 수 있다.
-- 수정, 삭제, 상태 변경, 익명 실명 확인은 기존 권한을 유지한다.

CREATE OR REPLACE FUNCTION public.can_read_prayer(p_owner uuid, p_visibility text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.effective_user_id() IS NOT NULL;
$$;

COMMENT ON COLUMN public.prayer_requests.visibility IS
  'public = 회원 공개, private = 비공개 표시. 열람은 로그인한 회원 모두 가능';

NOTIFY pgrst, 'reload schema';
