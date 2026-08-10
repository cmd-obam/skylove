-- ============================================================
-- 회원 접속 기록 보강
-- - 접속 user_id 를 대표 계정(effective)으로 정규화 → 연결 계정도 한 명으로 집계
-- - 관리자 목록 JOIN 을 대표 profiles 기준으로 표시
-- - 기존 site_visitor_stats / record_site_visit 은 변경하지 않음
-- ============================================================

CREATE OR REPLACE FUNCTION public.upsert_member_daily_visit(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_uid uuid := auth.uid();
  v_uid uuid;
  v_today date := public.korea_today();
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
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  -- 연결 계정이면 대표(primary) user_id 로 하루 1건만 유지
  v_uid := public.resolve_primary_user_id(v_auth_uid);

  IF p_payload IS NULL THEN
    p_payload := '{}'::jsonb;
  END IF;

  v_provider := lower(trim(coalesce(p_payload->>'login_provider', '')));
  IF v_provider = '' THEN
    BEGIN
      v_provider := coalesce(public.detect_auth_provider(v_auth_uid), 'email');
    EXCEPTION
      WHEN undefined_function THEN
        v_provider := 'email';
    END;
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

  INSERT INTO public.member_daily_visits AS m (
    user_id,
    visit_date,
    first_visit_at,
    last_visit_at,
    login_provider,
    referral_source,
    referral_raw,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    landing_path,
    last_path
  )
  VALUES (
    v_uid,
    v_today,
    now(),
    now(),
    v_provider,
    v_source,
    v_raw,
    v_utm_source,
    v_utm_medium,
    v_utm_campaign,
    v_utm_content,
    v_utm_term,
    v_landing,
    v_path
  )
  ON CONFLICT (user_id, visit_date)
  DO UPDATE SET
    last_visit_at = now(),
    last_path = CASE
      WHEN EXCLUDED.last_path <> '' THEN EXCLUDED.last_path
      ELSE m.last_path
    END,
    login_provider = CASE
      WHEN EXCLUDED.login_provider <> '' THEN EXCLUDED.login_provider
      ELSE m.login_provider
    END,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_member_daily_visit(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_member_daily_visit(jsonb) TO authenticated;

-- 관리자 목록: 대표 계정 profiles 로 이름/아이디 표시 (특정 user_id 필터 없음)
CREATE OR REPLACE FUNCTION public.list_member_daily_visits_for_super_admin(
  p_from date,
  p_to date
)
RETURNS TABLE (
  user_id uuid,
  username text,
  name text,
  visit_date date,
  first_visit_at timestamptz,
  last_visit_at timestamptz,
  login_provider text,
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
    m.user_id,
    coalesce(p.username, '')::text,
    coalesce(p.name, '')::text,
    m.visit_date,
    m.first_visit_at,
    m.last_visit_at,
    m.login_provider,
    m.referral_source,
    m.referral_raw,
    m.utm_source,
    m.utm_medium,
    m.utm_campaign,
    m.landing_path,
    m.last_path
  FROM public.member_daily_visits AS m
  LEFT JOIN public.profiles AS p
    ON p.user_id = public.resolve_primary_user_id(m.user_id)
  WHERE m.visit_date BETWEEN p_from AND p_to
  ORDER BY m.last_visit_at DESC, m.first_visit_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_member_daily_visits_for_super_admin(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_member_daily_visits_for_super_admin(date, date) TO authenticated;

-- 유입 이벤트도 로그인 시 대표 user_id 로 기록
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
  v_source text;
  v_raw text;
  v_utm_source text;
  v_utm_medium text;
  v_utm_campaign text;
  v_utm_content text;
  v_utm_term text;
  v_landing text;
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
    v_uid := public.resolve_primary_user_id(v_auth_uid);
  ELSE
    v_uid := NULL;
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
    landing_path
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
    v_landing
  )
  ON CONFLICT (visitor_key, visit_date)
  DO UPDATE SET
    is_member = t.is_member OR EXCLUDED.is_member,
    user_id = coalesce(EXCLUDED.user_id, t.user_id),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.record_site_traffic_event(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_site_traffic_event(jsonb) TO anon, authenticated;
