-- ============================================================
-- 아이디 찾기 / 비밀번호 찾기 즉시 복구
-- Supabase Dashboard → SQL Editor → 전체 실행
-- ============================================================

CREATE OR REPLACE FUNCTION public.find_username_by_name_email(
  p_name text,
  p_email text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_username text;
BEGIN
  SELECT username INTO found_username
  FROM public.profiles
  WHERE lower(trim(name)) = lower(trim(p_name))
    AND lower(trim(email)) = lower(trim(p_email))
  LIMIT 1;

  RETURN found_username;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_email_by_name_email(
  p_name text,
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
    AND lower(trim(email)) = lower(trim(p_email))
  LIMIT 1;

  RETURN found_email;
END;
$$;

CREATE OR REPLACE FUNCTION public.lookup_member_by_name_email(
  p_name text,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_member jsonb;
BEGIN
  SELECT jsonb_build_object(
    'username', username,
    'email', email,
    'name', name
  )
  INTO found_member
  FROM public.profiles
  WHERE lower(trim(name)) = lower(trim(p_name))
    AND lower(trim(email)) = lower(trim(p_email))
  LIMIT 1;

  RETURN found_member;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_username_by_name_email(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_email_by_name_email(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_member_by_name_email(text, text) TO anon, authenticated;

-- 보안 질문 (비밀번호 찾기 2단계)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS security_question text,
  ADD COLUMN IF NOT EXISTS security_answer_hash text;

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

CREATE OR REPLACE FUNCTION public.verify_password_recovery_answer(
  p_name text,
  p_email text,
  p_answer text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.get_password_recovery_question(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_password_recovery_answer(text, text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
