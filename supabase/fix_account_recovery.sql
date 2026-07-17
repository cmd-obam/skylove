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

CREATE OR REPLACE FUNCTION public.normalize_security_answer(p_answer text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    replace(
      regexp_replace(
        trim(
          regexp_replace(
            normalize(coalesce(p_answer, ''), NFC),
            E'[\r\n\t]+',
            ' ',
            'g'
          )
        ),
        E' +',
        ' ',
        'g'
      ),
      ' ',
      ''
    )
  );
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
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(trim(name)) = lower(trim(p_name))
      AND lower(trim(email)) = lower(trim(p_email))
      AND security_answer_hash IS NOT NULL
      AND (
        crypt(public.normalize_security_answer(p_answer), security_answer_hash) = security_answer_hash
        OR crypt(trim(p_answer), security_answer_hash) = security_answer_hash
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.set_profile_security_recovery(
  p_user_id uuid,
  p_security_question text,
  p_security_answer text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  normalized_answer text;
BEGIN
  IF p_security_question IS NULL OR trim(p_security_question) = '' THEN
    RAISE EXCEPTION 'Security question is required';
  END IF;

  normalized_answer := public.normalize_security_answer(p_security_answer);

  IF normalized_answer IS NULL OR normalized_answer = '' THEN
    RAISE EXCEPTION 'Security answer is required';
  END IF;

  UPDATE public.profiles
  SET
    security_question = trim(p_security_question),
    security_answer_hash = crypt(normalized_answer, gen_salt('bf'))
  WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_password_recovery_question(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_password_recovery_answer(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_profile_security_recovery(uuid, text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
