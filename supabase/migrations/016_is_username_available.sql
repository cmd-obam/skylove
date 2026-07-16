-- 아이디 중복확인 RPC
-- 프론트엔드: supabase.rpc('is_username_available', { check_username })
-- 일부 환경/문서에서 username_available 이름을 쓰므로 동일 구현의 alias도 제공합니다.

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
