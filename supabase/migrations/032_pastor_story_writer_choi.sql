-- ============================================================
-- 담임목사 이야기 글쓰기: 최석림(senior_pastor) 권한 보정
--
-- 현황: 최석림 계정이 admin 으로 남아 pastor_story 글쓰기에서 제외됨
--       (pastor_story 는 super_admin / senior_pastor 만 허용)
-- 조치:
--   1) user_id 기준 senior_pastor 로 변경 (관리자/매니저 권한 제거)
--   2) is_senior_pastor 가 account_links 대표 계정을 보도록 보정
--   3) can_write_board_post / storage 에 최석림 user_id 예외 보강
-- ============================================================

-- ---------- 1) 최석림 → senior_pastor ----------
-- username: rim0691 / name: 최석림
UPDATE public.profiles
SET role = 'senior_pastor'
WHERE user_id = '1e7c636b-f282-4eee-a2cd-1b6bd0aa3e2f'::uuid
  AND username = 'rim0691'
  AND name = '최석림';

-- ---------- 2) senior_pastor 판별: effective_user_id ----------
CREATE OR REPLACE FUNCTION public.is_senior_pastor()
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
      AND lower(trim(role)) = 'senior_pastor'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_senior_pastor() TO anon, authenticated;

-- ---------- 3) pastor_story 지정 작성자 (최석림 user_id) ----------
CREATE OR REPLACE FUNCTION public.is_pastor_story_designated_writer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.effective_user_id() = '1e7c636b-f282-4eee-a2cd-1b6bd0aa3e2f'::uuid;
$$;

GRANT EXECUTE ON FUNCTION public.is_pastor_story_designated_writer() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_pastor_story_writer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_super_admin()
    OR public.is_senior_pastor()
    OR public.is_pastor_story_designated_writer();
$$;

GRANT EXECUTE ON FUNCTION public.is_pastor_story_writer() TO anon, authenticated;

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
  END;
$$;

GRANT EXECUTE ON FUNCTION public.can_write_board_post(text) TO authenticated;

-- ---------- 4) pastor_story 관리: 최고관리자 또는 본인 작성자 ----------
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
    ELSE
      public.can_manage_board_post(p_author_id)
  END;
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_board_post_row(uuid, text) TO authenticated;

-- ---------- 5) Storage: 지정 작성자도 pastor_story 경로만 ----------
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
        )
      )
    )
  );
