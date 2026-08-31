-- ============================================================
-- 회원 방문: 동일 user_id + KST 날짜 1건
-- 게시글 조회: 동일 회원 + 게시글 + KST 날짜 1회만 views_count 증가
-- ============================================================

-- ---------- 1) 기존 회원 방문 중복 정리 ----------
WITH ranked AS (
  SELECT
    t.id,
    ROW_NUMBER() OVER (
      PARTITION BY public.resolve_primary_user_id(t.user_id), t.visit_date
      ORDER BY coalesce(t.first_visit_at, t.created_at), t.id
    ) AS rn,
    MAX(t.last_visit_at) OVER (
      PARTITION BY public.resolve_primary_user_id(t.user_id), t.visit_date
    ) AS merged_last_visit_at
  FROM public.site_traffic_events AS t
  WHERE t.is_member
    AND t.user_id IS NOT NULL
)
UPDATE public.site_traffic_events AS t
SET
  last_visit_at = r.merged_last_visit_at,
  updated_at = now()
FROM ranked AS r
WHERE t.id = r.id
  AND r.rn = 1;

WITH ranked AS (
  SELECT
    t.id,
    ROW_NUMBER() OVER (
      PARTITION BY public.resolve_primary_user_id(t.user_id), t.visit_date
      ORDER BY coalesce(t.first_visit_at, t.created_at), t.id
    ) AS rn
  FROM public.site_traffic_events AS t
  WHERE t.is_member
    AND t.user_id IS NOT NULL
)
DELETE FROM public.site_traffic_events AS t
USING ranked AS r
WHERE t.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS site_traffic_events_member_user_date_uidx
  ON public.site_traffic_events (user_id, visit_date)
  WHERE is_member AND user_id IS NOT NULL;

-- ---------- 2) 방문 기록 upsert: 회원은 user_id+날짜 우선 ----------
CREATE OR REPLACE FUNCTION public.record_site_traffic_event(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := public.korea_today();
  v_key text;
  v_auth_uid uuid := auth.uid();
  v_uid uuid;
  v_is_member boolean := false;
  v_provider text;
  v_source text;
  v_raw text;
  v_utm_source text;
  v_utm_medium text;
  v_utm_campaign text;
  v_utm_content text;
  v_utm_term text;
  v_landing text;
  v_path text;
BEGIN
  IF p_payload IS NULL THEN
    RETURN;
  END IF;

  v_key := left(trim(coalesce(p_payload->>'visitor_key', '')), 80);
  IF v_key = '' OR length(v_key) < 8 THEN
    RETURN;
  END IF;

  v_is_member := v_auth_uid IS NOT NULL;
  IF v_is_member THEN
    BEGIN
      v_uid := public.resolve_primary_user_id(v_auth_uid);
    EXCEPTION
      WHEN undefined_function THEN
        v_uid := v_auth_uid;
    END;
  ELSE
    v_uid := NULL;
  END IF;

  v_provider := lower(trim(coalesce(p_payload->>'login_provider', '')));
  IF v_is_member THEN
    IF v_provider = '' OR v_provider = 'guest' THEN
      BEGIN
        v_provider := coalesce(public.detect_auth_provider(v_auth_uid), 'email');
      EXCEPTION
        WHEN undefined_function THEN
          v_provider := 'email';
      END;
    END IF;
  ELSE
    v_provider := 'guest';
  END IF;

  v_source := lower(trim(coalesce(p_payload->>'referral_source', 'unknown')));
  IF v_source = '' THEN
    v_source := 'unknown';
  END IF;

  v_raw := left(trim(coalesce(p_payload->>'referral_raw', '')), 500);
  v_utm_source := left(trim(coalesce(p_payload->>'utm_source', '')), 100);
  v_utm_medium := left(trim(coalesce(p_payload->>'utm_medium', '')), 100);
  v_utm_campaign := left(trim(coalesce(p_payload->>'utm_campaign', '')), 150);
  v_utm_content := left(trim(coalesce(p_payload->>'utm_content', '')), 150);
  v_utm_term := left(trim(coalesce(p_payload->>'utm_term', '')), 150);
  v_landing := left(trim(coalesce(p_payload->>'landing_path', '')), 300);
  v_path := left(trim(coalesce(p_payload->>'last_path', v_landing)), 300);

  IF v_is_member AND v_uid IS NOT NULL THEN
    UPDATE public.site_traffic_events AS t
    SET
      login_provider = CASE
        WHEN v_provider <> '' AND v_provider <> 'guest' THEN v_provider
        ELSE t.login_provider
      END,
      last_path = CASE
        WHEN v_path <> '' THEN v_path
        ELSE t.last_path
      END,
      last_visit_at = now(),
      updated_at = now()
    WHERE t.visit_date = v_today
      AND t.is_member
      AND t.user_id IS NOT NULL
      AND public.resolve_primary_user_id(t.user_id) = v_uid;

    IF FOUND THEN
      RETURN;
    END IF;

    UPDATE public.site_traffic_events AS t
    SET
      is_member = true,
      user_id = v_uid,
      login_provider = v_provider,
      last_path = CASE
        WHEN v_path <> '' THEN v_path
        ELSE t.last_path
      END,
      last_visit_at = now(),
      updated_at = now()
    WHERE t.visit_date = v_today
      AND t.visitor_key = v_key
      AND NOT t.is_member;

    IF FOUND THEN
      RETURN;
    END IF;

    BEGIN
      INSERT INTO public.site_traffic_events (
        visit_date,
        visitor_key,
        is_member,
        user_id,
        referral_source,
        referral_raw,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        landing_path,
        last_path,
        login_provider,
        first_visit_at,
        last_visit_at
      )
      VALUES (
        v_today,
        v_key,
        true,
        v_uid,
        v_source,
        v_raw,
        v_utm_source,
        v_utm_medium,
        v_utm_campaign,
        v_utm_content,
        v_utm_term,
        v_landing,
        v_path,
        v_provider,
        now(),
        now()
      );
    EXCEPTION
      WHEN unique_violation THEN
        UPDATE public.site_traffic_events AS t
        SET
          login_provider = CASE
            WHEN v_provider <> '' AND v_provider <> 'guest' THEN v_provider
            ELSE t.login_provider
          END,
          last_path = CASE
            WHEN v_path <> '' THEN v_path
            ELSE t.last_path
          END,
          last_visit_at = now(),
          updated_at = now()
        WHERE t.visit_date = v_today
          AND t.is_member
          AND t.user_id IS NOT NULL
          AND public.resolve_primary_user_id(t.user_id) = v_uid;
    END;

    RETURN;
  END IF;

  INSERT INTO public.site_traffic_events AS t (
    visit_date,
    visitor_key,
    is_member,
    user_id,
    referral_source,
    referral_raw,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    landing_path,
    last_path,
    login_provider,
    first_visit_at,
    last_visit_at
  )
  VALUES (
    v_today,
    v_key,
    v_is_member,
    v_uid,
    v_source,
    v_raw,
    v_utm_source,
    v_utm_medium,
    v_utm_campaign,
    v_utm_content,
    v_utm_term,
    v_landing,
    v_path,
    v_provider,
    now(),
    now()
  )
  ON CONFLICT (visitor_key, visit_date)
  DO UPDATE SET
    is_member = t.is_member OR EXCLUDED.is_member,
    user_id = coalesce(EXCLUDED.user_id, t.user_id),
    login_provider = CASE
      WHEN EXCLUDED.is_member THEN EXCLUDED.login_provider
      ELSE t.login_provider
    END,
    last_path = CASE
      WHEN EXCLUDED.last_path <> '' THEN EXCLUDED.last_path
      ELSE t.last_path
    END,
    last_visit_at = now(),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.record_site_traffic_event(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_site_traffic_event(jsonb) TO anon, authenticated;

-- ---------- 3) 회원 일별 게시글 조회 기록 ----------
CREATE TABLE IF NOT EXISTS public.board_post_daily_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_type text NOT NULL,
  post_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  view_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT board_post_daily_views_unique UNIQUE (post_type, post_id, user_id, view_date)
);

CREATE INDEX IF NOT EXISTS board_post_daily_views_lookup_idx
  ON public.board_post_daily_views (post_type, post_id, view_date DESC);

ALTER TABLE public.board_post_daily_views ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.board_post_daily_views FROM PUBLIC;
REVOKE ALL ON TABLE public.board_post_daily_views FROM anon, authenticated;

COMMENT ON TABLE public.board_post_daily_views IS
  '로그인 회원의 게시글 일별 조회 기록. 동일 회원·게시글·날짜당 views_count 1회만 증가.';

-- ---------- 4) 조회수 증가: 회원은 하루 1회 ----------
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
  v_auth_uid uuid := auth.uid();
  v_uid uuid;
  v_today date := public.korea_today();
  v_inserted uuid;
BEGIN
  PERFORM public.ensure_board_post_meta(p_post_type, p_post_id);

  IF v_auth_uid IS NOT NULL THEN
    BEGIN
      v_uid := public.resolve_primary_user_id(v_auth_uid);
    EXCEPTION
      WHEN undefined_function THEN
        v_uid := v_auth_uid;
    END;

    INSERT INTO public.board_post_daily_views (post_type, post_id, user_id, view_date)
    VALUES (p_post_type, p_post_id, v_uid, v_today)
    ON CONFLICT (post_type, post_id, user_id, view_date) DO NOTHING
    RETURNING id INTO v_inserted;

    IF v_inserted IS NULL THEN
      SELECT *
      INTO result
      FROM public.board_post_meta
      WHERE post_type = p_post_type
        AND post_id = p_post_id;

      RETURN result;
    END IF;
  END IF;

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

REVOKE ALL ON FUNCTION public.increment_board_post_views(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_board_post_views(text, text) TO anon, authenticated;
