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
    lower(trim(p.role)) AS role,
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

-- 기존 시그니처 제거 (PostgREST 파라미터 바인딩 혼선 방지)
DROP FUNCTION IF EXISTS public.update_member_role_by_super_admin(uuid, text);
DROP FUNCTION IF EXISTS public.update_member_role_by_super_admin(text, uuid);

CREATE OR REPLACE FUNCTION public.update_member_role_by_super_admin(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
  current_role text;
  normalized_new_role text;
  normalized_current_role text;
  raw_new_role text;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION '접근 권한이 없습니다.';
  END IF;

  IF p_payload IS NULL THEN
    RAISE EXCEPTION '요청 데이터가 없습니다.';
  END IF;

  target_user_id := nullif(trim(p_payload->>'target_user_id'), '')::uuid;
  raw_new_role := p_payload->>'new_role';

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION '대상 회원 ID가 없습니다. (payload: %)', p_payload::text;
  END IF;

  normalized_new_role := lower(trim(coalesce(raw_new_role, '')));

  IF normalized_new_role NOT IN ('member', 'admin') THEN
    RAISE EXCEPTION '변경할 수 없는 권한입니다. (요청 role: %)', coalesce(raw_new_role, 'NULL');
  END IF;

  SELECT p.role
  INTO current_role
  FROM public.profiles p
  WHERE p.user_id = target_user_id;

  IF current_role IS NULL THEN
    RAISE EXCEPTION '회원을 찾을 수 없습니다. (user_id: %)', target_user_id;
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
  WHERE user_id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_member_role_by_super_admin(jsonb) TO authenticated;

-- 기존 role 값 공백/대소문자 정리 (선택)
UPDATE public.profiles
SET role = lower(trim(role))
WHERE role IS NOT NULL
  AND role <> lower(trim(role));

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
