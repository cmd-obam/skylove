-- 중보기도 게시판의 비공개 글도 담임목사와 관리자 계정이 볼 수 있게 한다.
-- 삭제와 익명 작성자 실명 확인은 최고관리자만 유지한다.

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
