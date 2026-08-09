-- ============================================================
-- 031_account_links.sql
-- 회원 계정 연결(Linked Accounts)
--
-- 대표 auth.users(primary) 하나에 여러 로그인 계정(linked)을 연결합니다.
-- 연결 시 보조 계정의 게시글·댓글·좋아요를 대표 계정으로 이관하고,
-- 연결 해제 시 transferred 스냅샷으로 원복합니다.
--
-- 핵심: public.effective_user_id()
--   - 링크가 없으면 auth.uid() 그대로 반환 → 기존 회원 동작 유지
-- ============================================================

-- ---------- 1) account_links 테이블 ----------
CREATE TABLE IF NOT EXISTS public.account_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  linked_user_id uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'email',
  linked_username text NOT NULL DEFAULT '',
  linked_email text NOT NULL DEFAULT '',
  linked_created_at timestamptz,
  previous_role text,
  transferred jsonb NOT NULL DEFAULT '{}'::jsonb,
  linked_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_links_distinct_users CHECK (primary_user_id <> linked_user_id)
);

CREATE INDEX IF NOT EXISTS account_links_primary_idx
  ON public.account_links (primary_user_id);

CREATE INDEX IF NOT EXISTS account_links_linked_idx
  ON public.account_links (linked_user_id);

COMMENT ON TABLE public.account_links IS
  '최고관리자가 연결한 동일 회원의 보조 로그인 계정. primary=대표, linked=보조.';

ALTER TABLE public.account_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage account links" ON public.account_links;
CREATE POLICY "Super admins manage account links"
  ON public.account_links
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Users can read own account links" ON public.account_links;
CREATE POLICY "Users can read own account links"
  ON public.account_links
  FOR SELECT
  TO authenticated
  USING (
    primary_user_id = auth.uid()
    OR linked_user_id = auth.uid()
  );

GRANT SELECT ON public.account_links TO authenticated;

-- ---------- 2) 해석 함수 ----------
CREATE OR REPLACE FUNCTION public.resolve_primary_user_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (
      SELECT al.primary_user_id
      FROM public.account_links AS al
      WHERE al.linked_user_id = p_user_id
      LIMIT 1
    ),
    p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.resolve_primary_user_id(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.effective_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.resolve_primary_user_id(auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.effective_user_id() TO anon, authenticated;

-- auth.users / identities 에서 provider 라벨 추출
CREATE OR REPLACE FUNCTION public.detect_auth_provider(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider text;
BEGIN
  SELECT nullif(trim(u.raw_app_meta_data->>'provider'), '')
  INTO v_provider
  FROM auth.users AS u
  WHERE u.id = p_user_id;

  IF v_provider IS NOT NULL AND v_provider <> '' AND v_provider <> 'email' THEN
    RETURN lower(v_provider);
  END IF;

  SELECT lower(trim(i.provider))
  INTO v_provider
  FROM auth.identities AS i
  WHERE i.user_id = p_user_id
    AND lower(trim(i.provider)) IS DISTINCT FROM 'email'
  ORDER BY i.created_at ASC
  LIMIT 1;

  IF v_provider IS NOT NULL AND v_provider <> '' THEN
    RETURN v_provider;
  END IF;

  RETURN 'email';
END;
$$;

GRANT EXECUTE ON FUNCTION public.detect_auth_provider(uuid) TO authenticated;

-- ---------- 3) 검색 / 목록 / 연결 / 해제 RPC ----------
DROP FUNCTION IF EXISTS public.search_linkable_accounts_for_super_admin(text);

CREATE FUNCTION public.search_linkable_accounts_for_super_admin(p_search text)
RETURNS TABLE (
  user_id uuid,
  username text,
  name text,
  email text,
  role text,
  provider text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search text := nullif(trim(coalesce(p_search, '')), '');
BEGIN
  PERFORM public.assert_super_admin();

  IF v_search IS NULL OR char_length(v_search) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.username,
    p.name,
    p.email,
    lower(trim(p.role)) AS role,
    public.detect_auth_provider(p.user_id) AS provider,
    p.created_at
  FROM public.profiles AS p
  WHERE lower(trim(p.role)) IS DISTINCT FROM 'super_admin'
    -- 이미 다른 계정의 보조로 연결된 계정 제외
    AND NOT EXISTS (
      SELECT 1
      FROM public.account_links AS al
      WHERE al.linked_user_id = p.user_id
    )
    -- 이미 다른 계정을 거느린 대표 계정 제외 (중첩 연결 방지)
    AND NOT EXISTS (
      SELECT 1
      FROM public.account_links AS al
      WHERE al.primary_user_id = p.user_id
    )
    AND (
      p.username ILIKE '%' || v_search || '%'
      OR p.email ILIKE '%' || v_search || '%'
      OR p.name ILIKE '%' || v_search || '%'
    )
  ORDER BY p.created_at DESC
  LIMIT 30;
END;
$$;

REVOKE ALL ON FUNCTION public.search_linkable_accounts_for_super_admin(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_linkable_accounts_for_super_admin(text) TO authenticated;

DROP FUNCTION IF EXISTS public.list_linked_accounts_for_super_admin(uuid);

CREATE FUNCTION public.list_linked_accounts_for_super_admin(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  username text,
  name text,
  email text,
  provider text,
  created_at timestamptz,
  is_primary boolean,
  linked_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_primary_user_id uuid;
BEGIN
  PERFORM public.assert_super_admin();

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION '대상 회원 ID가 없습니다.';
  END IF;

  v_primary_user_id := public.resolve_primary_user_id(p_user_id);

  -- 대표 계정
  RETURN QUERY
  SELECT
    p.user_id,
    p.username,
    p.name,
    p.email,
    public.detect_auth_provider(p.user_id) AS provider,
    p.created_at,
    true AS is_primary,
    NULL::timestamptz AS linked_at
  FROM public.profiles AS p
  WHERE p.user_id = v_primary_user_id;

  -- 보조 계정 (스냅샷 우선, 없으면 현재 profiles)
  RETURN QUERY
  SELECT
    al.linked_user_id AS user_id,
    coalesce(nullif(al.linked_username, ''), lp.username, '') AS username,
    coalesce(lp.name, '') AS name,
    coalesce(nullif(al.linked_email, ''), lp.email, '') AS email,
    coalesce(nullif(al.provider, ''), public.detect_auth_provider(al.linked_user_id), 'email') AS provider,
    coalesce(al.linked_created_at, lp.created_at) AS created_at,
    false AS is_primary,
    al.created_at AS linked_at
  FROM public.account_links AS al
  LEFT JOIN public.profiles AS lp ON lp.user_id = al.linked_user_id
  WHERE al.primary_user_id = v_primary_user_id
  ORDER BY al.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_linked_accounts_for_super_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_linked_accounts_for_super_admin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.link_member_account_by_super_admin(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_primary_user_id uuid;
  v_linked_user_id uuid;
  v_primary_role text;
  v_linked_role text;
  v_linked_username text;
  v_linked_email text;
  v_linked_created_at timestamptz;
  v_provider text;
  v_post_ids uuid[];
  v_comment_ids uuid[];
  v_post_like_ids uuid[];
  v_comment_like_ids uuid[];
  v_deleted_post_like_ids uuid[];
  v_deleted_comment_like_ids uuid[];
  v_transferred jsonb;
BEGIN
  v_caller := public.assert_super_admin();

  IF p_payload IS NULL THEN
    RAISE EXCEPTION '요청 데이터가 없습니다.';
  END IF;

  v_primary_user_id := nullif(trim(p_payload->>'primary_user_id'), '')::uuid;
  v_linked_user_id := nullif(trim(p_payload->>'linked_user_id'), '')::uuid;

  IF v_primary_user_id IS NULL OR v_linked_user_id IS NULL THEN
    RAISE EXCEPTION '대표 회원과 연결할 회원을 모두 지정해주세요.';
  END IF;

  IF v_primary_user_id = v_linked_user_id THEN
    RAISE EXCEPTION '같은 계정끼리는 연결할 수 없습니다.';
  END IF;

  -- 대표가 이미 다른 계정의 보조라면 그 상위 대표로 승격
  v_primary_user_id := public.resolve_primary_user_id(v_primary_user_id);

  IF v_primary_user_id = v_linked_user_id THEN
    RAISE EXCEPTION '이미 연결된 계정입니다.';
  END IF;

  SELECT lower(trim(p.role))
  INTO v_primary_role
  FROM public.profiles AS p
  WHERE p.user_id = v_primary_user_id;

  IF v_primary_role IS NULL THEN
    RAISE EXCEPTION '대표 회원을 찾을 수 없습니다.';
  END IF;

  SELECT lower(trim(p.role)), p.username, p.email, p.created_at
  INTO v_linked_role, v_linked_username, v_linked_email, v_linked_created_at
  FROM public.profiles AS p
  WHERE p.user_id = v_linked_user_id;

  IF v_linked_role IS NULL THEN
    RAISE EXCEPTION '연결할 회원을 찾을 수 없습니다.';
  END IF;

  IF v_primary_role = 'super_admin' OR v_linked_role = 'super_admin' THEN
    RAISE EXCEPTION '최고관리자 계정은 연결할 수 없습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.account_links AS al WHERE al.linked_user_id = v_linked_user_id
  ) THEN
    RAISE EXCEPTION '이미 다른 회원에 연결된 계정입니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.account_links AS al WHERE al.primary_user_id = v_linked_user_id
  ) THEN
    RAISE EXCEPTION '이미 다른 계정을 거느린 대표 회원은 보조로 연결할 수 없습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.account_links AS al
    WHERE al.primary_user_id = v_primary_user_id
      AND al.linked_user_id = v_linked_user_id
  ) THEN
    RAISE EXCEPTION '이미 연결된 계정입니다.';
  END IF;

  v_provider := public.detect_auth_provider(v_linked_user_id);

  -- 이관 대상 수집
  SELECT coalesce(array_agg(bp.id), ARRAY[]::uuid[])
  INTO v_post_ids
  FROM public.board_posts AS bp
  WHERE bp.author_id = v_linked_user_id;

  SELECT coalesce(array_agg(bc.id), ARRAY[]::uuid[])
  INTO v_comment_ids
  FROM public.board_comments AS bc
  WHERE bc.user_id = v_linked_user_id;

  SELECT coalesce(array_agg(pl.id), ARRAY[]::uuid[])
  INTO v_post_like_ids
  FROM public.post_likes AS pl
  WHERE pl.user_id = v_linked_user_id;

  SELECT coalesce(array_agg(cl.id), ARRAY[]::uuid[])
  INTO v_comment_like_ids
  FROM public.comment_likes AS cl
  WHERE cl.user_id = v_linked_user_id;

  -- 좋아요 UNIQUE 충돌 행 제거 (대표가 이미 같은 대상에 좋아요한 경우)
  WITH deleted AS (
    DELETE FROM public.post_likes AS pl
    WHERE pl.user_id = v_linked_user_id
      AND EXISTS (
        SELECT 1
        FROM public.post_likes AS primary_like
        WHERE primary_like.user_id = v_primary_user_id
          AND primary_like.post_type = pl.post_type
          AND primary_like.post_id = pl.post_id
      )
    RETURNING pl.id
  )
  SELECT coalesce(array_agg(deleted.id), ARRAY[]::uuid[])
  INTO v_deleted_post_like_ids
  FROM deleted;

  WITH deleted AS (
    DELETE FROM public.comment_likes AS cl
    WHERE cl.user_id = v_linked_user_id
      AND EXISTS (
        SELECT 1
        FROM public.comment_likes AS primary_like
        WHERE primary_like.user_id = v_primary_user_id
          AND primary_like.comment_id = cl.comment_id
      )
    RETURNING cl.id
  )
  SELECT coalesce(array_agg(deleted.id), ARRAY[]::uuid[])
  INTO v_deleted_comment_like_ids
  FROM deleted;

  -- 충돌로 삭제한 좋아요는 이관 목록에서 제외
  SELECT coalesce(array_agg(t.id), ARRAY[]::uuid[])
  INTO v_post_like_ids
  FROM unnest(v_post_like_ids) AS t(id)
  WHERE t.id <> ALL (v_deleted_post_like_ids);

  SELECT coalesce(array_agg(t.id), ARRAY[]::uuid[])
  INTO v_comment_like_ids
  FROM unnest(v_comment_like_ids) AS t(id)
  WHERE t.id <> ALL (v_deleted_comment_like_ids);

  UPDATE public.board_posts
  SET author_id = v_primary_user_id
  WHERE author_id = v_linked_user_id;

  UPDATE public.board_comments
  SET user_id = v_primary_user_id
  WHERE user_id = v_linked_user_id;

  UPDATE public.post_likes
  SET user_id = v_primary_user_id
  WHERE id = ANY (v_post_like_ids);

  UPDATE public.comment_likes
  SET user_id = v_primary_user_id
  WHERE id = ANY (v_comment_like_ids);

  -- 보조 프로필 권한을 대표와 동기화 (로그인 시 role 판별용)
  UPDATE public.profiles
  SET role = v_primary_role
  WHERE user_id = v_linked_user_id;

  v_transferred := jsonb_build_object(
    'post_ids', to_jsonb(v_post_ids),
    'comment_ids', to_jsonb(v_comment_ids),
    'post_like_ids', to_jsonb(v_post_like_ids),
    'comment_like_ids', to_jsonb(v_comment_like_ids),
    'deleted_post_like_ids', to_jsonb(v_deleted_post_like_ids),
    'deleted_comment_like_ids', to_jsonb(v_deleted_comment_like_ids)
  );

  INSERT INTO public.account_links (
    primary_user_id,
    linked_user_id,
    provider,
    linked_username,
    linked_email,
    linked_created_at,
    previous_role,
    transferred,
    linked_by
  )
  VALUES (
    v_primary_user_id,
    v_linked_user_id,
    v_provider,
    coalesce(v_linked_username, ''),
    coalesce(v_linked_email, ''),
    v_linked_created_at,
    v_linked_role,
    v_transferred,
    v_caller
  );

  RETURN jsonb_build_object(
    'success', true,
    'primary_user_id', v_primary_user_id,
    'linked_user_id', v_linked_user_id,
    'provider', v_provider,
    'message', '계정이 연결되었습니다.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.link_member_account_by_super_admin(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_member_account_by_super_admin(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.unlink_member_account_by_super_admin(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linked_user_id uuid;
  v_link public.account_links%ROWTYPE;
  v_post_ids uuid[];
  v_comment_ids uuid[];
  v_post_like_ids uuid[];
  v_comment_like_ids uuid[];
BEGIN
  PERFORM public.assert_super_admin();

  IF p_payload IS NULL THEN
    RAISE EXCEPTION '요청 데이터가 없습니다.';
  END IF;

  v_linked_user_id := nullif(trim(p_payload->>'linked_user_id'), '')::uuid;

  IF v_linked_user_id IS NULL THEN
    RAISE EXCEPTION '연결 해제할 계정 ID가 없습니다.';
  END IF;

  SELECT *
  INTO v_link
  FROM public.account_links AS al
  WHERE al.linked_user_id = v_linked_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '연결된 계정을 찾을 수 없습니다.';
  END IF;

  SELECT coalesce(array_agg(t.value::uuid), ARRAY[]::uuid[])
  INTO v_post_ids
  FROM jsonb_array_elements_text(coalesce(v_link.transferred->'post_ids', '[]'::jsonb)) AS t(value);

  SELECT coalesce(array_agg(t.value::uuid), ARRAY[]::uuid[])
  INTO v_comment_ids
  FROM jsonb_array_elements_text(coalesce(v_link.transferred->'comment_ids', '[]'::jsonb)) AS t(value);

  SELECT coalesce(array_agg(t.value::uuid), ARRAY[]::uuid[])
  INTO v_post_like_ids
  FROM jsonb_array_elements_text(coalesce(v_link.transferred->'post_like_ids', '[]'::jsonb)) AS t(value);

  SELECT coalesce(array_agg(t.value::uuid), ARRAY[]::uuid[])
  INTO v_comment_like_ids
  FROM jsonb_array_elements_text(coalesce(v_link.transferred->'comment_like_ids', '[]'::jsonb)) AS t(value);

  UPDATE public.board_posts
  SET author_id = v_linked_user_id
  WHERE id = ANY (v_post_ids);

  UPDATE public.board_comments
  SET user_id = v_linked_user_id
  WHERE id = ANY (v_comment_ids);

  -- 원복 시 대표가 같은 대상에 좋아요를 유지 중이면 충돌 행은 건너뜀
  UPDATE public.post_likes AS pl
  SET user_id = v_linked_user_id
  WHERE pl.id = ANY (v_post_like_ids)
    AND NOT EXISTS (
      SELECT 1
      FROM public.post_likes AS other
      WHERE other.user_id = v_linked_user_id
        AND other.post_type = pl.post_type
        AND other.post_id = pl.post_id
        AND other.id <> pl.id
    );

  UPDATE public.comment_likes AS cl
  SET user_id = v_linked_user_id
  WHERE cl.id = ANY (v_comment_like_ids)
    AND NOT EXISTS (
      SELECT 1
      FROM public.comment_likes AS other
      WHERE other.user_id = v_linked_user_id
        AND other.comment_id = cl.comment_id
        AND other.id <> cl.id
    );

  IF v_link.previous_role IS NOT NULL AND trim(v_link.previous_role) <> '' THEN
    UPDATE public.profiles
    SET role = lower(trim(v_link.previous_role))
    WHERE user_id = v_linked_user_id;
  END IF;

  DELETE FROM public.account_links
  WHERE id = v_link.id;

  RETURN jsonb_build_object(
    'success', true,
    'primary_user_id', v_link.primary_user_id,
    'linked_user_id', v_linked_user_id,
    'message', '계정 연결이 해제되었습니다.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.unlink_member_account_by_super_admin(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unlink_member_account_by_super_admin(jsonb) TO authenticated;

-- ---------- 4) 회원 목록: phone 복구 + 연결 개수 + 보조 계정 제외 ----------
-- RETURNS TABLE 컬럼이 바뀌므로 CREATE OR REPLACE 만으로는 교체할 수 없습니다. (42P13)
DROP FUNCTION IF EXISTS public.list_profiles_for_super_admin(text);
DROP FUNCTION IF EXISTS public.list_profiles_for_super_admin();

CREATE FUNCTION public.list_profiles_for_super_admin(p_search text DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  username text,
  name text,
  email text,
  phone text,
  role text,
  created_at timestamptz,
  linked_accounts_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search text := nullif(trim(coalesce(p_search, '')), '');
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
    p.phone,
    lower(trim(p.role)) AS role,
    p.created_at,
    (
      SELECT count(*)::integer
      FROM public.account_links AS al
      WHERE al.primary_user_id = p.user_id
    ) AS linked_accounts_count
  FROM public.profiles AS p
  WHERE NOT EXISTS (
      SELECT 1
      FROM public.account_links AS al
      WHERE al.linked_user_id = p.user_id
    )
    AND (
      v_search IS NULL
      OR p.name ILIKE '%' || v_search || '%'
      OR p.email ILIKE '%' || v_search || '%'
      OR p.username ILIKE '%' || v_search || '%'
      OR coalesce(p.phone, '') ILIKE '%' || v_search || '%'
      OR EXISTS (
        SELECT 1
        FROM public.account_links AS al
        WHERE al.primary_user_id = p.user_id
          AND (
            al.linked_username ILIKE '%' || v_search || '%'
            OR al.linked_email ILIKE '%' || v_search || '%'
          )
      )
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

-- ---------- 5) 권한 변경 시 연결된 보조 프로필 role 동기화 ----------
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

  v_target_user_id := public.resolve_primary_user_id(v_target_user_id);
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

  -- 연결된 보조 계정 프로필 role 도 동일하게 맞춤
  UPDATE public.profiles AS linked_profile
  SET role = v_new_member_role
  WHERE linked_profile.user_id IN (
    SELECT al.linked_user_id
    FROM public.account_links AS al
    WHERE al.primary_user_id = v_target_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_member_role_by_super_admin(jsonb) TO authenticated;

-- ---------- 6) 소유권 술어: auth.uid() → effective_user_id() ----------
CREATE OR REPLACE FUNCTION public.can_manage_board_post(p_author_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_board_admin()
    OR (
      public.is_board_writer()
      AND p_author_id IS NOT NULL
      AND p_author_id = public.effective_user_id()
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_board_post(uuid) TO authenticated;

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
      OR public.is_senior_pastor()
      OR public.effective_user_id() = '1e7c636b-f282-4eee-a2cd-1b6bd0aa3e2f'::uuid
    ELSE
      public.can_manage_board_post(p_author_id)
      OR public.is_senior_pastor()
      OR public.effective_user_id() = '1e7c636b-f282-4eee-a2cd-1b6bd0aa3e2f'::uuid
  END;
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_board_post_row(uuid, text) TO authenticated;

DROP POLICY IF EXISTS "Anyone can read board posts" ON public.board_posts;
CREATE POLICY "Anyone can read board posts"
  ON public.board_posts
  FOR SELECT
  TO anon, authenticated
  USING (
    (
      deleted_at IS NULL
      AND status = 'public'
    )
    OR public.is_board_admin()
    OR (
      author_id = public.effective_user_id()
      AND deleted_at IS NULL
    )
  );

CREATE OR REPLACE FUNCTION public.soft_delete_board_comment(p_comment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  UPDATE public.board_comments
  SET
    deleted_at = now(),
    deleted_by = auth.uid(),
    is_hidden = true
  WHERE id = p_comment_id
    AND deleted_at IS NULL
    AND (
      user_id = public.effective_user_id()
      OR public.is_comment_moderator()
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION '댓글을 삭제할 수 없습니다.';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_board_comment(uuid) TO authenticated;

DROP POLICY IF EXISTS "Anyone can read visible comments" ON public.board_comments;
CREATE POLICY "Anyone can read visible comments"
  ON public.board_comments
  FOR SELECT
  TO anon, authenticated
  USING (
    (
      deleted_at IS NULL
      AND is_hidden = false
    )
    OR user_id = public.effective_user_id()
    OR public.is_comment_moderator()
  );

DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.board_comments;
CREATE POLICY "Authenticated users can create comments"
  ON public.board_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.effective_user_id());

DROP POLICY IF EXISTS "Users can update own comments" ON public.board_comments;
CREATE POLICY "Users can update own comments"
  ON public.board_comments
  FOR UPDATE
  TO authenticated
  USING (user_id = public.effective_user_id())
  WITH CHECK (user_id = public.effective_user_id());

DROP POLICY IF EXISTS "Users can delete own comments" ON public.board_comments;
CREATE POLICY "Users can delete own comments"
  ON public.board_comments
  FOR DELETE
  TO authenticated
  USING (user_id = public.effective_user_id());

DROP POLICY IF EXISTS "Authenticated users can like posts" ON public.post_likes;
CREATE POLICY "Authenticated users can like posts"
  ON public.post_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.effective_user_id());

DROP POLICY IF EXISTS "Users can remove own post likes" ON public.post_likes;
CREATE POLICY "Users can remove own post likes"
  ON public.post_likes
  FOR DELETE
  TO authenticated
  USING (user_id = public.effective_user_id());

DROP POLICY IF EXISTS "Authenticated users can like comments" ON public.comment_likes;
CREATE POLICY "Authenticated users can like comments"
  ON public.comment_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.effective_user_id());

DROP POLICY IF EXISTS "Users can remove own comment likes" ON public.comment_likes;
CREATE POLICY "Users can remove own comment likes"
  ON public.comment_likes
  FOR DELETE
  TO authenticated
  USING (user_id = public.effective_user_id());

NOTIFY pgrst, 'reload schema';
