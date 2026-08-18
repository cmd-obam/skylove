-- ============================================================
-- 039: 회원 표시 이름(profiles.name)이 username/이메일 로컬과
--      섞이지 않도록 보정합니다.
--
-- 원인:
--   auth.users INSERT 트리거가 raw_user_meta_data.name 이 없으면
--   이메일 @ 앞부분을 profiles.name 에 넣고 있었습니다.
--   아이디를 이메일 로컬과 같게 정한 회원은 이름=아이디로 저장됩니다.
--
-- 이 스크립트는
--   1) 트리거 폴백을 '회원'으로 바꿉니다. (아이디/이메일을 이름으로 쓰지 않음)
--   2) 이미 이름=아이디(또는 이메일 로컬)인 행만, metadata에
--      서로 다른 실명이 있을 때 복구합니다.
--   한글 이름이 이미 있는 회원은 변경하지 않습니다.
-- ============================================================

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
  email_local text;
BEGIN
  IF NEW.email IS NULL OR trim(NEW.email) = '' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  email_local := split_part(NEW.email, '@', 1);

  next_username := public.generate_unique_profile_username(
    coalesce(NEW.raw_user_meta_data->>'username', email_local),
    NEW.id
  );

  next_name := nullif(trim(coalesce(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'nickname',
    ''
  )), '');

  IF next_name IS NULL
     OR lower(next_name) = lower(next_username)
     OR lower(next_name) = lower(email_local) THEN
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
    RETURN NEW;
  WHEN others THEN
    RAISE WARNING '[handle_new_auth_user] failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

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
  email_local text;
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
    email_local := split_part(auth_row.email, '@', 1);

    next_username := public.generate_unique_profile_username(
      coalesce(auth_row.raw_user_meta_data->>'username', email_local),
      auth_row.id
    );

    next_name := nullif(trim(coalesce(
      auth_row.raw_user_meta_data->>'name',
      auth_row.raw_user_meta_data->>'full_name',
      auth_row.raw_user_meta_data->>'nickname',
      ''
    )), '');

    IF next_name IS NULL
       OR lower(next_name) = lower(next_username)
       OR lower(next_name) = lower(email_local) THEN
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

-- 이름=아이디(또는 이메일 로컬)인 행만, metadata에 다른 실명이 있으면 복구
UPDATE public.profiles AS p
SET name = recovered.meta_name
FROM (
  SELECT
    pr.user_id,
    nullif(trim(coalesce(
      u.raw_user_meta_data->>'name',
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'nickname',
      ''
    )), '') AS meta_name
  FROM public.profiles AS pr
  JOIN auth.users AS u ON u.id = pr.user_id
) AS recovered
WHERE p.user_id = recovered.user_id
  AND recovered.meta_name IS NOT NULL
  AND (
    p.name = p.username
    OR p.name = split_part(p.email, '@', 1)
  )
  AND lower(recovered.meta_name) <> lower(p.username)
  AND lower(recovered.meta_name) <> lower(split_part(p.email, '@', 1))
  AND recovered.meta_name <> p.name;
