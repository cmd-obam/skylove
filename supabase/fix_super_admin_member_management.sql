-- ============================================================
-- 회원관리 404 즉시 해결: super_admin RPC 함수 생성
-- Supabase Dashboard → SQL Editor → New query → 붙여넣기 → Run
--
-- 증상: list_profiles_for_super_admin RPC 404 / PGRST202
-- 원인: migration 013이 Supabase DB에 아직 적용되지 않음
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
      AND role = 'super_admin'
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
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION '접근 권한이 없습니다.';
  END IF;

  IF p_new_role NOT IN ('member', 'admin') THEN
    RAISE EXCEPTION '변경할 수 없는 권한입니다.';
  END IF;

  SELECT p.role
  INTO current_role
  FROM public.profiles p
  WHERE p.user_id = p_target_user_id;

  IF current_role IS NULL THEN
    RAISE EXCEPTION '회원을 찾을 수 없습니다.';
  END IF;

  IF current_role = 'super_admin' THEN
    RAISE EXCEPTION '최고관리자 권한은 변경할 수 없습니다.';
  END IF;

  IF current_role NOT IN ('member', 'admin') THEN
    RAISE EXCEPTION '변경할 수 없는 권한입니다.';
  END IF;

  UPDATE public.profiles
  SET role = p_new_role
  WHERE user_id = p_target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_member_role_by_super_admin(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- 확인 (함수 3개가 보이면 성공)
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_super_admin',
    'list_profiles_for_super_admin',
    'update_member_role_by_super_admin'
  )
ORDER BY routine_name;
