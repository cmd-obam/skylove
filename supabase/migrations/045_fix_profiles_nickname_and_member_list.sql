-- ============================================================
-- Fix: member list error "column p.nickname does not exist"
-- Cause: 044 listed nickname before profiles.nickname existed (042 not applied).
-- Run this entire file once in Supabase SQL Editor.
-- ============================================================

-- 1) Ensure nickname columns exist (from 042)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.nickname IS
  'Optional public display nickname. Independent from legal name.';

COMMENT ON COLUMN public.profiles.nickname_enabled IS
  'When true and nickname is set, new posts/comments use nickname as writer label.';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_nickname_unique_ci
  ON public.profiles (lower(btrim(nickname)))
  WHERE nickname IS NOT NULL AND btrim(nickname) <> '';

CREATE OR REPLACE FUNCTION public.is_nickname_available(
  check_nickname text,
  exclude_user_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN check_nickname IS NULL OR btrim(check_nickname) = '' THEN true
      ELSE NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE nickname IS NOT NULL
          AND btrim(nickname) <> ''
          AND lower(btrim(nickname)) = lower(btrim(check_nickname))
          AND (exclude_user_id IS NULL OR user_id IS DISTINCT FROM exclude_user_id)
      )
    END;
$$;

GRANT EXECUTE ON FUNCTION public.is_nickname_available(text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.prevent_profile_name_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.user_id
     AND NEW.name IS DISTINCT FROM OLD.name THEN
    RAISE EXCEPTION '이름은 가입 후 변경할 수 없습니다.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_name_change ON public.profiles;

CREATE TRIGGER trg_prevent_profile_name_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_name_change();

-- 2) One-off name fix (safe if already applied)
UPDATE public.profiles
SET name = '김혜미'
WHERE btrim(username) = 'Hobb_pang'
  AND btrim(coalesce(name, '')) = '관리자';

-- 3) Recreate member list RPC with nickname column
DROP FUNCTION IF EXISTS public.list_profiles_for_super_admin(text);

CREATE FUNCTION public.list_profiles_for_super_admin(p_search text DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  username text,
  name text,
  nickname text,
  email text,
  phone text,
  role text,
  created_at timestamptz,
  linked_accounts_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search text := nullif(trim(coalesce(p_search, '')), '');
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION '접근 권한이 없습니다.';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.username,
    p.name,
    nullif(btrim(p.nickname), '') AS nickname,
    p.email,
    p.phone,
    lower(trim(p.role)) AS role,
    p.created_at,
    (
      SELECT count(*)::integer
      FROM public.account_links AS al
      WHERE al.primary_user_id = p.user_id
    ) AS linked_accounts_count
  FROM public.profiles AS p
  WHERE NOT EXISTS (
      SELECT 1
      FROM public.account_links AS al
      WHERE al.linked_user_id = p.user_id
    )
    AND (
      v_search IS NULL
      OR p.name ILIKE '%' || v_search || '%'
      OR p.email ILIKE '%' || v_search || '%'
      OR p.username ILIKE '%' || v_search || '%'
      OR coalesce(p.nickname, '') ILIKE '%' || v_search || '%'
      OR coalesce(p.phone, '') ILIKE '%' || v_search || '%'
      OR EXISTS (
        SELECT 1
        FROM public.account_links AS al
        WHERE al.primary_user_id = p.user_id
          AND (
            al.linked_username ILIKE '%' || v_search || '%'
            OR al.linked_email ILIKE '%' || v_search || '%'
          )
      )
    )
  ORDER BY
    CASE lower(trim(p.role))
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'senior_pastor' THEN 3
      WHEN 'manager' THEN 4
      WHEN 'member' THEN 5
      ELSE 6
    END,
    p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_profiles_for_super_admin(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
