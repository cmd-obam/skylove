-- ============================================================
-- 사이트 방문자 통계 (TODAY / TOTAL)
-- Supabase Dashboard → SQL Editor 에서 실행하거나 migration 적용
--
-- - 싱글톤 행(id=1)에 today_count / total_count 보관
-- - 날짜는 Asia/Seoul 기준
-- - anon/authenticated: SELECT만 허용, 증가는 SECURITY DEFINER RPC만
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_visitor_stats (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total_count bigint NOT NULL DEFAULT 0 CHECK (total_count >= 0),
  today_count bigint NOT NULL DEFAULT 0 CHECK (today_count >= 0),
  stat_date date NOT NULL DEFAULT ((timezone('Asia/Seoul', now()))::date),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.site_visitor_stats (id, total_count, today_count, stat_date)
VALUES (1, 0, 0, (timezone('Asia/Seoul', now()))::date)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_visitor_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read visitor stats" ON public.site_visitor_stats;
CREATE POLICY "Anyone can read visitor stats"
  ON public.site_visitor_stats
  FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE ALL ON TABLE public.site_visitor_stats FROM PUBLIC;
GRANT SELECT ON TABLE public.site_visitor_stats TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.site_visitor_stats FROM anon, authenticated;

-- 조회: 날짜가 바뀌었으면 today_count 는 0 으로 반환 (행은 다음 방문 시 갱신)
CREATE OR REPLACE FUNCTION public.get_site_visitor_stats()
RETURNS TABLE (today_count bigint, total_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (timezone('Asia/Seoul', now()))::date;
  v_row public.site_visitor_stats%ROWTYPE;
BEGIN
  SELECT *
  INTO v_row
  FROM public.site_visitor_stats
  WHERE id = 1;

  IF NOT FOUND THEN
    today_count := 0;
    total_count := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_row.stat_date = v_today THEN
    today_count := v_row.today_count;
  ELSE
    today_count := 0;
  END IF;

  total_count := v_row.total_count;
  RETURN NEXT;
END;
$$;

-- 증가: 클라이언트는 localStorage 로 하루 1회만 호출. DB 는 원자적 UPDATE.
CREATE OR REPLACE FUNCTION public.record_site_visit()
RETURNS TABLE (today_count bigint, total_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (timezone('Asia/Seoul', now()))::date;
BEGIN
  UPDATE public.site_visitor_stats AS s
  SET
    total_count = s.total_count + 1,
    today_count = CASE
      WHEN s.stat_date = v_today THEN s.today_count + 1
      ELSE 1
    END,
    stat_date = v_today,
    updated_at = now()
  WHERE s.id = 1;

  IF NOT FOUND THEN
    INSERT INTO public.site_visitor_stats (id, total_count, today_count, stat_date)
    VALUES (1, 1, 1, v_today);
  END IF;

  RETURN QUERY
  SELECT
    CASE
      WHEN s.stat_date = v_today THEN s.today_count
      ELSE 0::bigint
    END AS today_count,
    s.total_count
  FROM public.site_visitor_stats AS s
  WHERE s.id = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_site_visitor_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_site_visit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_site_visitor_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_site_visit() TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
