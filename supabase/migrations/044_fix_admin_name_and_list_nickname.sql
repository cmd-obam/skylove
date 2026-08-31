-- ============================================================
-- 1) One-off: rename 관리자 → 김혜미 (username Hobb_pang)
-- 2) list_profiles_for_super_admin: add nickname OUT column
-- Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Name change is blocked for self-updates by trigger; SQL (auth.uid() NULL) is allowed.
UPDATE public.profiles
SET name = '김혜미'
WHERE btrim(username) = 'Hobb_pang'
  AND btrim(coalesce(name, '')) = '관리자';

-- Return type change requires DROP then CREATE (same pattern as 043 CMS list).
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
