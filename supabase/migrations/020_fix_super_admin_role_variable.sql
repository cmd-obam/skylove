-- ============================================================
-- Fix: update_member_role_by_super_admin PL/pgSQL variable
-- "current_role" collided with PostgreSQL built-in current_role
-- (DB session role = postgres under SECURITY DEFINER).
-- Member checks must use profiles.role via auth.uid() / user_id.
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
  v_caller_uid := auth.uid();

  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

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

NOTIFY pgrst, 'reload schema';
