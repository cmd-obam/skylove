-- ============================================================
-- 교회소식 게시글 2번 → 담임목사 이야기 이동 + 작성자(최석림) 보정
--
-- 대상: "7월의 마지막 주일을 준비하며..."
--   id: 7d7b0f6d-9339-41ce-9d2d-94e94840e214
-- created_at 은 유지 → 담임목사 이야기에서 번호 1번(오래된 순 번호)이 됨
-- 기존 "내 삶에 감사" 는 번호 2번이 됨
-- ============================================================

DO $$
DECLARE
  v_post_id uuid := '7d7b0f6d-9339-41ce-9d2d-94e94840e214';
  v_choi_id uuid := '1e7c636b-f282-4eee-a2cd-1b6bd0aa3e2f';
  v_choi_name text;
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.board_posts
    WHERE id = v_post_id
      AND post_type = 'church_news'
      AND deleted_at IS NULL
  )
  INTO v_exists;

  IF NOT v_exists THEN
    RAISE NOTICE '대상 교회소식 게시글을 찾지 못했습니다. 이미 이동되었거나 id가 다릅니다.';
    RETURN;
  END IF;

  SELECT coalesce(nullif(trim(p.name), ''), '최석림')
  INTO v_choi_name
  FROM public.profiles AS p
  WHERE p.user_id = v_choi_id;

  IF v_choi_name IS NULL OR v_choi_name = '' THEN
    v_choi_name := '최석림';
  END IF;

  -- 본문 게시글 이동 + 작성자 보정
  UPDATE public.board_posts
  SET
    post_type = 'pastor_story',
    author_id = v_choi_id,
    writer = v_choi_name
  WHERE id = v_post_id
    AND post_type = 'church_news';

  -- 메타 / 댓글 / 좋아요 post_type 동기화
  UPDATE public.board_post_meta
  SET post_type = 'pastor_story'
  WHERE post_id = v_post_id::text
    AND post_type = 'church_news';

  UPDATE public.board_comments
  SET post_type = 'pastor_story'
  WHERE post_id = v_post_id::text
    AND post_type = 'church_news';

  UPDATE public.post_likes
  SET post_type = 'pastor_story'
  WHERE post_id = v_post_id::text
    AND post_type = 'church_news';

  RAISE NOTICE '게시글 % 를 pastor_story 로 이동하고 작성자를 % 로 보정했습니다.', v_post_id, v_choi_name;
END;
$$;
