-- ============================================================
-- 담임목사(senior_pastor) 게시판 운영 권한 확장
--
-- 추가:
--   - 주일예배 · 엘샤다이 찬양단 글쓰기
--   - 모든 게시판 게시글 수정/삭제 (본인·타인)
--   - 모든 댓글 수정/숨김/삭제 (본인·타인)
--
-- CMS / 회원관리는 기존대로 admin·super_admin 전용입니다.
-- ============================================================

-- ---------- 1) 글쓰기: 전 게시판 ----------
CREATE OR REPLACE FUNCTION public.can_write_board_post(p_post_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_post_type = 'pastor_story' THEN
      public.is_pastor_story_writer()
    ELSE
      public.is_board_writer()
      OR public.is_senior_pastor()
      OR public.is_pastor_story_designated_writer()
  END;
$$;

GRANT EXECUTE ON FUNCTION public.can_write_board_post(text) TO authenticated;

-- ---------- 2) 게시글 관리: 담임목사는 전 게시판 전체 ----------
CREATE OR REPLACE FUNCTION public.can_manage_board_post_row(p_author_id uuid, p_post_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_post_type = 'pastor_story' THEN
      public.is_super_admin()
      OR public.is_senior_pastor()
      OR public.is_pastor_story_designated_writer()
    ELSE
      public.can_manage_board_post(p_author_id)
      OR public.is_senior_pastor()
      OR public.is_pastor_story_designated_writer()
  END;
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_board_post_row(uuid, text) TO authenticated;

-- ---------- 3) 댓글 운영: senior_pastor 포함 ----------
CREATE OR REPLACE FUNCTION public.is_comment_moderator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = public.effective_user_id()
      AND lower(trim(role)) IN ('manager', 'admin', 'super_admin', 'senior_pastor')
  )
  OR public.is_pastor_story_designated_writer();
$$;

GRANT EXECUTE ON FUNCTION public.is_comment_moderator() TO anon, authenticated;

DROP POLICY IF EXISTS "Comment moderators can update comments" ON public.board_comments;
CREATE POLICY "Comment moderators can update comments"
  ON public.board_comments
  FOR UPDATE
  TO authenticated
  USING (public.is_comment_moderator())
  WITH CHECK (public.is_comment_moderator());

DROP POLICY IF EXISTS "Comment moderators can delete comments" ON public.board_comments;
CREATE POLICY "Comment moderators can delete comments"
  ON public.board_comments
  FOR DELETE
  TO authenticated
  USING (public.is_comment_moderator());

-- ---------- 4) Storage: 담임목사도 board-uploads 전체 ----------
DROP POLICY IF EXISTS "Board writers can upload board files" ON storage.objects;
CREATE POLICY "Board writers can upload board files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'board-uploads'
    AND (
      public.is_board_writer()
      OR public.is_senior_pastor()
      OR public.is_pastor_story_designated_writer()
    )
  );

DROP POLICY IF EXISTS "Board writers can update board files" ON storage.objects;
CREATE POLICY "Board writers can update board files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'board-uploads'
    AND (
      public.is_board_writer()
      OR public.is_senior_pastor()
      OR public.is_pastor_story_designated_writer()
    )
  )
  WITH CHECK (
    bucket_id = 'board-uploads'
    AND (
      public.is_board_writer()
      OR public.is_senior_pastor()
      OR public.is_pastor_story_designated_writer()
    )
  );

DROP POLICY IF EXISTS "Board writers can delete board files" ON storage.objects;
CREATE POLICY "Board writers can delete board files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'board-uploads'
    AND (
      public.is_board_writer()
      OR public.is_senior_pastor()
      OR public.is_pastor_story_designated_writer()
    )
  );
