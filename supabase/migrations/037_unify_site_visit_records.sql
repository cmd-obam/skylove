-- ============================================================
-- 전체 방문 기록(회원/비회원) 단일 소스: site_traffic_events 확장
-- 기존 site_visitor_stats (TODAY/TOTAL) 및 record_site_visit 은 변경하지 않습니다.
-- ============================================================

ALTER TABLE public.site_traffic_events
  ADD COLUMN IF NOT EXISTS first_visit_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_visit_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS login_provider text NOT NULL DEFAULT 'guest',
  ADD COLUMN IF NOT EXISTS last_path text NOT NULL DEFAULT '';

UPDATE public.site_traffic_events
SET
  first_visit_at = coalesce(first_visit_at, created_at, now()),
  last_visit_at = coalesce(last_visit_at, updated_at, created_at, now()),
  login_provider = CASE
    WHEN is_member AND (login_provider = '' OR login_provider = 'guest') THEN 'email'
    WHEN NOT is_member THEN 'guest'
    ELSE login_provider
  END
WHERE true;

COMMENT ON TABLE public.site_traffic_events IS
  '전체 방문 기록(브라우저 visitor_key + KST 날짜 1건). 회원/비회원·유입경로 포함.';

-- ---------- 방문 기록 upsert (회원/비회원 공통) ----------
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
    -- 비회원 → 로그인 시 회원으로 승격 (방문자 수 중복 증가 없음: 이 테이블만 갱신)
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

-- ---------- 최고관리자: 전체 방문 목록 (회원+비회원) ----------
CREATE OR REPLACE FUNCTION public.list_site_visits_for_super_admin(
  p_from date,
  p_to date
)
RETURNS TABLE (
  id uuid,
  visit_date date,
  visitor_key text,
  is_member boolean,
  user_id uuid,
  username text,
  name text,
  login_provider text,
  first_visit_at timestamptz,
  last_visit_at timestamptz,
  referral_source text,
  referral_raw text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  landing_path text,
  last_path text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION '접근 권한이 없습니다.';
  END IF;

  IF p_from IS NULL OR p_to IS NULL OR p_from > p_to THEN
    RAISE EXCEPTION '조회 기간이 올바르지 않습니다.';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.visit_date,
    t.visitor_key,
    t.is_member,
    t.user_id,
    CASE WHEN t.is_member THEN coalesce(p.username, '') ELSE '' END::text,
    CASE WHEN t.is_member THEN coalesce(p.name, '') ELSE '' END::text,
    t.login_provider,
    t.first_visit_at,
    t.last_visit_at,
    t.referral_source,
    t.referral_raw,
    t.utm_source,
    t.utm_medium,
    t.utm_campaign,
    t.landing_path,
    t.last_path
  FROM public.site_traffic_events AS t
  LEFT JOIN public.profiles AS p
    ON t.user_id IS NOT NULL
   AND p.user_id = public.resolve_primary_user_id(t.user_id)
  WHERE t.visit_date BETWEEN p_from AND p_to
  ORDER BY t.last_visit_at DESC, t.first_visit_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_site_visits_for_super_admin(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_site_visits_for_super_admin(date, date) TO authenticated;

-- 유입 경로 집계는 site_traffic_events 기준 유지 (합계 = 회원 + 비회원)
CREATE OR REPLACE FUNCTION public.list_referral_stats_for_super_admin(
  p_from date,
  p_to date
)
RETURNS TABLE (
  referral_source text,
  total_count bigint,
  member_count bigint,
  guest_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION '접근 권한이 없습니다.';
  END IF;

  IF p_from IS NULL OR p_to IS NULL OR p_from > p_to THEN
    RAISE EXCEPTION '조회 기간이 올바르지 않습니다.';
  END IF;

  RETURN QUERY
  SELECT
    t.referral_source,
    count(*)::bigint AS total_count,
    count(*) FILTER (WHERE t.is_member)::bigint AS member_count,
    count(*) FILTER (WHERE NOT t.is_member)::bigint AS guest_count
  FROM public.site_traffic_events AS t
  WHERE t.visit_date BETWEEN p_from AND p_to
  GROUP BY t.referral_source
  ORDER BY total_count DESC, t.referral_source ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_referral_stats_for_super_admin(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_referral_stats_for_super_admin(date, date) TO authenticated;
