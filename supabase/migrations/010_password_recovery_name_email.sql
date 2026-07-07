-- 비밀번호 찾기: 이름 + 이메일 기준으로 복원 (009의 아이디 필수 RPC 교체)

DROP FUNCTION IF EXISTS public.get_password_recovery_question(text, text, text);
DROP FUNCTION IF EXISTS public.verify_password_recovery_answer(text, text, text, text);
DROP FUNCTION IF EXISTS public.resolve_email_by_name_username_email(text, text, text);

CREATE OR REPLACE FUNCTION public.get_password_recovery_question(
  p_name text,
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
    AND lower(trim(email)) = lower(trim(p_email))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_password_recovery_question(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.verify_password_recovery_answer(
  p_name text,
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
      AND lower(trim(email)) = lower(trim(p_email))
      AND security_answer_hash IS NOT NULL
      AND crypt(trim(p_answer), security_answer_hash) = security_answer_hash
  );
$$;

GRANT EXECUTE ON FUNCTION public.verify_password_recovery_answer(text, text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
