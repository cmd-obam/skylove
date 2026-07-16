-- ============================================================
-- 아이디 중복확인 RPC 404 즉시 해결
-- Supabase Dashboard → SQL Editor → New query → 전체 실행
-- ============================================================
-- 증상: [Signup] 아이디 중복확인 RPC 실패 / 404 / is_username_available
-- 원인: public.is_username_available 함수가 DB에 없음 (스키마 캐시에도 없음)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_username_available(check_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE username = trim(check_username)
  );
$$;

CREATE OR REPLACE FUNCTION public.username_available(check_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_username_available(check_username);
$$;

GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.username_available(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- 확인:
-- select public.is_username_available('test_user_123');
