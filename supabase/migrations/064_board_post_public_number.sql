-- ============================================================
-- 게시글 공개 번호 (post_no)
-- UUID 기본 키 id 는 유지합니다.
-- 기존 행, 댓글, 좋아요, 첨부 파일은 삭제하거나 다시 만들지 않습니다.
--
-- 번호는 created_at, id 오름차순으로 한 번만 부여합니다.
-- 이미 번호가 있는 행은 다시 매기지 않습니다.
-- Supabase Dashboard → SQL Editor → Run
-- ============================================================

BEGIN;

LOCK TABLE public.board_posts IN SHARE ROW EXCLUSIVE MODE;

ALTER TABLE public.board_posts
  ADD COLUMN IF NOT EXISTS post_no bigint;

WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS n
  FROM public.board_posts
  WHERE post_no IS NULL
),
base AS (
  SELECT COALESCE(MAX(post_no), 0) AS max_no
  FROM public.board_posts
)
UPDATE public.board_posts AS posts
SET post_no = numbered.n + base.max_no
FROM numbered
CROSS JOIN base
WHERE posts.id = numbered.id;

ALTER TABLE public.board_posts
  ALTER COLUMN post_no SET NOT NULL;

ALTER TABLE public.board_posts
  DROP CONSTRAINT IF EXISTS board_posts_post_no_key;

ALTER TABLE public.board_posts
  ADD CONSTRAINT board_posts_post_no_key UNIQUE (post_no);

CREATE SEQUENCE IF NOT EXISTS public.board_posts_post_no_seq;

DO $$
DECLARE
  v_max bigint;
BEGIN
  SELECT MAX(post_no) INTO v_max FROM public.board_posts;

  IF v_max IS NULL THEN
    PERFORM setval('public.board_posts_post_no_seq', 1, false);
  ELSE
    PERFORM setval('public.board_posts_post_no_seq', v_max, true);
  END IF;
END $$;

ALTER TABLE public.board_posts
  ALTER COLUMN post_no SET DEFAULT nextval('public.board_posts_post_no_seq');

ALTER SEQUENCE public.board_posts_post_no_seq OWNED BY public.board_posts.post_no;

GRANT USAGE, SELECT ON SEQUENCE public.board_posts_post_no_seq TO authenticated;

COMMENT ON COLUMN public.board_posts.post_no IS
  '공개 URL에 쓰는 고유 번호. 기본 키 id(UUID)와 댓글/좋아요 post_id 는 바꾸지 않습니다.';

DROP VIEW IF EXISTS public.board_post_list;

CREATE VIEW public.board_post_list AS
SELECT
  id,
  post_no,
  post_type,
  title,
  writer,
  thumbnail,
  created_at,
  youtube_url,
  has_image,
  author_id,
  status,
  is_notice,
  deleted_at
FROM public.board_posts
WHERE deleted_at IS NULL
  AND purged_at IS NULL
  AND status = 'public';

GRANT SELECT ON public.board_post_list TO anon, authenticated;

COMMIT;
