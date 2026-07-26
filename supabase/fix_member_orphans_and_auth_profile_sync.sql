-- ============================================================
-- 028: auth.users ↔ profiles 동기화 + 고아 회원 백필
--
-- 문제: 이메일 OTP로 auth.users만 생성되고 profiles 저장이 실패하면
--       회원관리(list_profiles_for_super_admin)에 표시되지 않음.
--
-- 해결:
-- 1) auth.users INSERT 시 stub profiles 자동 생성
-- 2) 기존 고아 auth.users 백필
-- 3) 최고관리자용 동기화 RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_unique_profile_username(p_seed text, p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username text;
  next_username text;
  suffix integer := 0;
BEGIN
  base_username := lower(regexp_replace(coalesce(nullif(trim(p_seed), ''), ''), '[^a-z0-9_]', '', 'g'));

  IF base_username IS NULL OR length(base_username) < 4 THEN
    base_username := 'user_' || substr(replace(p_user_id::text, '-', ''), 1, 12);
  END IF;

  IF length(base_username) > 20 THEN
    base_username := left(base_username, 20);
  END IF;

  next_username := base_username;

  WHILE EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE username = next_username
      AND user_id IS DISTINCT FROM p_user_id
  ) LOOP
    suffix := suffix + 1;
    next_username := left(base_username, greatest(1, 20 - length('_' || suffix::text))) || '_' || suffix::text;
  END LOOP;

  RETURN next_username;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_username text;
  next_name text;
  next_birth date;
BEGIN
  IF NEW.email IS NULL OR trim(NEW.email) = '' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  next_username := public.generate_unique_profile_username(
    coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.id
  );

  next_name := nullif(trim(coalesce(NEW.raw_user_meta_data->>'name', '')), '');
  IF next_name IS NULL THEN
    next_name := split_part(NEW.email, '@', 1);
  END IF;
  IF next_name IS NULL OR trim(next_name) = '' THEN
    next_name := '회원';
  END IF;

  BEGIN
    next_birth := nullif(trim(coalesce(NEW.raw_user_meta_data->>'birth_date', '')), '')::date;
  EXCEPTION
    WHEN others THEN
      next_birth := NULL;
  END;

  IF next_birth IS NULL THEN
    next_birth := DATE '1900-01-01';
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
  )
  VALUES (
    NEW.id,
    next_username,
    next_name,
    next_birth,
    lower(trim(NEW.email)),
    nullif(trim(coalesce(NEW.raw_user_meta_data->>'phone', '')), ''),
    'member',
    'newcomer',
    NULL
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- 동시성으로 이미 생긴 경우 무시
    RETURN NEW;
  WHEN others THEN
    RAISE WARNING '[handle_new_auth_user] failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- 기존 고아 auth.users → profiles 백필
CREATE OR REPLACE FUNCTION public.backfill_orphan_profiles_from_auth_users()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer := 0;
  auth_row record;
  next_username text;
  next_name text;
  next_birth date;
BEGIN
  FOR auth_row IN
    SELECT a.id, a.email, a.raw_user_meta_data
    FROM auth.users AS a
    LEFT JOIN public.profiles AS p ON p.user_id = a.id
    WHERE p.user_id IS NULL
      AND a.email IS NOT NULL
      AND trim(a.email) <> ''
    ORDER BY a.created_at ASC
  LOOP
    next_username := public.generate_unique_profile_username(
      coalesce(auth_row.raw_user_meta_data->>'username', split_part(auth_row.email, '@', 1)),
      auth_row.id
    );

    next_name := nullif(trim(coalesce(auth_row.raw_user_meta_data->>'name', '')), '');
    IF next_name IS NULL THEN
      next_name := split_part(auth_row.email, '@', 1);
    END IF;
    IF next_name IS NULL OR trim(next_name) = '' THEN
      next_name := '회원';
    END IF;

    BEGIN
      next_birth := nullif(trim(coalesce(auth_row.raw_user_meta_data->>'birth_date', '')), '')::date;
    EXCEPTION
      WHEN others THEN
        next_birth := NULL;
    END;

    IF next_birth IS NULL THEN
      next_birth := DATE '1900-01-01';
    END IF;

    BEGIN
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
      )
      VALUES (
        auth_row.id,
        next_username,
        next_name,
        next_birth,
        lower(trim(auth_row.email)),
        nullif(trim(coalesce(auth_row.raw_user_meta_data->>'phone', '')), ''),
        'member',
        'newcomer',
        NULL
      );
      inserted_count := inserted_count + 1;
    EXCEPTION
      WHEN unique_violation THEN
        NULL;
      WHEN others THEN
        RAISE WARNING '[backfill_orphan_profiles] skip %: %', auth_row.id, SQLERRM;
    END;
  END LOOP;

  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_orphan_profiles_from_auth_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_orphan_profiles_from_auth_users() TO service_role;

-- 최고관리자가 회원관리 진입 시 고아 동기화 가능
CREATE OR REPLACE FUNCTION public.sync_orphan_profiles_for_super_admin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION '접근 권한이 없습니다.';
  END IF;

  inserted_count := public.backfill_orphan_profiles_from_auth_users();

  RETURN jsonb_build_object(
    'success', true,
    'inserted_count', inserted_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_orphan_profiles_for_super_admin() TO authenticated;

-- 즉시 1회 백필 (SQL Editor 실행 시 기존 누락 회원 복구)
SELECT public.backfill_orphan_profiles_from_auth_users() AS orphan_profiles_inserted;
