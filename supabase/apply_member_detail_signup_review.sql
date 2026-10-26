-- ============================================================
-- Super-admin member detail: signup path, confirmation, similar accounts.
-- Does not delete, merge, or rewrite member rows.
-- Clock and auth data come from the database, not the browser.
-- ============================================================

CREATE OR REPLACE FUNCTION public.member_auth_review(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_auth_email text;
  v_auth_created timestamptz;
  v_confirmed_at timestamptz;
  v_last_sign_in timestamptz;
  v_providers text[] := ARRAY[]::text[];
  v_path text := '확인 불가';
  v_incomplete boolean := true;
  v_email text;
  v_username text;
  v_name text;
  v_local text;
  v_username_stem text;
  v_related jsonb := '[]'::jsonb;
  v_similar integer := 0;
  v_visits integer := 0;
  v_last_visit timestamptz;
  v_visit_ok boolean := false;
  v_labels text[] := ARRAY[]::text[];
BEGIN
  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE user_id = p_user_id;

  SELECT
    u.email,
    u.created_at,
    u.email_confirmed_at,
    u.last_sign_in_at
  INTO v_auth_email, v_auth_created, v_confirmed_at, v_last_sign_in
  FROM auth.users AS u
  WHERE u.id = p_user_id;

  SELECT coalesce(array_agg(DISTINCT lower(btrim(i.provider)) ORDER BY lower(btrim(i.provider))), ARRAY[]::text[])
  INTO v_providers
  FROM auth.identities AS i
  WHERE i.user_id = p_user_id
    AND nullif(btrim(i.provider), '') IS NOT NULL;

  IF v_providers IS NULL THEN
    v_providers := ARRAY[]::text[];
  END IF;

  IF cardinality(v_providers) = 0 THEN
    v_path := '확인 불가';
  ELSIF 'kakao' = ANY (v_providers) AND NOT ('email' = ANY (v_providers)) THEN
    v_path := '카카오 간편가입';
  ELSIF 'email' = ANY (v_providers) AND NOT ('kakao' = ANY (v_providers)) THEN
    v_path := '이메일 회원가입';
  ELSIF 'email' = ANY (v_providers) AND 'kakao' = ANY (v_providers) THEN
    v_path := '이메일 회원가입 · 카카오 간편가입';
  ELSE
    v_path := '확인 불가';
  END IF;

  v_email := nullif(btrim(coalesce(v_profile.email, v_auth_email, '')), '');
  v_username := nullif(btrim(coalesce(v_profile.username, '')), '');
  v_name := nullif(btrim(coalesce(v_profile.name, '')), '');
  v_local := nullif(lower(split_part(coalesce(v_email, ''), '@', 1)), '');
  v_username_stem := nullif(lower(regexp_replace(coalesce(v_username, ''), '_[0-9]+$', '')), '');

  v_incomplete := v_profile.user_id IS NULL
    OR v_name IS NULL
    OR v_name = '회원'
    OR v_username IS NULL
    OR v_email IS NULL;

  SELECT coalesce(jsonb_agg(item ORDER BY item->>'username'), '[]'::jsonb)
  INTO v_related
  FROM (
    SELECT jsonb_build_object(
      'user_id', other.user_id,
      'username', other.username,
      'name', other.name,
      'reason', CASE
        WHEN v_email IS NOT NULL AND lower(btrim(other.email)) = lower(v_email) THEN '같은 이메일'
        WHEN v_username_stem IS NOT NULL
          AND length(v_username_stem) >= 4
          AND lower(regexp_replace(other.username, '_[0-9]+$', '')) = v_username_stem
          THEN '비슷한 아이디'
        ELSE '이메일 앞부분과 같은 아이디'
      END
    ) AS item
    FROM public.profiles AS other
    WHERE other.user_id IS DISTINCT FROM p_user_id
      AND (
        (v_email IS NOT NULL AND lower(btrim(other.email)) = lower(v_email))
        OR (
          v_username_stem IS NOT NULL
          AND length(v_username_stem) >= 4
          AND lower(regexp_replace(coalesce(other.username, ''), '_[0-9]+$', '')) = v_username_stem
        )
        OR (
          v_local IS NOT NULL
          AND length(v_local) >= 4
          AND lower(btrim(coalesce(other.username, ''))) = v_local
        )
        OR (
          v_username IS NOT NULL
          AND length(v_username) >= 4
          AND lower(split_part(coalesce(other.email, ''), '@', 1)) = lower(v_username)
        )
      )
    LIMIT 20
  ) AS related_rows;

  v_similar := coalesce(jsonb_array_length(v_related), 0);

  BEGIN
    SELECT
      coalesce(sum(src.visit_count), 0)::integer,
      max(src.last_visit_at)
    INTO v_visits, v_last_visit
    FROM (
      SELECT count(*)::integer AS visit_count, max(t.last_visit_at) AS last_visit_at
      FROM public.site_traffic_events AS t
      WHERE t.user_id = p_user_id
      UNION ALL
      SELECT count(*)::integer, max(s.started_at)
      FROM public.site_analytics_sessions AS s
      WHERE s.user_id = p_user_id
    ) AS src;

    v_visit_ok := true;
  EXCEPTION
    WHEN undefined_table OR undefined_column THEN
      v_visits := 0;
      v_last_visit := NULL;
      v_visit_ok := false;
  END;

  IF v_auth_created IS NOT NULL AND v_confirmed_at IS NULL THEN
    v_labels := array_append(v_labels, '이메일 미인증');
  END IF;

  IF v_similar > 0 THEN
    v_labels := array_append(v_labels, '유사 계정');
  END IF;

  IF v_incomplete THEN
    v_labels := array_append(v_labels, '프로필 불완전');
  END IF;

  IF v_path = '확인 불가' THEN
    v_labels := array_append(v_labels, '가입 경로 확인 불가');
  END IF;

  IF cardinality(v_labels) = 0 THEN
    v_labels := ARRAY['정상']::text[];
  ELSE
    v_labels := array_append(v_labels, '추가 조사');
  END IF;

  RETURN jsonb_build_object(
    'email_confirmed', CASE WHEN v_auth_created IS NULL THEN NULL ELSE v_confirmed_at IS NOT NULL END,
    'email_confirmed_at', v_confirmed_at,
    'auth_created_at', v_auth_created,
    'last_sign_in_at', v_last_sign_in,
    'auth_providers', array_to_string(v_providers, ', '),
    'signup_path', v_path,
    'has_email_login', CASE
      WHEN v_auth_created IS NULL AND cardinality(v_providers) = 0 THEN NULL
      ELSE 'email' = ANY (v_providers)
    END,
    'has_kakao_login', CASE
      WHEN v_auth_created IS NULL AND cardinality(v_providers) = 0 THEN NULL
      ELSE 'kakao' = ANY (v_providers)
    END,
    'profile_incomplete', v_incomplete,
    'similar_account_count', v_similar,
    'related_accounts', v_related,
    'visit_count', v_visits,
    'last_visit_at', v_last_visit,
    'visit_log_available', v_visit_ok,
    'review_labels', array_to_string(v_labels, ',')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.member_auth_review(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.member_auth_review(uuid) FROM anon, authenticated;

DROP FUNCTION IF EXISTS public.list_profiles_for_super_admin(text);

CREATE FUNCTION public.list_profiles_for_super_admin(p_search text DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  username text,
  name text,
  nickname text,
  email text,
  phone text,
  role text,
  created_at timestamptz,
  linked_accounts_count integer,
  email_confirmed boolean,
  last_sign_in_at timestamptz,
  signup_path text,
  similar_account_count integer,
  profile_incomplete boolean,
  review_labels text
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
    nullif(btrim(p.nickname), '') AS nickname,
    p.email,
    p.phone,
    lower(trim(p.role)) AS role,
    p.created_at,
    (
      SELECT count(*)::integer
      FROM public.account_links AS al
      WHERE al.primary_user_id = p.user_id
    ) AS linked_accounts_count,
    (review.facts ->> 'email_confirmed')::boolean,
    nullif(review.facts ->> 'last_sign_in_at', '')::timestamptz,
    coalesce(review.facts ->> 'signup_path', '확인 불가'),
    coalesce((review.facts ->> 'similar_account_count')::integer, 0),
    coalesce((review.facts ->> 'profile_incomplete')::boolean, false),
    coalesce(review.facts ->> 'review_labels', '추가 조사')
  FROM public.profiles AS p
  LEFT JOIN LATERAL (
    SELECT public.member_auth_review(p.user_id) AS facts
  ) AS review ON true
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
      OR coalesce(p.nickname, '') ILIKE '%' || v_search || '%'
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

DROP FUNCTION IF EXISTS public.get_member_detail_for_super_admin(uuid);

CREATE FUNCTION public.get_member_detail_for_super_admin(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  username text,
  name text,
  nickname text,
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
  received_likes_count bigint,
  email_confirmed boolean,
  auth_created_at timestamptz,
  signup_path text,
  auth_providers text,
  has_email_login boolean,
  has_kakao_login boolean,
  profile_incomplete boolean,
  similar_account_count integer,
  related_accounts jsonb,
  visit_count integer,
  last_visit_at timestamptz,
  visit_log_available boolean,
  review_labels text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_review jsonb;
  v_posts bigint := 0;
  v_comments bigint := 0;
  v_likes bigint := 0;
BEGIN
  PERFORM public.assert_super_admin();

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION '대상 회원 ID가 없습니다.';
  END IF;

  v_review := public.member_auth_review(p_user_id);

  BEGIN
    SELECT count(*)::bigint
    INTO v_posts
    FROM public.board_posts AS bp
    WHERE bp.author_id = p_user_id
      AND bp.deleted_at IS NULL;
  EXCEPTION
    WHEN undefined_table OR undefined_column THEN
      v_posts := 0;
  END;

  BEGIN
    SELECT count(*)::bigint
    INTO v_comments
    FROM public.board_comments AS bc
    WHERE bc.user_id = p_user_id
      AND bc.deleted_at IS NULL;
  EXCEPTION
    WHEN undefined_table OR undefined_column THEN
      v_comments := 0;
  END;

  BEGIN
    SELECT
      (
        SELECT count(*)::bigint
        FROM public.post_likes AS pl
        INNER JOIN public.board_posts AS bp
          ON bp.post_type = pl.post_type
         AND bp.id::text = pl.post_id
        WHERE bp.author_id = p_user_id
          AND bp.deleted_at IS NULL
      )
      +
      (
        SELECT count(*)::bigint
        FROM public.comment_likes AS cl
        INNER JOIN public.board_comments AS bc
          ON bc.id = cl.comment_id
        WHERE bc.user_id = p_user_id
          AND bc.deleted_at IS NULL
      )
    INTO v_likes;
  EXCEPTION
    WHEN undefined_table OR undefined_column THEN
      v_likes := 0;
  END;

  RETURN QUERY
  SELECT
    p.user_id,
    p.username,
    p.name,
    nullif(btrim(p.nickname), '') AS nickname,
    p.email,
    p.phone,
    p.birth_date,
    p.congregant_type,
    p.attending_church,
    lower(trim(p.role)) AS role,
    p.created_at,
    coalesce(
      nullif(v_review ->> 'last_sign_in_at', '')::timestamptz,
      u.last_sign_in_at
    ) AS last_sign_in_at,
    v_posts,
    v_comments,
    v_likes,
    (v_review ->> 'email_confirmed')::boolean,
    nullif(v_review ->> 'auth_created_at', '')::timestamptz,
    coalesce(v_review ->> 'signup_path', '확인 불가'),
    coalesce(v_review ->> 'auth_providers', ''),
    (v_review ->> 'has_email_login')::boolean,
    (v_review ->> 'has_kakao_login')::boolean,
    coalesce((v_review ->> 'profile_incomplete')::boolean, false),
    coalesce((v_review ->> 'similar_account_count')::integer, 0),
    coalesce(v_review -> 'related_accounts', '[]'::jsonb),
    coalesce((v_review ->> 'visit_count')::integer, 0),
    nullif(v_review ->> 'last_visit_at', '')::timestamptz,
    coalesce((v_review ->> 'visit_log_available')::boolean, false),
    coalesce(v_review ->> 'review_labels', '추가 조사')
  FROM public.profiles AS p
  LEFT JOIN auth.users AS u ON u.id = p.user_id
  WHERE p.user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_detail_for_super_admin(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
