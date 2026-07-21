-- ============================================================
-- 회원 상세정보 RPC 확장 (SQL Editor에서 단독 실행 가능)
-- 선행: 021_super_admin_content_cms.sql (assert_super_admin)
-- ============================================================

DROP FUNCTION IF EXISTS public.get_member_detail_for_super_admin(uuid);

CREATE OR REPLACE FUNCTION public.get_member_detail_for_super_admin(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  username text,
  name text,
  email text,
  phone text,
  birth_date date,
  congregant_type text,
  attending_church text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  posts_count bigint,
  comments_count bigint,
  received_likes_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_super_admin();

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION '대상 회원 ID가 없습니다.';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.username,
    p.name,
    p.email,
    p.phone,
    p.birth_date,
    p.congregant_type,
    p.attending_church,
    lower(trim(p.role)) AS role,
    p.created_at,
    u.last_sign_in_at,
    (
      SELECT count(*)::bigint
      FROM public.board_posts bp
      WHERE bp.author_id = p.user_id
        AND bp.deleted_at IS NULL
    ) AS posts_count,
    (
      SELECT count(*)::bigint
      FROM public.board_comments bc
      WHERE bc.user_id = p.user_id
        AND bc.deleted_at IS NULL
    ) AS comments_count,
    (
      (
        SELECT count(*)::bigint
        FROM public.post_likes pl
        INNER JOIN public.board_posts bp
          ON bp.post_type = pl.post_type
         AND bp.id::text = pl.post_id
        WHERE bp.author_id = p.user_id
          AND bp.deleted_at IS NULL
      )
      +
      (
        SELECT count(*)::bigint
        FROM public.comment_likes cl
        INNER JOIN public.board_comments bc
          ON bc.id = cl.comment_id
        WHERE bc.user_id = p.user_id
          AND bc.deleted_at IS NULL
      )
    ) AS received_likes_count
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE p.user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_detail_for_super_admin(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
