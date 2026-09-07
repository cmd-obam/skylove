-- ============================================================
-- Site analytics (admin detailed stats)
-- Separate from footer TODAY/TOTAL (site_visitor_stats)
-- and from daily traffic log (site_traffic_events).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_analytics_sessions (
  id uuid PRIMARY KEY,
  visitor_id text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  active_ms integer NOT NULL DEFAULT 0,
  pageview_count integer NOT NULL DEFAULT 0,
  is_new_visitor boolean NOT NULL DEFAULT false,
  landing_path text NOT NULL DEFAULT '',
  exit_path text NOT NULL DEFAULT '',
  referral_source text NOT NULL DEFAULT 'unknown',
  referral_raw text NOT NULL DEFAULT '',
  referral_host text NOT NULL DEFAULT '',
  utm_source text NOT NULL DEFAULT '',
  utm_medium text NOT NULL DEFAULT '',
  utm_campaign text NOT NULL DEFAULT '',
  utm_content text NOT NULL DEFAULT '',
  utm_term text NOT NULL DEFAULT '',
  device_type text NOT NULL DEFAULT 'desktop',
  os_name text NOT NULL DEFAULT '',
  browser_name text NOT NULL DEFAULT '',
  viewport_w integer,
  viewport_h integer,
  device_pixel_ratio numeric(4, 2),
  user_id uuid,
  is_member boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_analytics_sessions_started_idx
  ON public.site_analytics_sessions (started_at DESC);
CREATE INDEX IF NOT EXISTS site_analytics_sessions_visitor_idx
  ON public.site_analytics_sessions (visitor_id, started_at DESC);
CREATE INDEX IF NOT EXISTS site_analytics_sessions_referral_idx
  ON public.site_analytics_sessions (referral_source, started_at DESC);

CREATE TABLE IF NOT EXISTS public.site_analytics_pageviews (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.site_analytics_sessions (id) ON DELETE CASCADE,
  visitor_id text NOT NULL,
  path text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  post_type text,
  post_id uuid,
  entered_at timestamptz NOT NULL DEFAULT now(),
  exited_at timestamptz,
  active_ms integer NOT NULL DEFAULT 0,
  scroll_depth integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_analytics_pageviews_session_idx
  ON public.site_analytics_pageviews (session_id, entered_at);
CREATE INDEX IF NOT EXISTS site_analytics_pageviews_path_idx
  ON public.site_analytics_pageviews (path, entered_at DESC);
CREATE INDEX IF NOT EXISTS site_analytics_pageviews_post_idx
  ON public.site_analytics_pageviews (post_type, post_id, entered_at DESC)
  WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS site_analytics_pageviews_entered_idx
  ON public.site_analytics_pageviews (entered_at DESC);

CREATE TABLE IF NOT EXISTS public.site_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.site_analytics_sessions (id) ON DELETE SET NULL,
  visitor_id text NOT NULL,
  event_name text NOT NULL,
  path text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_analytics_events_name_idx
  ON public.site_analytics_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS site_analytics_events_created_idx
  ON public.site_analytics_events (created_at DESC);

ALTER TABLE public.site_analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_analytics_pageviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_analytics_sessions_select_super_admin ON public.site_analytics_sessions;
CREATE POLICY site_analytics_sessions_select_super_admin
  ON public.site_analytics_sessions
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS site_analytics_pageviews_select_super_admin ON public.site_analytics_pageviews;
CREATE POLICY site_analytics_pageviews_select_super_admin
  ON public.site_analytics_pageviews
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS site_analytics_events_select_super_admin ON public.site_analytics_events;
CREATE POLICY site_analytics_events_select_super_admin
  ON public.site_analytics_events
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

CREATE OR REPLACE FUNCTION public.ingest_site_analytics(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visitor text;
  v_session jsonb;
  v_session_id uuid;
  v_pageview jsonb;
  v_event jsonb;
  v_auth uuid := auth.uid();
  v_uid uuid;
  v_is_member boolean := false;
BEGIN
  IF p_payload IS NULL THEN
    RETURN;
  END IF;

  v_visitor := left(trim(coalesce(p_payload->>'visitor_id', '')), 80);
  IF v_visitor = '' OR length(v_visitor) < 8 THEN
    RETURN;
  END IF;

  v_is_member := v_auth IS NOT NULL;
  IF v_is_member THEN
    BEGIN
      v_uid := public.resolve_primary_user_id(v_auth);
    EXCEPTION
      WHEN undefined_function THEN
        v_uid := v_auth;
    END;
  ELSE
    v_uid := NULL;
  END IF;

  v_session := p_payload->'session';
  IF v_session IS NOT NULL AND jsonb_typeof(v_session) = 'object' THEN
    BEGIN
      v_session_id := NULLIF(trim(coalesce(v_session->>'id', '')), '')::uuid;
    EXCEPTION
      WHEN invalid_text_representation THEN
        v_session_id := NULL;
    END;

    IF v_session_id IS NOT NULL THEN
      INSERT INTO public.site_analytics_sessions AS s (
        id, visitor_id, started_at, ended_at, active_ms, pageview_count,
        is_new_visitor, landing_path, exit_path,
        referral_source, referral_raw, referral_host,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        device_type, os_name, browser_name,
        viewport_w, viewport_h, device_pixel_ratio,
        user_id, is_member, updated_at
      )
      VALUES (
        v_session_id,
        v_visitor,
        coalesce((v_session->>'started_at')::timestamptz, now()),
        NULLIF(v_session->>'ended_at', '')::timestamptz,
        greatest(0, coalesce((v_session->>'active_ms')::integer, 0)),
        greatest(0, coalesce((v_session->>'pageview_count')::integer, 0)),
        coalesce((v_session->>'is_new_visitor')::boolean, false),
        left(coalesce(v_session->>'landing_path', ''), 300),
        left(coalesce(v_session->>'exit_path', ''), 300),
        left(coalesce(v_session->>'referral_source', 'unknown'), 40),
        left(coalesce(v_session->>'referral_raw', ''), 500),
        left(coalesce(v_session->>'referral_host', ''), 120),
        left(coalesce(v_session->>'utm_source', ''), 80),
        left(coalesce(v_session->>'utm_medium', ''), 80),
        left(coalesce(v_session->>'utm_campaign', ''), 120),
        left(coalesce(v_session->>'utm_content', ''), 120),
        left(coalesce(v_session->>'utm_term', ''), 120),
        left(coalesce(v_session->>'device_type', 'desktop'), 20),
        left(coalesce(v_session->>'os_name', ''), 40),
        left(coalesce(v_session->>'browser_name', ''), 40),
        NULLIF(v_session->>'viewport_w', '')::integer,
        NULLIF(v_session->>'viewport_h', '')::integer,
        NULLIF(v_session->>'device_pixel_ratio', '')::numeric,
        v_uid,
        v_is_member,
        now()
      )
      ON CONFLICT (id) DO UPDATE
      SET
        ended_at = coalesce(EXCLUDED.ended_at, s.ended_at),
        active_ms = greatest(s.active_ms, EXCLUDED.active_ms),
        pageview_count = greatest(s.pageview_count, EXCLUDED.pageview_count),
        exit_path = CASE
          WHEN EXCLUDED.exit_path <> '' THEN EXCLUDED.exit_path
          ELSE s.exit_path
        END,
        user_id = coalesce(EXCLUDED.user_id, s.user_id),
        is_member = s.is_member OR EXCLUDED.is_member,
        updated_at = now();
    END IF;
  END IF;

  IF p_payload ? 'pageviews' AND jsonb_typeof(p_payload->'pageviews') = 'array' THEN
    FOR v_pageview IN
      SELECT value FROM jsonb_array_elements(p_payload->'pageviews')
    LOOP
      BEGIN
        INSERT INTO public.site_analytics_pageviews AS p (
          id, session_id, visitor_id, path, title, post_type, post_id,
          entered_at, exited_at, active_ms, scroll_depth, updated_at
        )
        VALUES (
          (v_pageview->>'id')::uuid,
          coalesce(NULLIF(v_pageview->>'session_id', '')::uuid, v_session_id),
          v_visitor,
          left(coalesce(v_pageview->>'path', ''), 300),
          left(coalesce(v_pageview->>'title', ''), 200),
          NULLIF(left(coalesce(v_pageview->>'post_type', ''), 60), ''),
          NULLIF(v_pageview->>'post_id', '')::uuid,
          coalesce((v_pageview->>'entered_at')::timestamptz, now()),
          NULLIF(v_pageview->>'exited_at', '')::timestamptz,
          greatest(0, coalesce((v_pageview->>'active_ms')::integer, 0)),
          least(100, greatest(0, coalesce((v_pageview->>'scroll_depth')::integer, 0))),
          now()
        )
        ON CONFLICT (id) DO UPDATE
        SET
          exited_at = coalesce(EXCLUDED.exited_at, p.exited_at),
          active_ms = greatest(p.active_ms, EXCLUDED.active_ms),
          scroll_depth = greatest(p.scroll_depth, EXCLUDED.scroll_depth),
          title = CASE WHEN EXCLUDED.title <> '' THEN EXCLUDED.title ELSE p.title END,
          updated_at = now();
      EXCEPTION
        WHEN foreign_key_violation THEN
          NULL;
        WHEN invalid_text_representation THEN
          NULL;
      END;
    END LOOP;
  END IF;

  IF p_payload ? 'events' AND jsonb_typeof(p_payload->'events') = 'array' THEN
    FOR v_event IN
      SELECT value FROM jsonb_array_elements(p_payload->'events')
    LOOP
      BEGIN
        INSERT INTO public.site_analytics_events (
          id, session_id, visitor_id, event_name, path, payload, created_at
        )
        VALUES (
          coalesce(NULLIF(v_event->>'id', '')::uuid, gen_random_uuid()),
          coalesce(NULLIF(v_event->>'session_id', '')::uuid, v_session_id),
          v_visitor,
          left(coalesce(v_event->>'event_name', 'unknown'), 80),
          left(coalesce(v_event->>'path', ''), 300),
          coalesce(v_event->'payload', '{}'::jsonb),
          coalesce((v_event->>'created_at')::timestamptz, now())
        )
        ON CONFLICT (id) DO NOTHING;
      EXCEPTION
        WHEN foreign_key_violation THEN
          NULL;
        WHEN invalid_text_representation THEN
          NULL;
      END;
    END LOOP;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.ingest_site_analytics(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ingest_site_analytics(jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_site_analytics_dashboard(p_from date, p_to date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from timestamptz;
  v_to timestamptz;
  v_result jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_from IS NULL OR p_to IS NULL THEN
    RAISE EXCEPTION 'invalid_range';
  END IF;

  v_from := (p_from::text || ' 00:00:00')::timestamp AT TIME ZONE 'Asia/Seoul';
  v_to := ((p_to + 1)::text || ' 00:00:00')::timestamp AT TIME ZONE 'Asia/Seoul';

  WITH sessions AS (
    SELECT *
    FROM public.site_analytics_sessions
    WHERE started_at >= v_from AND started_at < v_to
  ),
  pageviews AS (
    SELECT p.*
    FROM public.site_analytics_pageviews p
    WHERE p.entered_at >= v_from AND p.entered_at < v_to
  ),
  events AS (
    SELECT e.*
    FROM public.site_analytics_events e
    WHERE e.created_at >= v_from AND e.created_at < v_to
  ),
  summary AS (
    SELECT
      coalesce((SELECT count(DISTINCT visitor_id) FROM sessions), 0) AS visitors,
      coalesce((SELECT count(*) FROM sessions), 0) AS sessions,
      coalesce((SELECT count(*) FROM pageviews), 0) AS pageviews,
      coalesce((SELECT round(avg(active_ms))::integer FROM sessions WHERE active_ms > 0), 0) AS avg_session_ms,
      coalesce((SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY active_ms)::integer FROM sessions WHERE active_ms > 0), 0) AS median_session_ms,
      coalesce((SELECT count(*) FROM sessions WHERE is_new_visitor), 0) AS new_visitors,
      coalesce((SELECT count(*) FROM sessions WHERE NOT is_new_visitor), 0) AS returning_visitors
  ),
  cumulative AS (
    SELECT
      (SELECT count(DISTINCT visitor_id) FROM public.site_analytics_sessions) AS visitors,
      (SELECT count(*) FROM public.site_analytics_sessions) AS sessions,
      (SELECT count(*) FROM public.site_analytics_pageviews) AS pageviews
  ),
  daily AS (
    SELECT
      to_char((started_at AT TIME ZONE 'Asia/Seoul')::date, 'YYYY-MM-DD') AS day,
      count(DISTINCT visitor_id)::integer AS visitors,
      count(*)::integer AS sessions,
      coalesce(sum(pageview_count), 0)::integer AS pageviews
    FROM sessions
    GROUP BY 1
    ORDER BY 1
  ),
  referrers AS (
    SELECT
      referral_source AS source,
      count(DISTINCT visitor_id)::integer AS visitors,
      count(*)::integer AS sessions,
      coalesce(round(avg(NULLIF(active_ms, 0)))::integer, 0) AS avg_ms
    FROM sessions
    GROUP BY 1
    ORDER BY sessions DESC
    LIMIT 30
  ),
  pages AS (
    SELECT
      path,
      max(title) AS title,
      count(*)::integer AS pageviews,
      count(DISTINCT visitor_id)::integer AS visitors,
      count(DISTINCT session_id)::integer AS sessions,
      coalesce(round(avg(NULLIF(active_ms, 0)))::integer, 0) AS avg_ms,
      round(
        100.0 * count(*) FILTER (
          WHERE session_id IN (
            SELECT s.id FROM sessions s WHERE s.exit_path = path OR s.exit_path LIKE path || '%'
          )
        ) / nullif(count(DISTINCT session_id), 0),
        1
      ) AS bounce_rate
    FROM pageviews
    GROUP BY path
    ORDER BY pageviews DESC
    LIMIT 40
  ),
  worship AS (
    SELECT
      post_id::text AS post_id,
      post_type,
      max(title) AS title,
      count(*)::integer AS pageviews,
      count(DISTINCT visitor_id)::integer AS visitors,
      coalesce(round(avg(NULLIF(active_ms, 0)))::integer, 0) AS avg_ms
    FROM pageviews
    WHERE post_type IN ('sunday_sermon', 'el_shaddai_choir')
      AND post_id IS NOT NULL
    GROUP BY post_id, post_type
    ORDER BY pageviews DESC
    LIMIT 30
  ),
  duration_buckets AS (
    SELECT bucket, count(*)::integer AS sessions
    FROM (
      SELECT
        CASE
          WHEN active_ms < 10000 THEN '10초 미만'
          WHEN active_ms < 30000 THEN '10~30초'
          WHEN active_ms < 60000 THEN '30초~1분'
          WHEN active_ms < 180000 THEN '1~3분'
          WHEN active_ms < 300000 THEN '3~5분'
          ELSE '5분 이상'
        END AS bucket,
        CASE
          WHEN active_ms < 10000 THEN 1
          WHEN active_ms < 30000 THEN 2
          WHEN active_ms < 60000 THEN 3
          WHEN active_ms < 180000 THEN 4
          WHEN active_ms < 300000 THEN 5
          ELSE 6
        END AS sort_key
      FROM sessions
      WHERE active_ms > 0
    ) t
    GROUP BY bucket, sort_key
    ORDER BY sort_key
  ),
  hourly AS (
    SELECT
      (extract(hour FROM started_at AT TIME ZONE 'Asia/Seoul')::integer / 3) * 3 AS hour_start,
      count(*)::integer AS sessions,
      count(DISTINCT visitor_id)::integer AS visitors
    FROM sessions
    GROUP BY 1
    ORDER BY 1
  ),
  weekday AS (
    SELECT
      extract(dow FROM started_at AT TIME ZONE 'Asia/Seoul')::integer AS dow,
      count(*)::integer AS sessions,
      count(DISTINCT visitor_id)::integer AS visitors
    FROM sessions
    GROUP BY 1
    ORDER BY 1
  ),
  devices AS (
    SELECT device_type AS name, count(*)::integer AS sessions
    FROM sessions
    GROUP BY 1
    ORDER BY sessions DESC
  ),
  browsers AS (
    SELECT coalesce(nullif(browser_name, ''), 'unknown') AS name, count(*)::integer AS sessions
    FROM sessions
    GROUP BY 1
    ORDER BY sessions DESC
    LIMIT 15
  ),
  os AS (
    SELECT coalesce(nullif(os_name, ''), 'unknown') AS name, count(*)::integer AS sessions
    FROM sessions
    GROUP BY 1
    ORDER BY sessions DESC
    LIMIT 15
  ),
  viewports AS (
    SELECT
      CASE
        WHEN viewport_w IS NULL THEN 'unknown'
        WHEN viewport_w < 360 THEN '360px 미만'
        WHEN viewport_w < 390 THEN '360~389px'
        WHEN viewport_w < 430 THEN '390~429px'
        WHEN viewport_w < 768 THEN '430~767px'
        WHEN viewport_w < 992 THEN '768~991px'
        WHEN viewport_w < 1200 THEN '992~1199px'
        ELSE '1200px 이상'
      END AS bucket,
      count(*)::integer AS sessions
    FROM sessions
    GROUP BY 1
    ORDER BY sessions DESC
  ),
  landings AS (
    SELECT landing_path AS path, count(*)::integer AS sessions
    FROM sessions
    WHERE landing_path <> ''
    GROUP BY 1
    ORDER BY sessions DESC
    LIMIT 20
  ),
  exits AS (
    SELECT exit_path AS path, count(*)::integer AS sessions
    FROM sessions
    WHERE exit_path <> ''
    GROUP BY 1
    ORDER BY sessions DESC
    LIMIT 20
  ),
  scroll AS (
    SELECT
      count(*) FILTER (WHERE scroll_depth >= 25)::integer AS d25,
      count(*) FILTER (WHERE scroll_depth >= 50)::integer AS d50,
      count(*) FILTER (WHERE scroll_depth >= 75)::integer AS d75,
      count(*) FILTER (WHERE scroll_depth >= 90)::integer AS d90,
      count(*) FILTER (WHERE scroll_depth >= 100)::integer AS d100,
      count(*)::integer AS total
    FROM pageviews
  ),
  cta AS (
    SELECT
      coalesce(payload->>'label', event_name) AS label,
      count(*)::integer AS clicks
    FROM events
    WHERE event_name IN ('cta_click', 'nav_click', 'worship_play', 'external_click', 'search')
    GROUP BY 1
    ORDER BY clicks DESC
    LIMIT 40
  ),
  external_links AS (
    SELECT
      coalesce(payload->>'href', path) AS href,
      count(*)::integer AS clicks
    FROM events
    WHERE event_name = 'external_click'
    GROUP BY 1
    ORDER BY clicks DESC
    LIMIT 30
  ),
  visit_freq AS (
    SELECT bucket, count(*)::integer AS visitors
    FROM (
      SELECT
        visitor_id,
        CASE
          WHEN cnt = 1 THEN '1회'
          WHEN cnt BETWEEN 2 AND 3 THEN '2~3회'
          WHEN cnt BETWEEN 4 AND 9 THEN '4~9회'
          ELSE '10회 이상'
        END AS bucket
      FROM (
        SELECT visitor_id, count(*) AS cnt
        FROM sessions
        GROUP BY visitor_id
      ) c
    ) t
    GROUP BY bucket
  )
  SELECT jsonb_build_object(
    'summary', (SELECT to_jsonb(summary) FROM summary),
    'cumulative', (SELECT to_jsonb(cumulative) FROM cumulative),
    'daily', coalesce((SELECT jsonb_agg(to_jsonb(daily)) FROM daily), '[]'::jsonb),
    'referrers', coalesce((SELECT jsonb_agg(to_jsonb(referrers)) FROM referrers), '[]'::jsonb),
    'pages', coalesce((SELECT jsonb_agg(to_jsonb(pages)) FROM pages), '[]'::jsonb),
    'worship', coalesce((SELECT jsonb_agg(to_jsonb(worship)) FROM worship), '[]'::jsonb),
    'duration_buckets', coalesce((SELECT jsonb_agg(to_jsonb(duration_buckets)) FROM duration_buckets), '[]'::jsonb),
    'hourly', coalesce((SELECT jsonb_agg(to_jsonb(hourly)) FROM hourly), '[]'::jsonb),
    'weekday', coalesce((SELECT jsonb_agg(to_jsonb(weekday)) FROM weekday), '[]'::jsonb),
    'devices', coalesce((SELECT jsonb_agg(to_jsonb(devices)) FROM devices), '[]'::jsonb),
    'browsers', coalesce((SELECT jsonb_agg(to_jsonb(browsers)) FROM browsers), '[]'::jsonb),
    'os', coalesce((SELECT jsonb_agg(to_jsonb(os)) FROM os), '[]'::jsonb),
    'viewports', coalesce((SELECT jsonb_agg(to_jsonb(viewports)) FROM viewports), '[]'::jsonb),
    'landings', coalesce((SELECT jsonb_agg(to_jsonb(landings)) FROM landings), '[]'::jsonb),
    'exits', coalesce((SELECT jsonb_agg(to_jsonb(exits)) FROM exits), '[]'::jsonb),
    'scroll', (SELECT to_jsonb(scroll) FROM scroll),
    'cta', coalesce((SELECT jsonb_agg(to_jsonb(cta)) FROM cta), '[]'::jsonb),
    'external_links', coalesce((SELECT jsonb_agg(to_jsonb(external_links)) FROM external_links), '[]'::jsonb),
    'visit_freq', coalesce((SELECT jsonb_agg(to_jsonb(visit_freq)) FROM visit_freq), '[]'::jsonb)
  )
  INTO v_result;

  RETURN coalesce(v_result, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_site_analytics_dashboard(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_site_analytics_dashboard(date, date) TO authenticated;
