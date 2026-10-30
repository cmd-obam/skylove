-- ============================================================
-- Close thanksgiving ranking writes at 2026-10-30 23:59:00 KST.
-- Existing entries are not deleted or reset. Clock source remains now().
-- ============================================================

CREATE OR REPLACE FUNCTION public.thanksgiving_ranking_period_open(
  p_at timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT p_at >= timestamptz '2026-10-25 00:00:00+09'
     AND p_at < timestamptz '2026-10-30 23:59:00+09';
$$;

REVOKE ALL ON FUNCTION public.thanksgiving_ranking_period_open(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.thanksgiving_ranking_period_open(timestamptz) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_thanksgiving_ranking_period_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'is_open', public.thanksgiving_ranking_period_open(now()),
    'starts_at', '2026-10-25T00:00:00+09:00',
    'ends_at', '2026-10-30T23:59:00+09:00',
    'server_now', now()
  );
$$;

REVOKE ALL ON FUNCTION public.get_thanksgiving_ranking_period_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_thanksgiving_ranking_period_status() TO anon, authenticated;
