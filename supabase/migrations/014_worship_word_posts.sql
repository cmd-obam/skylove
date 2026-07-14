-- ============================================================
-- 예배말씀 게시판 (주일예배 / 엘샤다이 찬양단)
-- Supabase Dashboard → SQL Editor → Run
--
-- post_type 추가: sunday_sermon, el_shaddai_choir
-- board_posts.youtube_url 컬럼 추가
-- ============================================================

-- board_posts
ALTER TABLE public.board_posts
  DROP CONSTRAINT IF EXISTS board_posts_post_type_check;

ALTER TABLE public.board_posts
  ADD CONSTRAINT board_posts_post_type_check
  CHECK (post_type IN ('church_news', 'album', 'sunday_sermon', 'el_shaddai_choir'));

ALTER TABLE public.board_posts
  ADD COLUMN IF NOT EXISTS youtube_url text;

-- board_post_meta
ALTER TABLE public.board_post_meta
  DROP CONSTRAINT IF EXISTS board_post_meta_post_type_check;

ALTER TABLE public.board_post_meta
  ADD CONSTRAINT board_post_meta_post_type_check
  CHECK (post_type IN ('church_news', 'album', 'sunday_sermon', 'el_shaddai_choir'));

-- post_likes
ALTER TABLE public.post_likes
  DROP CONSTRAINT IF EXISTS post_likes_post_type_check;

ALTER TABLE public.post_likes
  ADD CONSTRAINT post_likes_post_type_check
  CHECK (post_type IN ('church_news', 'album', 'sunday_sermon', 'el_shaddai_choir'));

-- board_comments
ALTER TABLE public.board_comments
  DROP CONSTRAINT IF EXISTS board_comments_post_type_check;

ALTER TABLE public.board_comments
  ADD CONSTRAINT board_comments_post_type_check
  CHECK (post_type IN ('church_news', 'album', 'sunday_sermon', 'el_shaddai_choir'));

-- board_post_list 뷰가 있을 경우 새 컬럼이 포함되도록 재생성
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_views
    WHERE schemaname = 'public'
      AND viewname = 'board_post_list'
  ) THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.board_post_list AS
      SELECT
        id,
        post_type,
        title,
        writer,
        thumbnail,
        youtube_url,
        created_at
      FROM public.board_posts
    $view$;
  END IF;
END $$;
