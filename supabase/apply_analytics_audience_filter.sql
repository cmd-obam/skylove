-- ============================================================
-- Site analytics dashboard audience filter: all | guest | member
-- Preserves existing tables / ingest / footer TODAY·TOTAL.
-- ============================================================

CREATE INDEX IF NOT EXISTS site_analytics_sessions_member_started_idx
  ON public.site_analytics_sessions (is_member, started_at DESC);

CREATE INDEX IF NOT EXISTS site_analytics_sessions_user_started_idx
  ON public.site_analytics_sessions (user_id, started_at DESC)
  WHERE user_id IS NOT NULL;

DROP FUNCTION IF EXISTS public.get_site_analytics_dashboard(date, date);

CREATE OR REPLACE FUNCTION public.get_site_analytics_dashboard(
  p_from date,
  p_to date,
  p_audience text DEFAULT 'all'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from timestamptz;
  v_to timestamptz;
  v_audience text := lower(trim(coalesce(p_audience, 'all')));
  v_result jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_from IS NULL OR p_to IS NULL THEN
    RAISE EXCEPTION 'invalid_range';
  END IF;

  IF v_audience NOT IN ('all', 'guest', 'member') THEN
    v_audience := 'all';
  END IF;

  v_from := (p_from::text || ' 00:00:00')::timestamp AT TIME ZONE 'Asia/Seoul';
  v_to := ((p_to + 1)::text || ' 00:00:00')::timestamp AT TIME ZONE 'Asia/Seoul';

  WITH sessions AS (
    SELECT *
    FROM public.site_analytics_sessions
    WHERE started_at >= v_from
      AND started_at < v_to
      AND (
        v_audience = 'all'
        OR (v_audience = 'member' AND is_member AND user_id IS NOT NULL)
        OR (v_audience = 'guest' AND NOT is_member)
      )
  ),
  pageviews AS (
    SELECT p.*
    FROM public.site_analytics_pageviews p
    WHERE p.session_id IN (SELECT id FROM sessions)
  ),
  events AS (
    SELECT e.*
    FROM public.site_analytics_events e
    WHERE e.session_id IN (SELECT id FROM sessions)
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
      (
        SELECT count(DISTINCT visitor_id)
        FROM public.site_analytics_sessions
        WHERE
          v_audience = 'all'
          OR (v_audience = 'member' AND is_member AND user_id IS NOT NULL)
          OR (v_audience = 'guest' AND NOT is_member)
      ) AS visitors,
      (
        SELECT count(*)
        FROM public.site_analytics_sessions
        WHERE
          v_audience = 'all'
          OR (v_audience = 'member' AND is_member AND user_id IS NOT NULL)
          OR (v_audience = 'guest' AND NOT is_member)
      ) AS sessions,
      (
        SELECT count(*)
        FROM public.site_analytics_pageviews p
        WHERE p.session_id IN (
          SELECT s.id
          FROM public.site_analytics_sessions s
          WHERE
            v_audience = 'all'
            OR (v_audience = 'member' AND s.is_member AND s.user_id IS NOT NULL)
            OR (v_audience = 'guest' AND NOT s.is_member)
        )
      ) AS pageviews
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
  ),
  member_base AS (
    SELECT
      s.user_id,
      min(s.started_at) AS first_visit_at,
      max(coalesce(s.ended_at, s.updated_at, s.started_at)) AS last_visit_at,
      coalesce(sum(s.active_ms), 0)::integer AS active_ms,
      coalesce(sum(s.pageview_count), 0)::integer AS pageviews,
      count(*)::integer AS sessions
    FROM sessions s
    WHERE s.is_member
      AND s.user_id IS NOT NULL
    GROUP BY s.user_id
  ),
  member_paths AS (
    SELECT
      s.user_id,
      (
        SELECT coalesce(
          jsonb_agg(to_jsonb(t.path) ORDER BY t.first_entered),
          '[]'::jsonb
        )
        FROM (
          SELECT pv.path, min(pv.entered_at) AS first_entered
          FROM public.site_analytics_pageviews pv
          INNER JOIN sessions s2 ON s2.id = pv.session_id
          WHERE s2.user_id = s.user_id
            AND pv.path <> ''
          GROUP BY pv.path
          ORDER BY min(pv.entered_at)
          LIMIT 40
        ) t
      ) AS paths
    FROM sessions s
    WHERE s.is_member
      AND s.user_id IS NOT NULL
    GROUP BY s.user_id
  ),
  member_visits AS (
    SELECT
      m.user_id::text AS user_id,
      coalesce(p.name, '')::text AS name,
      coalesce(p.username, '')::text AS username,
      m.first_visit_at,
      m.last_visit_at,
      m.active_ms,
      m.pageviews,
      m.sessions,
      coalesce(mp.paths, '[]'::jsonb) AS paths
    FROM member_base m
    LEFT JOIN public.profiles p
      ON p.user_id = public.resolve_primary_user_id(m.user_id)
    LEFT JOIN member_paths mp ON mp.user_id = m.user_id
    ORDER BY m.last_visit_at DESC
  )
  SELECT jsonb_build_object(
    'audience', v_audience,
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
    'visit_freq', coalesce((SELECT jsonb_agg(to_jsonb(visit_freq)) FROM visit_freq), '[]'::jsonb),
    'member_visits', coalesce((SELECT jsonb_agg(to_jsonb(member_visits)) FROM member_visits), '[]'::jsonb)
  )
  INTO v_result;

  RETURN coalesce(v_result, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_site_analytics_dashboard(date, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_site_analytics_dashboard(date, date, text) TO authenticated;
