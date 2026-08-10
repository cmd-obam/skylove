-- ============================================================
-- 회원 접속 기록 + 유입 경로 (기존 site_visitor_stats 유지)
--
-- 기존 TODAY / TOTAL (018_site_visitor_stats) 는 변경하지 않습니다.
-- 최고관리자만 회원 접속·유입 통계를 SELECT 할 수 있습니다.
-- ============================================================

-- ---------- 1) 회원 일별 접속 ----------
CREATE TABLE IF NOT EXISTS public.member_daily_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  visit_date date NOT NULL,
  first_visit_at timestamptz NOT NULL DEFAULT now(),
  last_visit_at timestamptz NOT NULL DEFAULT now(),
  login_provider text NOT NULL DEFAULT 'email',
  referral_source text NOT NULL DEFAULT 'unknown',
  referral_raw text NOT NULL DEFAULT '',
  utm_source text NOT NULL DEFAULT '',
  utm_medium text NOT NULL DEFAULT '',
  utm_campaign text NOT NULL DEFAULT '',
  utm_content text NOT NULL DEFAULT '',
  utm_term text NOT NULL DEFAULT '',
  landing_path text NOT NULL DEFAULT '',
  last_path text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT member_daily_visits_user_date_key UNIQUE (user_id, visit_date)
);

CREATE INDEX IF NOT EXISTS member_daily_visits_date_idx
  ON public.member_daily_visits (visit_date DESC, last_visit_at DESC);

CREATE INDEX IF NOT EXISTS member_daily_visits_user_idx
  ON public.member_daily_visits (user_id, visit_date DESC);

ALTER TABLE public.member_daily_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins read member daily visits" ON public.member_daily_visits;
CREATE POLICY "Super admins read member daily visits"
  ON public.member_daily_visits
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

REVOKE ALL ON TABLE public.member_daily_visits FROM PUBLIC;
GRANT SELECT ON TABLE public.member_daily_visits TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.member_daily_visits FROM anon, authenticated;

COMMENT ON TABLE public.member_daily_visits IS
  '로그인 회원 일별 접속 기록 (user_id+날짜 1건). 비밀번호·토큰 등 비밀값 저장 금지.';

-- ---------- 2) 익명/회원 공통 유입 이벤트 (브라우저 키+날짜 1건) ----------
CREATE TABLE IF NOT EXISTS public.site_traffic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_date date NOT NULL,
  visitor_key text NOT NULL,
  is_member boolean NOT NULL DEFAULT false,
  user_id uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  referral_source text NOT NULL DEFAULT 'unknown',
  referral_raw text NOT NULL DEFAULT '',
  utm_source text NOT NULL DEFAULT '',
  utm_medium text NOT NULL DEFAULT '',
  utm_campaign text NOT NULL DEFAULT '',
  utm_content text NOT NULL DEFAULT '',
  utm_term text NOT NULL DEFAULT '',
  landing_path text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_traffic_events_key_date_key UNIQUE (visitor_key, visit_date)
);

CREATE INDEX IF NOT EXISTS site_traffic_events_date_source_idx
  ON public.site_traffic_events (visit_date DESC, referral_source);

ALTER TABLE public.site_traffic_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins read site traffic events" ON public.site_traffic_events;
CREATE POLICY "Super admins read site traffic events"
  ON public.site_traffic_events
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

REVOKE ALL ON TABLE public.site_traffic_events FROM PUBLIC;
GRANT SELECT ON TABLE public.site_traffic_events TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.site_traffic_events FROM anon, authenticated;

COMMENT ON TABLE public.site_traffic_events IS
  '유입 경로 집계용 일별 방문자 이벤트. visitor_key는 브라우저 로컬 UUID(비식별).';

-- ---------- 3) 헬퍼: KST 오늘 ----------
CREATE OR REPLACE FUNCTION public.korea_today()
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT (timezone('Asia/Seoul', now()))::date;
$$;

-- ---------- 4) 회원 일별 접속 upsert ----------
CREATE OR REPLACE FUNCTION public.upsert_member_daily_visit(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
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
  IF v_uid IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  IF p_payload IS NULL THEN
    p_payload := '{}'::jsonb;
  END IF;

  v_provider := lower(trim(coalesce(p_payload->>'login_provider', '')));
  IF v_provider = '' THEN
    v_provider := coalesce(public.detect_auth_provider(v_uid), 'email');
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
    -- 최초 유입 정보는 첫 기록 유지
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_member_daily_visit(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_member_daily_visit(jsonb) TO authenticated;

-- ---------- 5) 유입 이벤트 upsert (anon 포함) ----------
CREATE OR REPLACE FUNCTION public.record_site_traffic_event(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := public.korea_today();
  v_key text;
  v_uid uuid := auth.uid();
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

  v_is_member := v_uid IS NOT NULL;
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
    -- 최초 유입 유지
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.record_site_traffic_event(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_site_traffic_event(jsonb) TO anon, authenticated;

-- ---------- 6) 최고관리자 조회: 회원 일별 접속 ----------
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
    ON p.user_id = m.user_id
  WHERE m.visit_date BETWEEN p_from AND p_to
  ORDER BY m.last_visit_at DESC, m.first_visit_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_member_daily_visits_for_super_admin(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_member_daily_visits_for_super_admin(date, date) TO authenticated;

-- ---------- 7) 최고관리자 조회: 유입 경로 집계 ----------
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
