-- ============================================================
-- Board CMS: has_image, attachments jsonb, list view update
-- Supabase Dashboard → SQL Editor → Run
-- ============================================================

ALTER TABLE public.board_posts
  ADD COLUMN IF NOT EXISTS has_image boolean NOT NULL DEFAULT false;

ALTER TABLE public.board_posts
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Backfill has_image from existing thumbnail / album images
UPDATE public.board_posts
SET has_image = true
WHERE has_image = false
  AND (
    (thumbnail IS NOT NULL AND btrim(thumbnail) <> '')
    OR (jsonb_typeof(images) = 'array' AND jsonb_array_length(images) > 0)
  );

-- Backfill attachments from legacy single attachment columns
UPDATE public.board_posts
SET attachments = jsonb_build_array(
  jsonb_build_object(
    'url', attachment_url,
    'path', NULL,
    'name', COALESCE(NULLIF(attachment_name, ''), '첨부파일'),
    'size', NULL,
    'mime', NULL
  )
)
WHERE attachment_url IS NOT NULL
  AND btrim(attachment_url) <> ''
  AND (
    attachments IS NULL
    OR attachments = '[]'::jsonb
  );

-- board_post_list: include has_image for list icons
DROP VIEW IF EXISTS public.board_post_list;

CREATE VIEW public.board_post_list AS
SELECT
  id,
  post_type,
  title,
  writer,
  thumbnail,
  created_at,
  youtube_url,
  has_image
FROM public.board_posts;

GRANT SELECT ON public.board_post_list TO anon, authenticated;

COMMENT ON COLUMN public.board_posts.has_image IS
  'True when the post has a representative image or body/album images.';

COMMENT ON COLUMN public.board_posts.attachments IS
  'Downloadable attachments jsonb: [{url,path,name,size,mime}]. Body images are not included.';
