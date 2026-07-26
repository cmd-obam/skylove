-- ============================================================
-- 029: 최고관리자 회원 탈퇴 RPC (auth.users 서버 삭제)
--
-- Edge Function 배포 없이도 Service Role 권한으로
-- auth.users 를 삭제할 수 있도록 SECURITY DEFINER RPC 제공.
-- profiles.user_id → auth.users(id) ON DELETE CASCADE
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_member_by_super_admin(p_target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_target_role text;
  v_target_email text;
  v_auth_exists boolean := false;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION '접근 권한이 없습니다.';
  END IF;

  IF p_target_user_id IS NULL THEN
    RAISE EXCEPTION '삭제할 회원 ID가 필요합니다.';
  END IF;

  IF p_target_user_id = v_caller THEN
    RAISE EXCEPTION '최고관리자 계정은 직접 탈퇴할 수 없습니다.';
  END IF;

  SELECT p.role, p.email
  INTO v_target_role, v_target_email
  FROM public.profiles AS p
  WHERE p.user_id = p_target_user_id;

  IF v_target_role = 'super_admin' THEN
    RAISE EXCEPTION '최고관리자는 삭제할 수 없습니다.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM auth.users AS u
    WHERE u.id = p_target_user_id
  )
  INTO v_auth_exists;

  IF NOT v_auth_exists AND v_target_role IS NULL THEN
    RAISE EXCEPTION '회원을 찾을 수 없습니다.';
  END IF;

  -- 연관 데이터 선정리 (FK 충돌 방지)
  DELETE FROM public.comment_likes WHERE user_id = p_target_user_id;
  DELETE FROM public.post_likes WHERE user_id = p_target_user_id;
  DELETE FROM public.board_comments WHERE user_id = p_target_user_id;

  BEGIN
    DELETE FROM public.admin_content_notes WHERE author_id = p_target_user_id;
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
  END;

  BEGIN
    UPDATE public.board_posts
    SET author_id = NULL
    WHERE author_id = p_target_user_id;
  EXCEPTION
    WHEN undefined_column THEN
      NULL;
    WHEN undefined_table THEN
      NULL;
  END;

  BEGIN
    DELETE FROM public.member_pii_access_logs WHERE viewer_user_id = p_target_user_id;
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
  END;

  -- ① auth.users 삭제 → profiles 는 ON DELETE CASCADE 로 함께 삭제
  IF v_auth_exists THEN
    DELETE FROM auth.users WHERE id = p_target_user_id;

    IF EXISTS (SELECT 1 FROM auth.users WHERE id = p_target_user_id) THEN
      RAISE EXCEPTION 'auth.users 삭제에 실패했습니다.';
    END IF;
  END IF;

  -- ② cascade 누락 대비 profiles 잔여 정리
  DELETE FROM public.profiles WHERE user_id = p_target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'userId', p_target_user_id,
    'email', v_target_email,
    'message', '회원 탈퇴 처리가 완료되었습니다.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_member_by_super_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_member_by_super_admin(uuid) TO authenticated;
