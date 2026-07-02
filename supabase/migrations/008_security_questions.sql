-- 비밀번호 찾기 보안 질문/답변
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS security_question text,
  ADD COLUMN IF NOT EXISTS security_answer_hash text;

CREATE OR REPLACE FUNCTION public.create_profile_after_signup(
  p_user_id uuid,
  p_username text,
  p_name text,
  p_birth_date date,
  p_email text,
  p_phone text DEFAULT NULL,
  p_security_question text DEFAULT NULL,
  p_security_answer text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  answer_hash text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = p_user_id AND email = p_email
  ) THEN
    RAISE EXCEPTION 'User not found or email mismatch';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE username = p_username
  ) THEN
    RAISE EXCEPTION 'Username already taken';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Profile already exists';
  END IF;

  IF p_security_question IS NOT NULL AND trim(p_security_question) <> '' THEN
    IF p_security_answer IS NULL OR trim(p_security_answer) = '' THEN
      RAISE EXCEPTION 'Security answer is required';
    END IF;

    answer_hash := crypt(trim(p_security_answer), gen_salt('bf'));
  END IF;

  INSERT INTO public.profiles (
    user_id,
    username,
    name,
    birth_date,
    email,
    phone,
    role,
    security_question,
    security_answer_hash
  )
  VALUES (
    p_user_id,
    p_username,
    p_name,
    p_birth_date,
    p_email,
    p_phone,
    'member',
    NULLIF(trim(p_security_question), ''),
    answer_hash
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_profile_after_signup(
  uuid, text, text, date, text, text, text, text
) TO anon, authenticated;

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

GRANT EXECUTE ON FUNCTION public.verify_password_recovery_answer(text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_profile_security_recovery(
  p_user_id uuid,
  p_security_question text,
  p_security_answer text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_security_question IS NULL OR trim(p_security_question) = '' THEN
    RAISE EXCEPTION 'Security question is required';
  END IF;

  IF p_security_answer IS NULL OR trim(p_security_answer) = '' THEN
    RAISE EXCEPTION 'Security answer is required';
  END IF;

  UPDATE public.profiles
  SET
    security_question = trim(p_security_question),
    security_answer_hash = crypt(trim(p_security_answer), gen_salt('bf'))
  WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_profile_security_recovery(uuid, text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
