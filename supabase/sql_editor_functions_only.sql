-- ============================================================
-- profiles 테이블을 이미 만든 경우 → 이 파일만 SQL Editor에서 실행
-- Supabase Dashboard → SQL Editor → New query → Run
--
-- 로그인 오류 "column profiles.role does not exist" 발생 시
-- 아래 ⓪ role 컬럼 섹션이 포함되어 있으므로 이 파일 전체를 실행하세요.
-- ============================================================

-- ⓪ role 컬럼 (로그인 필수 — member | admin | super_admin)
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

-- ① 아이디 중복확인 (profiles.username)
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
    WHERE username = check_username
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated;

-- ② 회원가입 성공 후 profiles insert
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

  INSERT INTO public.profiles (user_id, username, name, birth_date, email, phone, role)
  VALUES (p_user_id, p_username, p_name, p_birth_date, p_email, p_phone, 'member')
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_profile_after_signup(uuid, text, text, date, text, text)
TO anon, authenticated;

-- ③ RLS 정책 (없으면 추가)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by owner" ON public.profiles;
CREATE POLICY "Profiles are viewable by owner"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 회원탈퇴: 본인 profile 삭제
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
ON public.profiles FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 로그인: profiles.username → email 직접 조회 (anon 허용)
DROP POLICY IF EXISTS "Allow login email lookup by username" ON public.profiles;
CREATE POLICY "Allow login email lookup by username"
ON public.profiles FOR SELECT TO anon
USING (username IS NOT NULL);

NOTIFY pgrst, 'reload schema';
