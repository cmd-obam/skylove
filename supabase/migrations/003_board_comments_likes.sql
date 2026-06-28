-- ============================================================
-- 게시글 메타 / 추천 / 댓글 / 댓글 추천
-- Supabase Dashboard → SQL Editor → Run
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'admin', 'super_admin'));

-- ============================================================
-- 게시글 통계 (조회수 / 추천수 / 댓글수)
-- post_type: church_news | album
-- post_id: 정적 게시글 ID (예: "1")
-- ============================================================
CREATE TABLE IF NOT EXISTS public.board_post_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_type text NOT NULL CHECK (post_type IN ('church_news', 'album')),
  post_id text NOT NULL,
  views_count integer NOT NULL DEFAULT 0,
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_type, post_id)
);

CREATE INDEX IF NOT EXISTS board_post_meta_lookup_idx
  ON public.board_post_meta (post_type, post_id);

-- ============================================================
-- 게시글 추천
-- ============================================================
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_type text NOT NULL CHECK (post_type IN ('church_news', 'album')),
  post_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_type, post_id, user_id)
);

CREATE INDEX IF NOT EXISTS post_likes_lookup_idx
  ON public.post_likes (post_type, post_id);

-- ============================================================
-- 댓글
-- ============================================================
CREATE TABLE IF NOT EXISTS public.board_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_type text NOT NULL CHECK (post_type IN ('church_news', 'album')),
  post_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  author_name text NOT NULL,
  body text NOT NULL,
  is_hidden boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  is_reported boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS board_comments_lookup_idx
  ON public.board_comments (post_type, post_id, created_at DESC);

-- ============================================================
-- 댓글 추천
-- ============================================================
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.board_comments (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS comment_likes_comment_idx
  ON public.comment_likes (comment_id);

-- ============================================================
-- 헬퍼: 게시글 메타 upsert
-- ============================================================
CREATE OR REPLACE FUNCTION public.ensure_board_post_meta(
  p_post_type text,
  p_post_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_id uuid;
BEGIN
  INSERT INTO public.board_post_meta (post_type, post_id)
  VALUES (p_post_type, p_post_id)
  ON CONFLICT (post_type, post_id) DO NOTHING;

  SELECT id INTO meta_id
  FROM public.board_post_meta
  WHERE post_type = p_post_type
    AND post_id = p_post_id;

  RETURN meta_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_board_post_meta(text, text) TO anon, authenticated;

-- ============================================================
-- 조회수 증가
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_board_post_views(
  p_post_type text,
  p_post_id text
)
RETURNS public.board_post_meta
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.board_post_meta;
BEGIN
  PERFORM public.ensure_board_post_meta(p_post_type, p_post_id);

  UPDATE public.board_post_meta
  SET
    views_count = views_count + 1,
    updated_at = now()
  WHERE post_type = p_post_type
    AND post_id = p_post_id
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_board_post_views(text, text) TO anon, authenticated;

-- ============================================================
-- 추천 / 댓글 수 동기화
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_board_post_likes_count(
  p_post_type text,
  p_post_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_board_post_meta(p_post_type, p_post_id);

  UPDATE public.board_post_meta
  SET
    likes_count = (
      SELECT COUNT(*)
      FROM public.post_likes
      WHERE post_type = p_post_type
        AND post_id = p_post_id
    ),
    updated_at = now()
  WHERE post_type = p_post_type
    AND post_id = p_post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_board_post_comments_count(
  p_post_type text,
  p_post_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_board_post_meta(p_post_type, p_post_id);

  UPDATE public.board_post_meta
  SET
    comments_count = (
      SELECT COUNT(*)
      FROM public.board_comments
      WHERE post_type = p_post_type
        AND post_id = p_post_id
        AND is_hidden = false
    ),
    updated_at = now()
  WHERE post_type = p_post_type
    AND post_id = p_post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_post_like_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.sync_board_post_likes_count(NEW.post_type, NEW.post_id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_board_post_likes_count(OLD.post_type, OLD.post_id);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_board_comment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.sync_board_post_comments_count(NEW.post_type, NEW.post_id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    PERFORM public.sync_board_post_comments_count(NEW.post_type, NEW.post_id);
    IF OLD.post_type <> NEW.post_type OR OLD.post_id <> NEW.post_id THEN
      PERFORM public.sync_board_post_comments_count(OLD.post_type, OLD.post_id);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_board_post_comments_count(OLD.post_type, OLD.post_id);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS post_likes_count_sync ON public.post_likes;
CREATE TRIGGER post_likes_count_sync
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_post_like_change();

DROP TRIGGER IF EXISTS board_comments_count_sync ON public.board_comments;
CREATE TRIGGER board_comments_count_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.board_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_board_comment_change();

GRANT EXECUTE ON FUNCTION public.sync_board_post_likes_count(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_board_post_comments_count(text, text) TO authenticated;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.board_post_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read board post meta"
  ON public.board_post_meta
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can read post likes"
  ON public.post_likes
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can like posts"
  ON public.post_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own post likes"
  ON public.post_likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read visible comments"
  ON public.board_comments
  FOR SELECT
  TO anon, authenticated
  USING (
    is_hidden = false
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Authenticated users can create comments"
  ON public.board_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.board_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update comments"
  ON public.board_comments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can delete own comments"
  ON public.board_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete comments"
  ON public.board_comments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Anyone can read comment likes"
  ON public.comment_likes
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can like comments"
  ON public.comment_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own comment likes"
  ON public.comment_likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Realtime (Supabase Dashboard → Database → Replication 에서도 확인)
ALTER PUBLICATION supabase_realtime ADD TABLE public.board_post_meta;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.board_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_likes;
