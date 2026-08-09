-- ============================================================
-- 담임목사(senior_pastor) 글쓰기: 교회소식 · 교회앨범 · 담임목사 이야기
--
-- 기존 권한 체계는 유지하고, senior_pastor / 지정 user_id(최석림)에만
-- church_news · album · pastor_story 작성(+본인 글 관리)을 허용합니다.
-- 예배말씀 게시판(sunday_sermon, el_shaddai_choir)은 기존과 동일합니다.
-- ============================================================

-- ---------- 1) 글쓰기 ----------
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
    WHEN p_post_type IN ('church_news', 'album') THEN
      public.is_board_writer()
      OR public.is_senior_pastor()
      OR public.is_pastor_story_designated_writer()
    ELSE
      public.is_board_writer()
  END;
$$;

GRANT EXECUTE ON FUNCTION public.can_write_board_post(text) TO authenticated;

-- ---------- 2) 본인 글 수정/삭제 ----------
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
      OR (
        (
          public.is_senior_pastor()
          OR public.is_pastor_story_designated_writer()
        )
        AND p_author_id IS NOT NULL
        AND p_author_id = public.effective_user_id()
      )
    WHEN p_post_type IN ('church_news', 'album') THEN
      public.can_manage_board_post(p_author_id)
      OR (
        (
          public.is_senior_pastor()
          OR public.is_pastor_story_designated_writer()
        )
        AND p_author_id IS NOT NULL
        AND p_author_id = public.effective_user_id()
      )
    ELSE
      public.can_manage_board_post(p_author_id)
  END;
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_board_post_row(uuid, text) TO authenticated;

-- soft_delete RPC도 게시판별 관리 권한을 사용
CREATE OR REPLACE FUNCTION public.soft_delete_board_post(p_post_type text, p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id uuid;
BEGIN
  SELECT author_id
  INTO v_author_id
  FROM public.board_posts
  WHERE post_type = p_post_type
    AND id = p_post_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION '게시글을 찾을 수 없습니다.';
  END IF;

  IF NOT public.can_manage_board_post_row(v_author_id, p_post_type) THEN
    RAISE EXCEPTION '권한이 없습니다.';
  END IF;

  UPDATE public.board_posts
  SET
    deleted_at = now(),
    deleted_by = auth.uid()
  WHERE post_type = p_post_type
    AND id = p_post_id
    AND deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_board_post(text, uuid) TO authenticated;

-- ---------- 3) Storage: 담임목사 허용 경로 ----------
DROP POLICY IF EXISTS "Board writers can upload board files" ON storage.objects;
CREATE POLICY "Board writers can upload board files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'board-uploads'
    AND (
      public.is_board_writer()
      OR (
        (
          public.is_senior_pastor()
          OR public.is_pastor_story_designated_writer()
        )
        AND (
          name LIKE 'board-images/pastor_story/%'
          OR name LIKE 'board-thumbnails/pastor_story/%'
          OR name LIKE 'board-files/pastor_story/%'
          OR name LIKE 'board-images/church_news/%'
          OR name LIKE 'board-thumbnails/church_news/%'
          OR name LIKE 'board-files/church_news/%'
          OR name LIKE 'board-images/album/%'
          OR name LIKE 'board-thumbnails/album/%'
          OR name LIKE 'board-files/album/%'
          OR name LIKE 'church-news/%'
          OR name LIKE 'album/%'
        )
      )
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
      OR (
        (
          public.is_senior_pastor()
          OR public.is_pastor_story_designated_writer()
        )
        AND (
          name LIKE 'board-images/pastor_story/%'
          OR name LIKE 'board-thumbnails/pastor_story/%'
          OR name LIKE 'board-files/pastor_story/%'
          OR name LIKE 'board-images/church_news/%'
          OR name LIKE 'board-thumbnails/church_news/%'
          OR name LIKE 'board-files/church_news/%'
          OR name LIKE 'board-images/album/%'
          OR name LIKE 'board-thumbnails/album/%'
          OR name LIKE 'board-files/album/%'
          OR name LIKE 'church-news/%'
          OR name LIKE 'album/%'
        )
      )
    )
  )
  WITH CHECK (
    bucket_id = 'board-uploads'
    AND (
      public.is_board_writer()
      OR (
        (
          public.is_senior_pastor()
          OR public.is_pastor_story_designated_writer()
        )
        AND (
          name LIKE 'board-images/pastor_story/%'
          OR name LIKE 'board-thumbnails/pastor_story/%'
          OR name LIKE 'board-files/pastor_story/%'
          OR name LIKE 'board-images/church_news/%'
          OR name LIKE 'board-thumbnails/church_news/%'
          OR name LIKE 'board-files/church_news/%'
          OR name LIKE 'board-images/album/%'
          OR name LIKE 'board-thumbnails/album/%'
          OR name LIKE 'board-files/album/%'
          OR name LIKE 'church-news/%'
          OR name LIKE 'album/%'
        )
      )
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
      OR (
        (
          public.is_senior_pastor()
          OR public.is_pastor_story_designated_writer()
        )
        AND (
          name LIKE 'board-images/pastor_story/%'
          OR name LIKE 'board-thumbnails/pastor_story/%'
          OR name LIKE 'board-files/pastor_story/%'
          OR name LIKE 'board-images/church_news/%'
          OR name LIKE 'board-thumbnails/church_news/%'
          OR name LIKE 'board-files/church_news/%'
          OR name LIKE 'board-images/album/%'
          OR name LIKE 'board-thumbnails/album/%'
          OR name LIKE 'board-files/album/%'
          OR name LIKE 'church-news/%'
          OR name LIKE 'album/%'
        )
      )
    )
  );
