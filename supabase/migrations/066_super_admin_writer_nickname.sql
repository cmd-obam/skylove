-- ============================================================
-- 최고관리자(한찬우) 공개 작성자명을 닉네임 게시판지기로 맞춥니다.
-- 글 저장 시점의 writer / author_name 은 이후 닉네임을 켜도 바뀌지 않습니다.
-- Supabase Dashboard → SQL Editor → Run
-- ============================================================

DO $$
DECLARE
  v_user_id uuid := '7144801c-c0a1-4e74-9044-e90f491ff0c9';
  v_posts integer := 0;
  v_comments integer := 0;
BEGIN
  UPDATE public.profiles
  SET
    nickname = '게시판지기',
    nickname_enabled = true
  WHERE user_id = v_user_id
    AND btrim(name) = '한찬우'
    AND lower(trim(role)) = 'super_admin'
    AND (
      nickname IS DISTINCT FROM '게시판지기'
      OR nickname_enabled IS DISTINCT FROM true
    );

  UPDATE public.board_posts
  SET writer = '게시판지기'
  WHERE btrim(writer) = '한찬우'
    AND public.resolve_primary_user_id(author_id) = v_user_id;

  GET DIAGNOSTICS v_posts = ROW_COUNT;

  UPDATE public.board_comments
  SET author_name = '게시판지기'
  WHERE btrim(author_name) = '한찬우'
    AND public.resolve_primary_user_id(user_id) = v_user_id;

  GET DIAGNOSTICS v_comments = ROW_COUNT;

  IF to_regclass('public.thanksgiving_game_entries') IS NOT NULL THEN
    UPDATE public.thanksgiving_game_entries
    SET display_name = '게시판지기'
    WHERE btrim(display_name) = '한찬우'
      AND public.resolve_primary_user_id(user_id) = v_user_id;
  END IF;

  RAISE NOTICE '작성자 표시 전환: 게시글 %건, 댓글 %건', v_posts, v_comments;
END $$;
