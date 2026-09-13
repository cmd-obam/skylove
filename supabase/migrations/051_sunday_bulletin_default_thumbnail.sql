-- ============================================================
-- 주보(sunday_bulletin) 기본 표지 대표이미지 백필
-- public/images/sunday-bulletin-cover.png
-- ============================================================

CREATE OR REPLACE FUNCTION public.backfill_sunday_bulletin_thumbnails(p_thumbnail text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer := 0;
BEGIN
  IF p_thumbnail IS NULL OR btrim(p_thumbnail) = '' THEN
    RAISE EXCEPTION 'thumbnail url is required';
  END IF;

  IF NOT (
    public.is_board_admin()
    OR public.is_board_writer()
    OR public.is_senior_pastor()
  ) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  UPDATE public.board_posts
  SET
    thumbnail = btrim(p_thumbnail),
    has_image = true,
    updated_at = now()
  WHERE post_type = 'church_news'
    AND deleted_at IS NULL
    AND purged_at IS NULL
    AND content LIKE '%"__type":"sunday_bulletin"%'
    AND (
      thumbnail IS NULL
      OR btrim(thumbnail) = ''
      OR thumbnail IS DISTINCT FROM btrim(p_thumbnail)
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_sunday_bulletin_thumbnails(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_sunday_bulletin_thumbnails(text) TO authenticated;

-- 즉시 1회 백필 (anon/service 롤로 SQL 에디터에서 실행 시)
UPDATE public.board_posts
SET
  thumbnail = '/images/sunday-bulletin-cover.png',
  has_image = true,
  updated_at = now()
WHERE post_type = 'church_news'
  AND deleted_at IS NULL
  AND purged_at IS NULL
  AND content LIKE '%"__type":"sunday_bulletin"%'
  AND (
    thumbnail IS NULL
    OR btrim(thumbnail) = ''
    OR thumbnail IS DISTINCT FROM '/images/sunday-bulletin-cover.png'
  );
