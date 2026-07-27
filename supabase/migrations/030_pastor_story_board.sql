-- ============================================================
-- 담임목사 이야기 게시판 (pastor_story)
-- + senior_pastor 역할 (글쓰기: 최고관리자 · 담임목사만)
--
-- 기존 게시판 권한(is_board_writer / is_board_admin 등)은 유지하고,
-- pastor_story post_type 에만 예외 정책을 추가합니다.
-- Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ---------- 1) profiles.role: senior_pastor ----------
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('member', 'manager', 'admin', 'super_admin', 'senior_pastor'));

-- ---------- 2) post_type CHECK: pastor_story ----------
ALTER TABLE public.board_posts
  DROP CONSTRAINT IF EXISTS board_posts_post_type_check;

ALTER TABLE public.board_posts
  ADD CONSTRAINT board_posts_post_type_check
  CHECK (post_type IN (
    'church_news',
    'album',
    'sunday_sermon',
    'el_shaddai_choir',
    'pastor_story'
  ));

ALTER TABLE public.board_post_meta
  DROP CONSTRAINT IF EXISTS board_post_meta_post_type_check;

ALTER TABLE public.board_post_meta
  ADD CONSTRAINT board_post_meta_post_type_check
  CHECK (post_type IN (
    'church_news',
    'album',
    'sunday_sermon',
    'el_shaddai_choir',
    'pastor_story'
  ));

ALTER TABLE public.post_likes
  DROP CONSTRAINT IF EXISTS post_likes_post_type_check;

ALTER TABLE public.post_likes
  ADD CONSTRAINT post_likes_post_type_check
  CHECK (post_type IN (
    'church_news',
    'album',
    'sunday_sermon',
    'el_shaddai_choir',
    'pastor_story'
  ));

ALTER TABLE public.board_comments
  DROP CONSTRAINT IF EXISTS board_comments_post_type_check;

ALTER TABLE public.board_comments
  ADD CONSTRAINT board_comments_post_type_check
  CHECK (post_type IN (
    'church_news',
    'album',
    'sunday_sermon',
    'el_shaddai_choir',
    'pastor_story'
  ));

-- ---------- 3) CMS label ----------
CREATE OR REPLACE FUNCTION public.board_type_label(p_post_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_post_type
    WHEN 'church_news' THEN '교회소식'
    WHEN 'album' THEN '교회앨범'
    WHEN 'sunday_sermon' THEN '주일예배'
    WHEN 'el_shaddai_choir' THEN '엘샤다이 찬양단'
    WHEN 'pastor_story' THEN '담임목사 이야기'
    ELSE coalesce(p_post_type, '')
  END;
$$;

-- ---------- 4) Helper: senior pastor / super admin ----------
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
    WHERE user_id = auth.uid()
      AND lower(trim(role)) = 'senior_pastor'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_senior_pastor() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND lower(trim(role)) = 'super_admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated;

-- 게시판별 글쓰기 (pastor_story만 예외)
CREATE OR REPLACE FUNCTION public.can_write_board_post(p_post_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_post_type = 'pastor_story' THEN
      public.is_super_admin() OR public.is_senior_pastor()
    ELSE
      public.is_board_writer()
  END;
$$;

GRANT EXECUTE ON FUNCTION public.can_write_board_post(text) TO authenticated;

-- 게시글 관리 (pastor_story만 예외: 최고관리자 또는 본인 담임목사)
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
        public.is_senior_pastor()
        AND p_author_id IS NOT NULL
        AND p_author_id = auth.uid()
      )
    ELSE
      public.can_manage_board_post(p_author_id)
  END;
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_board_post_row(uuid, text) TO authenticated;

-- ---------- 5) board_posts RLS (insert/update/delete만 조정) ----------
DROP POLICY IF EXISTS "Board writers can insert board posts" ON public.board_posts;
CREATE POLICY "Board writers can insert board posts"
  ON public.board_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_write_board_post(post_type));

DROP POLICY IF EXISTS "Board staff can update board posts" ON public.board_posts;
CREATE POLICY "Board staff can update board posts"
  ON public.board_posts
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_board_post_row(author_id, post_type))
  WITH CHECK (public.can_manage_board_post_row(author_id, post_type));

DROP POLICY IF EXISTS "Board staff can delete board posts" ON public.board_posts;
CREATE POLICY "Board staff can delete board posts"
  ON public.board_posts
  FOR DELETE
  TO authenticated
  USING (public.can_manage_board_post_row(author_id, post_type));

-- ---------- 6) Storage: senior_pastor는 pastor_story 경로만 ----------
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
        public.is_senior_pastor()
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
        public.is_senior_pastor()
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
        public.is_senior_pastor()
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
        public.is_senior_pastor()
        AND (
          name LIKE 'board-images/pastor_story/%'
          OR name LIKE 'board-thumbnails/pastor_story/%'
          OR name LIKE 'board-files/pastor_story/%'
        )
      )
    )
  );

-- ---------- 7) 회원 권한 변경: senior_pastor 부여 가능 ----------
CREATE OR REPLACE FUNCTION public.update_member_role_by_super_admin(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid uuid;
  v_target_user_id uuid;
  v_target_member_role text;
  v_new_member_role text;
  v_raw_new_role text;
BEGIN
  v_caller_uid := auth.uid();

  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles AS caller
    WHERE caller.user_id = v_caller_uid
      AND lower(trim(caller.role)) = 'super_admin'
  ) THEN
    RAISE EXCEPTION '접근 권한이 없습니다. (현재 role: %)',
      coalesce(
        (
          SELECT lower(trim(caller.role))
          FROM public.profiles AS caller
          WHERE caller.user_id = v_caller_uid
        ),
        '없음'
      );
  END IF;

  IF p_payload IS NULL THEN
    RAISE EXCEPTION '요청 데이터가 없습니다.';
  END IF;

  v_target_user_id := nullif(trim(p_payload->>'target_user_id'), '')::uuid;
  v_raw_new_role := p_payload->>'new_role';

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION '대상 회원 ID가 없습니다. (payload: %)', p_payload::text;
  END IF;

  v_new_member_role := lower(trim(coalesce(v_raw_new_role, '')));

  IF v_new_member_role NOT IN ('member', 'manager', 'admin', 'senior_pastor') THEN
    RAISE EXCEPTION '변경할 수 없는 권한입니다. (요청 role: %)', coalesce(v_raw_new_role, 'NULL');
  END IF;

  SELECT lower(trim(target.role))
  INTO v_target_member_role
  FROM public.profiles AS target
  WHERE target.user_id = v_target_user_id;

  IF v_target_member_role IS NULL THEN
    RAISE EXCEPTION '회원을 찾을 수 없습니다. (user_id: %)', v_target_user_id;
  END IF;

  IF v_target_member_role = 'super_admin' THEN
    RAISE EXCEPTION '최고관리자 권한은 변경할 수 없습니다.';
  END IF;

  IF v_target_member_role NOT IN ('member', 'manager', 'admin', 'senior_pastor') THEN
    RAISE EXCEPTION '변경할 수 없는 권한입니다. (현재 role: %)', v_target_member_role;
  END IF;

  IF v_target_member_role = v_new_member_role THEN
    RAISE EXCEPTION '이미 % 권한입니다.', v_new_member_role;
  END IF;

  UPDATE public.profiles AS target
  SET role = v_new_member_role
  WHERE target.user_id = v_target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_member_role_by_super_admin(jsonb) TO authenticated;

-- ---------- 8) 회원 목록 정렬에 senior_pastor 반영 ----------
CREATE OR REPLACE FUNCTION public.list_profiles_for_super_admin(p_search text DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  username text,
  name text,
  email text,
  role text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION '접근 권한이 없습니다.';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.username,
    p.name,
    p.email,
    lower(trim(p.role)) AS role,
    p.created_at
  FROM public.profiles AS p
  WHERE (
    p_search IS NULL
    OR trim(p_search) = ''
    OR p.name ILIKE '%' || trim(p_search) || '%'
    OR p.email ILIKE '%' || trim(p_search) || '%'
  )
  ORDER BY
    CASE lower(trim(p.role))
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'senior_pastor' THEN 3
      WHEN 'manager' THEN 4
      WHEN 'member' THEN 5
      ELSE 6
    END,
    p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_profiles_for_super_admin(text) TO authenticated;
