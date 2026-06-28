-- ============================================================
-- 로그인 오류 즉시 해결: profiles.role 컬럼 추가
-- Supabase Dashboard → SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'member';

UPDATE public.profiles
SET role = 'member'
WHERE role IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'member';

ALTER TABLE public.profiles
  ALTER COLUMN role SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_role_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('member', 'admin', 'super_admin'));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_profile_after_signup(
  p_user_id uuid,
  p_username text,
  p_name text,
  p_birth_date date,
  p_email text,
  p_phone text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = p_user_id AND email = p_email
  ) THEN
    RAISE EXCEPTION 'User not found or email mismatch';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = p_username) THEN
    RAISE EXCEPTION 'Username already taken';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'Profile already exists';
  END IF;

  INSERT INTO public.profiles (user_id, username, name, birth_date, email, phone, role)
  VALUES (p_user_id, p_username, p_name, p_birth_date, p_email, p_phone, 'member')
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_profile_after_signup(uuid, text, text, date, text, text)
TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- 확인 (role 컬럼이 보이면 성공)
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;
