-- ============================================================
-- 즉시 실행용: 회원관리 권한 변경 RPC 수정
-- Supabase Dashboard → SQL Editor → New query → 전체 붙여넣기 → Run
--
-- 증상: 관리자로 변경 시
--   P0001 변경할 수 없는 권한입니다. (현재 role: postgres)
--
-- 원인: PL/pgSQL 변수명 current_role 이 PostgreSQL 내장
--   current_role (DB 세션 역할, SECURITY DEFINER 시 postgres) 과 충돌
--
-- 수정: profiles.role (회원 권한) 만 사용
--   - 호출자: auth.uid() → profiles.role = super_admin
--   - 대상: target_user_id → profiles.role (member|admin만 변경)
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
    FROM public.profiles AS p
    WHERE p.user_id = auth.uid()
      AND lower(trim(p.role)) = 'super_admin'
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
  -- 호출자 회원 권한: auth.uid() → profiles.role (DB role 아님)
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
  FROM public.profiles AS p
  WHERE (
    p_search IS NULL
    OR trim(p_search) = ''
    OR p.name ILIKE '%' || trim(p_search) || '%'
    OR p.email ILIKE '%' || trim(p_search) || '%'
  )
  ORDER BY
    CASE lower(trim(p.role))
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'member' THEN 3
      ELSE 4
    END,
    p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_profiles_for_super_admin(text) TO authenticated;

-- 구 시그니처 / 충돌 변수명 포함 함수 제거 후 재생성
DROP FUNCTION IF EXISTS public.update_member_role_by_super_admin(uuid, text);
DROP FUNCTION IF EXISTS public.update_member_role_by_super_admin(text, uuid);
DROP FUNCTION IF EXISTS public.update_member_role_by_super_admin(jsonb);

CREATE OR REPLACE FUNCTION public.update_member_role_by_super_admin(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid uuid;
  v_target_user_id uuid;
  v_target_member_role text;
  v_new_member_role text;
  v_raw_new_role text;
BEGIN
  -- SECURITY DEFINER 여도 JWT의 auth.uid() 는 호출자 기준으로 유지됨
  v_caller_uid := auth.uid();

  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  -- 호출자 권한: Database Role(postgres) 이 아니라 profiles.role
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles AS caller
    WHERE caller.user_id = v_caller_uid
      AND lower(trim(caller.role)) = 'super_admin'
  ) THEN
    RAISE EXCEPTION '접근 권한이 없습니다. (현재 role: %)',
      coalesce(
        (
          SELECT lower(trim(caller.role))
          FROM public.profiles AS caller
          WHERE caller.user_id = v_caller_uid
        ),
        '없음'
      );
  END IF;

  IF p_payload IS NULL THEN
    RAISE EXCEPTION '요청 데이터가 없습니다.';
  END IF;

  v_target_user_id := nullif(trim(p_payload->>'target_user_id'), '')::uuid;
  v_raw_new_role := p_payload->>'new_role';

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION '대상 회원 ID가 없습니다. (payload: %)', p_payload::text;
  END IF;

  v_new_member_role := lower(trim(coalesce(v_raw_new_role, '')));

  IF v_new_member_role NOT IN ('member', 'admin') THEN
    RAISE EXCEPTION '변경할 수 없는 권한입니다. (요청 role: %)', coalesce(v_raw_new_role, 'NULL');
  END IF;

  -- 대상 회원 권한: profiles.role (user_id = auth.users.id)
  SELECT lower(trim(target.role))
  INTO v_target_member_role
  FROM public.profiles AS target
  WHERE target.user_id = v_target_user_id;

  IF v_target_member_role IS NULL THEN
    RAISE EXCEPTION '회원을 찾을 수 없습니다. (user_id: %)', v_target_user_id;
  END IF;

  IF v_target_member_role = 'super_admin' THEN
    RAISE EXCEPTION '최고관리자 권한은 변경할 수 없습니다.';
  END IF;

  IF v_target_member_role NOT IN ('member', 'admin') THEN
    RAISE EXCEPTION '변경할 수 없는 권한입니다. (현재 role: %)', v_target_member_role;
  END IF;

  IF v_target_member_role = v_new_member_role THEN
    RAISE EXCEPTION '이미 % 권한입니다.', v_new_member_role;
  END IF;

  UPDATE public.profiles AS target
  SET role = v_new_member_role
  WHERE target.user_id = v_target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_member_role_by_super_admin(jsonb) TO authenticated;

UPDATE public.profiles
SET role = lower(trim(role))
WHERE role IS NOT NULL
  AND role <> lower(trim(role));

NOTIFY pgrst, 'reload schema';

-- 적용 확인: 함수 정의에 current_role / postgres 문자열이 없어야 함
SELECT
  p.proname AS function_name,
  pg_get_functiondef(p.oid) LIKE '%current_role%' AS still_has_current_role_ident,
  pg_get_functiondef(p.oid) LIKE '%v_target_member_role%' AS has_fixed_variable
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'update_member_role_by_super_admin';
