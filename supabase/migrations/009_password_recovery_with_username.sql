-- 비밀번호 찾기: 이름 + 아이디 + 이메일 본인 확인
-- 기존 2~3개 파라미터 RPC를 아이디 포함 버전으로 교체

DROP FUNCTION IF EXISTS public.get_password_recovery_question(text, text);
DROP FUNCTION IF EXISTS public.verify_password_recovery_answer(text, text, text);

CREATE OR REPLACE FUNCTION public.resolve_email_by_name_username_email(
  p_name text,
  p_username text,
  p_email text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_email text;
BEGIN
  SELECT email INTO found_email
  FROM public.profiles
  WHERE lower(trim(name)) = lower(trim(p_name))
    AND trim(username) = trim(p_username)
    AND lower(trim(email)) = lower(trim(p_email))
  LIMIT 1;

  RETURN found_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_email_by_name_username_email(text, text, text)
TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_password_recovery_question(
  p_name text,
  p_username text,
  p_email text
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT security_question
  FROM public.profiles
  WHERE lower(trim(name)) = lower(trim(p_name))
    AND trim(username) = trim(p_username)
    AND lower(trim(email)) = lower(trim(p_email))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_password_recovery_question(text, text, text)
TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.verify_password_recovery_answer(
  p_name text,
  p_username text,
  p_email text,
  p_answer text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(trim(name)) = lower(trim(p_name))
      AND trim(username) = trim(p_username)
      AND lower(trim(email)) = lower(trim(p_email))
      AND security_answer_hash IS NOT NULL
      AND crypt(trim(p_answer), security_answer_hash) = security_answer_hash
  );
$$;

GRANT EXECUTE ON FUNCTION public.verify_password_recovery_answer(text, text, text, text)
TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
