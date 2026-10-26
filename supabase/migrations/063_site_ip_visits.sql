-- ============================================================
-- IP visit log for super-admin review.
-- Does not change footer TODAY/TOTAL, site_traffic_events, members, or posts.
-- The browser cannot insert an IP. Only record_trusted_ip_visit, granted to
-- service_role, writes rows. Vercel sets the IP before that call.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_ip_visit_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  retention_days integer NOT NULL DEFAULT 180 CHECK (retention_days BETWEEN 7 AND 730),
  last_purged_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.site_ip_visit_settings (id, retention_days)
VALUES (1, 180)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.site_ip_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  visited_at timestamptz NOT NULL DEFAULT now(),
  visit_date date NOT NULL,
  path text NOT NULL DEFAULT '/',
  referral_source text NOT NULL DEFAULT '',
  referral_raw text NOT NULL DEFAULT '',
  is_member boolean NOT NULL DEFAULT false,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_ip_visits_ip_visited_idx
  ON public.site_ip_visits (ip_address, visited_at DESC);
CREATE INDEX IF NOT EXISTS site_ip_visits_date_idx
  ON public.site_ip_visits (visit_date DESC, visited_at DESC);
CREATE INDEX IF NOT EXISTS site_ip_visits_user_idx
  ON public.site_ip_visits (user_id, visited_at DESC)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.site_ip_visit_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_ip_visits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.site_ip_visit_settings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.site_ip_visits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_trusted_ip_visit(
  p_ip text,
  p_path text,
  p_referral_source text,
  p_referral_raw text,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip text := nullif(btrim(coalesce(p_ip, '')), '');
  v_path text := left(coalesce(nullif(btrim(p_path), ''), '/'), 300);
  v_source text := left(coalesce(p_referral_source, ''), 80);
  v_raw text := left(coalesce(p_referral_raw, ''), 300);
  v_today date := (timezone('Asia/Seoul', now()))::date;
  v_user uuid := p_user_id;
  v_days integer := 180;
BEGIN
  IF v_ip IS NULL OR v_ip ~ '[,[:space:]]' THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'ip_unavailable');
  END IF;

  BEGIN
    PERFORM v_ip::inet;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN jsonb_build_object('recorded', false, 'reason', 'invalid_ip');
  END;

  IF v_ip IN ('0.0.0.0', '::', '::1') OR v_ip LIKE '127.%' THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'ip_unavailable');
  END IF;

  IF v_path IS NULL OR left(v_path, 1) <> '/' OR left(v_path, 2) = '//' THEN
    v_path := '/';
  END IF;

  IF v_user IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM auth.users AS u WHERE u.id = v_user
  ) THEN
    v_user := NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.site_ip_visits AS v
    WHERE v.ip_address = v_ip
      AND v.path = v_path
      AND v.user_id IS NOT DISTINCT FROM v_user
      AND v.visited_at >= now() - interval '10 minutes'
  ) THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'duplicate');
  END IF;

  INSERT INTO public.site_ip_visits (
    ip_address,
    visited_at,
    visit_date,
    path,
    referral_source,
    referral_raw,
    is_member,
    user_id
  )
  VALUES (
    v_ip,
    now(),
    v_today,
    v_path,
    v_source,
    v_raw,
    v_user IS NOT NULL,
    v_user
  );

  UPDATE public.site_ip_visit_settings AS settings
  SET last_purged_at = now()
  WHERE settings.id = 1
    AND (settings.last_purged_at IS NULL OR settings.last_purged_at < now() - interval '1 day')
  RETURNING settings.retention_days INTO v_days;

  IF FOUND THEN
    DELETE FROM public.site_ip_visits AS old_visit
    WHERE old_visit.visited_at < now() - make_interval(days => v_days);
  END IF;

  RETURN jsonb_build_object('recorded', true, 'reason', 'stored');
END;
$$;

REVOKE ALL ON FUNCTION public.record_trusted_ip_visit(text, text, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_trusted_ip_visit(text, text, text, text, uuid) FROM anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.record_trusted_ip_visit(text, text, text, text, uuid) TO service_role;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_ip_visit_overview_for_super_admin()
RETURNS TABLE (
  today_unique_ips bigint,
  today_hits bigint,
  total_unique_ips bigint,
  total_hits bigint,
  retention_days integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (timezone('Asia/Seoul', now()))::date;
BEGIN
  PERFORM public.assert_super_admin();

  RETURN QUERY
  SELECT
    count(DISTINCT v.ip_address) FILTER (WHERE v.visit_date = v_today),
    count(*) FILTER (WHERE v.visit_date = v_today),
    count(DISTINCT v.ip_address),
    count(*),
    (SELECT s.retention_days FROM public.site_ip_visit_settings AS s WHERE s.id = 1)
  FROM public.site_ip_visits AS v;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_ip_visits_for_super_admin(
  p_from date,
  p_to date,
  p_search text DEFAULT NULL,
  p_audience text DEFAULT 'all',
  p_sort text DEFAULT 'total',
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  ip_address text,
  first_seen timestamptz,
  last_seen timestamptz,
  today_hits bigint,
  total_hits bigint,
  range_hits bigint,
  member_labels text,
  has_member boolean,
  has_guest boolean,
  total_matching bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from date := coalesce(p_from, (timezone('Asia/Seoul', now()))::date);
  v_to date := coalesce(p_to, v_from);
  v_search text := nullif(replace(replace(btrim(coalesce(p_search, '')), '%', ''), '_', ''), '');
  v_audience text := lower(coalesce(p_audience, 'all'));
  v_sort text := lower(coalesce(p_sort, 'total'));
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 50);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_today date := (timezone('Asia/Seoul', now()))::date;
BEGIN
  PERFORM public.assert_super_admin();

  IF v_from > v_to THEN
    v_from := p_to;
    v_to := p_from;
  END IF;

  IF v_audience NOT IN ('all', 'member', 'guest') THEN
    v_audience := 'all';
  END IF;

  IF v_sort NOT IN ('total', 'today', 'last', 'first') THEN
    v_sort := 'total';
  END IF;

  RETURN QUERY
  WITH matched AS (
    SELECT DISTINCT v.ip_address
    FROM public.site_ip_visits AS v
    WHERE v.visit_date BETWEEN v_from AND v_to
      AND (v_search IS NULL OR v.ip_address ILIKE '%' || v_search || '%')
      AND (
        v_audience = 'all'
        OR (v_audience = 'member' AND v.is_member)
        OR (v_audience = 'guest' AND NOT v.is_member)
      )
  ),
  grouped AS (
    SELECT
      s.ip_address,
      min(s.visited_at) AS first_seen,
      max(s.visited_at) AS last_seen,
      count(*) FILTER (WHERE s.visit_date = v_today) AS today_hits,
      count(*) AS total_hits,
      count(*) FILTER (WHERE s.visit_date BETWEEN v_from AND v_to) AS range_hits,
      bool_or(s.is_member) FILTER (WHERE s.visit_date BETWEEN v_from AND v_to) AS has_member,
      bool_or(NOT s.is_member) FILTER (WHERE s.visit_date BETWEEN v_from AND v_to) AS has_guest
    FROM public.site_ip_visits AS s
    INNER JOIN matched AS m ON m.ip_address = s.ip_address
    GROUP BY s.ip_address
  )
  SELECT
    g.ip_address,
    g.first_seen,
    g.last_seen,
    g.today_hits,
    g.total_hits,
    g.range_hits,
    coalesce((
      SELECT string_agg(DISTINCT label, ', ')
      FROM (
        SELECT
          coalesce(nullif(btrim(pr.name), ''), '이름 기록 없음')
          || ' ('
          || coalesce(nullif(btrim(pr.username), ''), left(s.user_id::text, 8))
          || ')' AS label
        FROM public.site_ip_visits AS s
        LEFT JOIN public.profiles AS pr ON pr.user_id = s.user_id
        WHERE s.ip_address = g.ip_address
          AND s.visit_date BETWEEN v_from AND v_to
          AND s.is_member
          AND s.user_id IS NOT NULL
      ) AS labels
    ), ''),
    coalesce(g.has_member, false),
    coalesce(g.has_guest, false),
    count(*) OVER () AS total_matching
  FROM grouped AS g
  ORDER BY
    CASE
      WHEN v_sort = 'today' THEN g.today_hits
      WHEN v_sort = 'total' THEN g.total_hits
      ELSE NULL
    END DESC NULLS LAST,
    CASE WHEN v_sort = 'first' THEN g.first_seen ELSE NULL END ASC NULLS LAST,
    g.last_seen DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ip_visit_detail_for_super_admin(
  p_ip text,
  p_from date,
  p_to date,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip text := nullif(btrim(coalesce(p_ip, '')), '');
  v_from date := coalesce(p_from, (timezone('Asia/Seoul', now()))::date);
  v_to date := coalesce(p_to, v_from);
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_today date := (timezone('Asia/Seoul', now()))::date;
  v_daily jsonb := '[]'::jsonb;
  v_events jsonb := '[]'::jsonb;
  v_event_total bigint := 0;
  v_first timestamptz;
  v_last timestamptz;
  v_total bigint := 0;
  v_today_hits bigint := 0;
  v_range_hits bigint := 0;
BEGIN
  PERFORM public.assert_super_admin();

  IF v_from > v_to THEN
    v_from := p_to;
    v_to := p_from;
  END IF;

  IF v_ip IS NULL THEN
    RETURN jsonb_build_object('found', false, 'reason', 'ip_unavailable');
  END IF;

  SELECT
    min(v.visited_at),
    max(v.visited_at),
    count(*),
    count(*) FILTER (WHERE v.visit_date = v_today),
    count(*) FILTER (WHERE v.visit_date BETWEEN v_from AND v_to)
  INTO v_first, v_last, v_total, v_today_hits, v_range_hits
  FROM public.site_ip_visits AS v
  WHERE v.ip_address = v_ip;

  SELECT count(*)
  INTO v_event_total
  FROM public.site_ip_visits AS v
  WHERE v.ip_address = v_ip
    AND v.visit_date BETWEEN v_from AND v_to;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object('visit_date', daily.visit_date, 'hits', daily.hits)
      ORDER BY daily.visit_date
    ),
    '[]'::jsonb
  )
  INTO v_daily
  FROM (
    SELECT v.visit_date, count(*) AS hits
    FROM public.site_ip_visits AS v
    WHERE v.ip_address = v_ip
      AND v.visit_date BETWEEN v_from AND v_to
    GROUP BY v.visit_date
  ) AS daily;

  SELECT coalesce(
    jsonb_agg(to_jsonb(events) ORDER BY events.visited_at),
    '[]'::jsonb
  )
  INTO v_events
  FROM (
    SELECT
      v.id,
      v.visited_at,
      v.visit_date,
      v.path,
      v.referral_source,
      v.referral_raw,
      v.is_member,
      v.user_id,
      nullif(btrim(pr.name), '') AS member_name,
      nullif(btrim(pr.username), '') AS member_username,
      nullif(btrim(pr.nickname), '') AS member_nickname
    FROM public.site_ip_visits AS v
    LEFT JOIN public.profiles AS pr ON pr.user_id = v.user_id
    WHERE v.ip_address = v_ip
      AND v.visit_date BETWEEN v_from AND v_to
    ORDER BY v.visited_at ASC
    LIMIT v_limit
    OFFSET v_offset
  ) AS events;

  RETURN jsonb_build_object(
    'found', v_total > 0,
    'ip_address', v_ip,
    'first_seen', v_first,
    'last_seen', v_last,
    'total_hits', v_total,
    'today_hits', v_today_hits,
    'range_hits', v_range_hits,
    'daily', v_daily,
    'events', v_events,
    'event_total', v_event_total,
    'retention_days', (
      SELECT s.retention_days FROM public.site_ip_visit_settings AS s WHERE s.id = 1
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_ip_visit_retention_for_super_admin(p_days integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_super_admin();

  IF p_days NOT IN (30, 90, 180, 365) THEN
    RAISE EXCEPTION '보관 기간은 30, 90, 180, 365일 중 하나여야 합니다.';
  END IF;

  UPDATE public.site_ip_visit_settings
  SET
    retention_days = p_days,
    updated_at = now(),
    last_purged_at = now()
  WHERE id = 1;

  DELETE FROM public.site_ip_visits AS old_visit
  WHERE old_visit.visited_at < now() - make_interval(days => p_days);

  RETURN p_days;
END;
$$;

REVOKE ALL ON FUNCTION public.get_ip_visit_overview_for_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_ip_visits_for_super_admin(date, date, text, text, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_ip_visit_detail_for_super_admin(text, date, date, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_ip_visit_retention_for_super_admin(integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_ip_visit_overview_for_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_ip_visits_for_super_admin(date, date, text, text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ip_visit_detail_for_super_admin(text, date, date, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_ip_visit_retention_for_super_admin(integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
