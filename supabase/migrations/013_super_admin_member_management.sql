-- ============================================================
-- super_admin 회원관리 (목록 조회, 권한 변경)
-- Supabase Dashboard → SQL Editor → Run
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND lower(trim(role)) = 'super_admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.list_profiles_for_super_admin(p_search text DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  username text,
  name text,
  email text,
  role text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION '접근 권한이 없습니다.';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.username,
    p.name,
    p.email,
    p.role,
    p.created_at
  FROM public.profiles p
  WHERE (
    p_search IS NULL
    OR trim(p_search) = ''
    OR p.name ILIKE '%' || trim(p_search) || '%'
    OR p.email ILIKE '%' || trim(p_search) || '%'
  )
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_profiles_for_super_admin(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_member_role_by_super_admin(
  p_target_user_id uuid,
  p_new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_role text;
  normalized_new_role text;
  normalized_current_role text;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION '접근 권한이 없습니다.';
  END IF;

  normalized_new_role := lower(trim(coalesce(p_new_role, '')));

  IF normalized_new_role NOT IN ('member', 'admin') THEN
    RAISE EXCEPTION '변경할 수 없는 권한입니다. (요청 role: %)', coalesce(p_new_role, 'NULL');
  END IF;

  SELECT p.role
  INTO current_role
  FROM public.profiles p
  WHERE p.user_id = p_target_user_id;

  IF current_role IS NULL THEN
    RAISE EXCEPTION '회원을 찾을 수 없습니다.';
  END IF;

  normalized_current_role := lower(trim(current_role));

  IF normalized_current_role = 'super_admin' THEN
    RAISE EXCEPTION '최고관리자 권한은 변경할 수 없습니다.';
  END IF;

  IF normalized_current_role NOT IN ('member', 'admin') THEN
    RAISE EXCEPTION '변경할 수 없는 권한입니다. (현재 role: %)', current_role;
  END IF;

  IF normalized_current_role = normalized_new_role THEN
    RAISE EXCEPTION '이미 % 권한입니다.', normalized_new_role;
  END IF;

  UPDATE public.profiles
  SET role = normalized_new_role
  WHERE user_id = p_target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_member_role_by_super_admin(uuid, text) TO authenticated;

UPDATE public.profiles
SET role = lower(trim(role))
WHERE role IS NOT NULL
  AND role <> lower(trim(role));

NOTIFY pgrst, 'reload schema';
