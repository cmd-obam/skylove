-- ============================================================
-- 회원가입 profiles 저장 실패 즉시 해결
-- Supabase Dashboard → SQL Editor → 전체 실행
-- ============================================================
-- 실측 원인:
-- 1) profiles.congregant_type / attending_church 컬럼 없음 (42703)
-- 2) create_profile_after_signup 에 congregant 파라미터가 없음 (PGRST202)
-- 프론트는 컬럼 없을 때 자동 폴백하지만, 아래 SQL로 스키마를 맞추는 것을 권장합니다.
-- ============================================================

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
END $$;

-- 최신 시그니처로 교체 (교인 구분 포함)
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
SET search_path = public
AS $$
DECLARE
  next_congregant_type text := NULLIF(trim(p_congregant_type), '');
  next_attending_church text := NULLIF(trim(p_attending_church), '');
  new_id uuid;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = p_user_id
      AND lower(u.email) = lower(trim(p_email))
  ) THEN
    RAISE EXCEPTION 'User not found or email mismatch';
  END IF;

  IF next_congregant_type IS NOT NULL
     AND next_congregant_type NOT IN ('own_church', 'other_church', 'newcomer') THEN
    RAISE EXCEPTION 'Invalid congregant_type';
  END IF;

  IF next_congregant_type = 'other_church' AND next_attending_church IS NULL THEN
    RAISE EXCEPTION 'attending_church required for other_church';
  END IF;

  IF next_congregant_type IS DISTINCT FROM 'other_church' THEN
    next_attending_church := NULL;
  END IF;

  INSERT INTO public.profiles (
    user_id,
    username,
    name,
    birth_date,
    email,
    phone,
    role,
    congregant_type,
    attending_church
  ) VALUES (
    p_user_id,
    trim(p_username),
    trim(p_name),
    p_birth_date,
    lower(trim(p_email)),
    NULLIF(trim(p_phone), ''),
    'member',
    next_congregant_type,
    next_attending_church
  )
  RETURNING id INTO new_id;

  IF p_security_question IS NOT NULL AND p_security_answer IS NOT NULL THEN
    PERFORM public.set_profile_security_recovery(
      p_user_id,
      p_security_question,
      p_security_answer
    );
  END IF;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_profile_after_signup(
  uuid, text, text, date, text, text, text, text, text, text
) TO authenticated;

NOTIFY pgrst, 'reload schema';
