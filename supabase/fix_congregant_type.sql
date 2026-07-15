-- 회원가입 교인 구분
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS congregant_type text,
  ADD COLUMN IF NOT EXISTS attending_church text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_congregant_type_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_congregant_type_check
      CHECK (
        congregant_type IS NULL
        OR congregant_type IN ('own_church', 'other_church', 'newcomer')
      );
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.create_profile_after_signup(
  p_user_id uuid,
  p_username text,
  p_name text,
  p_birth_date date,
  p_email text,
  p_phone text DEFAULT NULL,
  p_security_question text DEFAULT NULL,
  p_security_answer text DEFAULT NULL,
  p_congregant_type text DEFAULT NULL,
  p_attending_church text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  new_id uuid;
  answer_hash text;
  next_congregant_type text := NULLIF(trim(p_congregant_type), '');
  next_attending_church text := NULLIF(trim(p_attending_church), '');
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

  IF next_congregant_type IS NOT NULL
     AND next_congregant_type NOT IN ('own_church', 'other_church', 'newcomer') THEN
    RAISE EXCEPTION 'Invalid congregant type';
  END IF;

  IF next_congregant_type = 'other_church' AND next_attending_church IS NULL THEN
    RAISE EXCEPTION 'Attending church is required for other church members';
  END IF;

  IF next_congregant_type IS DISTINCT FROM 'other_church' THEN
    next_attending_church := NULL;
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
    security_answer_hash,
    congregant_type,
    attending_church
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
    answer_hash,
    next_congregant_type,
    next_attending_church
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_profile_after_signup(
  uuid, text, text, date, text, text, text, text, text, text
) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
