-- ============================================================
-- public.profiles 테이블 생성
-- Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  name text NOT NULL,
  birth_date date NOT NULL,
  email text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'super_admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (username);
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles (user_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 아이디 중복확인: profiles.username 기준
-- (테이블 직접 조회 시 RLS/404 문제 방지)
-- ============================================================
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

-- ============================================================
-- signUp 성공 후 profiles insert
-- (Confirm email 사용 시 session 없어도 insert 가능)
-- ============================================================
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

-- ============================================================
-- RLS 정책
-- ============================================================
DROP POLICY IF EXISTS "Profiles are viewable by owner" ON public.profiles;
CREATE POLICY "Profiles are viewable by owner"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- insert는 create_profile_after_signup(RPC) 또는 authenticated direct insert
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 로그인: profiles.username → email 직접 조회 (anon 허용)
DROP POLICY IF EXISTS "Allow login email lookup by username" ON public.profiles;
CREATE POLICY "Allow login email lookup by username"
ON public.profiles FOR SELECT TO anon
USING (username IS NOT NULL);

-- PostgREST 스키마 캐시 갱신
NOTIFY pgrst, 'reload schema';
