-- ============================================================
-- 게시글 (교회소식 / 교회앨범) + Storage
-- Supabase Dashboard → SQL Editor → Run
--
-- 선행 조건: 004_add_role_column.sql, 003_board_comments_likes.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_board_admin()
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
      AND role IN ('admin', 'super_admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_board_admin() TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.board_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_type text NOT NULL CHECK (post_type IN ('church_news', 'album')),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  writer text NOT NULL,
  attachment_url text,
  attachment_name text,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  thumbnail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS board_posts_type_created_idx
  ON public.board_posts (post_type, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_board_posts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS board_posts_updated_at ON public.board_posts;
CREATE TRIGGER board_posts_updated_at
  BEFORE UPDATE ON public.board_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_board_posts_updated_at();

ALTER TABLE public.board_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read board posts" ON public.board_posts;
CREATE POLICY "Anyone can read board posts"
  ON public.board_posts
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert board posts" ON public.board_posts;
CREATE POLICY "Admins can insert board posts"
  ON public.board_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_board_admin());

DROP POLICY IF EXISTS "Admins can update board posts" ON public.board_posts;
CREATE POLICY "Admins can update board posts"
  ON public.board_posts
  FOR UPDATE
  TO authenticated
  USING (public.is_board_admin())
  WITH CHECK (public.is_board_admin());

DROP POLICY IF EXISTS "Admins can delete board posts" ON public.board_posts;
CREATE POLICY "Admins can delete board posts"
  ON public.board_posts
  FOR DELETE
  TO authenticated
  USING (public.is_board_admin());

INSERT INTO storage.buckets (id, name, public)
VALUES ('board-uploads', 'board-uploads', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can read board uploads" ON storage.objects;
CREATE POLICY "Anyone can read board uploads"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'board-uploads');

DROP POLICY IF EXISTS "Admins can upload board files" ON storage.objects;
CREATE POLICY "Admins can upload board files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'board-uploads'
    AND public.is_board_admin()
  );

DROP POLICY IF EXISTS "Admins can update board files" ON storage.objects;
CREATE POLICY "Admins can update board files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'board-uploads' AND public.is_board_admin())
  WITH CHECK (bucket_id = 'board-uploads' AND public.is_board_admin());

DROP POLICY IF EXISTS "Admins can delete board files" ON storage.objects;
CREATE POLICY "Admins can delete board files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'board-uploads' AND public.is_board_admin());

NOTIFY pgrst, 'reload schema';
