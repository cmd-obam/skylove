-- ============================================================
-- CMS: permanent (hard) delete for selected posts/comments
-- action: purge | hard_delete | permanent_delete
-- Supabase Dashboard → SQL Editor → Run
-- ============================================================

CREATE OR REPLACE FUNCTION public.bulk_update_posts_for_super_admin(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_action text := lower(trim(coalesce(p_payload->>'action', '')));
  v_ids uuid[];
  v_count int := 0;
  v_post_id_texts text[];
BEGIN
  v_uid := public.assert_cms_admin();

  SELECT coalesce(array_agg(value::uuid), ARRAY[]::uuid[])
  INTO v_ids
  FROM jsonb_array_elements_text(coalesce(p_payload->'ids', '[]'::jsonb));

  IF array_length(v_ids, 1) IS NULL THEN
    RAISE EXCEPTION '선택된 게시글이 없습니다.';
  END IF;

  IF v_action = 'hide' OR v_action = 'private' THEN
    UPDATE public.board_posts
    SET
      status = 'private',
      scheduled_at = NULL
    WHERE id = ANY (v_ids)
      AND deleted_at IS NULL;
  ELSIF v_action = 'publish' OR v_action = 'public' THEN
    UPDATE public.board_posts
    SET
      status = 'public',
      scheduled_at = NULL
    WHERE id = ANY (v_ids)
      AND deleted_at IS NULL;
  ELSIF v_action = 'delete' OR v_action = 'trash' THEN
    UPDATE public.board_posts
    SET
      deleted_at = now(),
      deleted_by = v_uid
    WHERE id = ANY (v_ids)
      AND deleted_at IS NULL;
  ELSIF v_action = 'restore' THEN
    UPDATE public.board_posts
    SET
      deleted_at = NULL,
      deleted_by = NULL
    WHERE id = ANY (v_ids)
      AND deleted_at IS NOT NULL;
  ELSIF v_action IN ('purge', 'hard_delete', 'permanent_delete') THEN
    SELECT array_agg(id::text)
    INTO v_post_id_texts
    FROM unnest(v_ids) AS id;

    -- Notes on comments under these posts
    DELETE FROM public.admin_content_notes n
    USING public.board_comments c
    WHERE n.target_type = 'comment'
      AND n.target_id = c.id
      AND c.post_id = ANY (v_post_id_texts);

    -- Comments (comment_likes cascade)
    DELETE FROM public.board_comments
    WHERE post_id = ANY (v_post_id_texts);

    DELETE FROM public.post_likes
    WHERE post_id = ANY (v_post_id_texts);

    DELETE FROM public.board_post_meta
    WHERE post_id = ANY (v_post_id_texts);

    DELETE FROM public.admin_content_notes
    WHERE target_type = 'post'
      AND target_id = ANY (v_ids);

    DELETE FROM public.board_posts
    WHERE id = ANY (v_ids);
  ELSE
    RAISE EXCEPTION '지원하지 않는 작업입니다. (action: %)', v_action;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'affected', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_update_posts_for_super_admin(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.bulk_update_comments_for_super_admin(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_action text := lower(trim(coalesce(p_payload->>'action', '')));
  v_ids uuid[];
  v_count int := 0;
BEGIN
  v_uid := public.assert_cms_admin();

  SELECT coalesce(array_agg(value::uuid), ARRAY[]::uuid[])
  INTO v_ids
  FROM jsonb_array_elements_text(coalesce(p_payload->'ids', '[]'::jsonb));

  IF array_length(v_ids, 1) IS NULL THEN
    RAISE EXCEPTION '선택된 댓글이 없습니다.';
  END IF;

  IF v_action = 'hide' OR v_action = 'private' THEN
    UPDATE public.board_comments
    SET is_hidden = true
    WHERE id = ANY (v_ids)
      AND deleted_at IS NULL;
  ELSIF v_action = 'publish' OR v_action = 'public' THEN
    UPDATE public.board_comments
    SET is_hidden = false
    WHERE id = ANY (v_ids)
      AND deleted_at IS NULL;
  ELSIF v_action = 'delete' OR v_action = 'trash' THEN
    UPDATE public.board_comments
    SET
      deleted_at = now(),
      deleted_by = v_uid,
      is_hidden = true
    WHERE id = ANY (v_ids)
      AND deleted_at IS NULL;
  ELSIF v_action = 'restore' THEN
    UPDATE public.board_comments
    SET
      deleted_at = NULL,
      deleted_by = NULL,
      is_hidden = false
    WHERE id = ANY (v_ids)
      AND deleted_at IS NOT NULL;
  ELSIF v_action IN ('purge', 'hard_delete', 'permanent_delete') THEN
    DELETE FROM public.admin_content_notes
    WHERE target_type = 'comment'
      AND target_id = ANY (v_ids);

    DELETE FROM public.board_comments
    WHERE id = ANY (v_ids);
  ELSE
    RAISE EXCEPTION '지원하지 않는 작업입니다. (action: %)', v_action;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'affected', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_update_comments_for_super_admin(jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
