-- ============================================================
-- Thanksgiving mini-game personal best scores + ranking RPCs
-- Supabase Dashboard → SQL Editor → Run this file
-- ============================================================

CREATE TABLE IF NOT EXISTS public.thanksgiving_game_scores (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  best_score integer NOT NULL CHECK (best_score >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS thanksgiving_game_scores_best_score_idx
  ON public.thanksgiving_game_scores (best_score DESC, updated_at ASC);

ALTER TABLE public.thanksgiving_game_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS thanksgiving_game_scores_select_authenticated
  ON public.thanksgiving_game_scores;
CREATE POLICY thanksgiving_game_scores_select_authenticated
  ON public.thanksgiving_game_scores
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS thanksgiving_game_scores_select_anon
  ON public.thanksgiving_game_scores;
CREATE POLICY thanksgiving_game_scores_select_anon
  ON public.thanksgiving_game_scores
  FOR SELECT
  TO anon
  USING (true);

-- No direct client insert/update/delete — use SECURITY DEFINER RPC only.

CREATE OR REPLACE FUNCTION public.submit_thanksgiving_game_score(p_score integer)
RETURNS TABLE (
  best_score integer,
  is_new_best boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_existing integer;
  v_best integer;
  v_is_new boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF p_score IS NULL OR p_score < 0 THEN
    RAISE EXCEPTION 'invalid score';
  END IF;

  -- Cap absurd client values (client-side scoring is not fully cheat-proof).
  IF p_score > 100000 THEN
    p_score := 100000;
  END IF;

  SELECT s.best_score
  INTO v_existing
  FROM public.thanksgiving_game_scores s
  WHERE s.user_id = v_uid
  FOR UPDATE;

  IF v_existing IS NULL THEN
    INSERT INTO public.thanksgiving_game_scores (user_id, best_score)
    VALUES (v_uid, p_score)
    RETURNING thanksgiving_game_scores.best_score INTO v_best;
    v_is_new := true;
  ELSIF p_score > v_existing THEN
    UPDATE public.thanksgiving_game_scores
    SET best_score = p_score,
        updated_at = now()
    WHERE user_id = v_uid
    RETURNING thanksgiving_game_scores.best_score INTO v_best;
    v_is_new := true;
  ELSE
    v_best := v_existing;
    v_is_new := false;
  END IF;

  RETURN QUERY SELECT v_best, v_is_new;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_thanksgiving_game_score(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_thanksgiving_game_score(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_thanksgiving_game_ranking(limit_count integer DEFAULT 20)
RETURNS TABLE (
  rank bigint,
  user_id uuid,
  display_name text,
  best_score integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      s.user_id,
      s.best_score,
      dense_rank() OVER (ORDER BY s.best_score DESC) AS rank,
      CASE
        WHEN p.nickname_enabled IS TRUE
          AND p.nickname IS NOT NULL
          AND btrim(p.nickname) <> ''
          THEN btrim(p.nickname)
        WHEN p.username IS NOT NULL AND btrim(p.username) <> ''
          THEN btrim(p.username)
        ELSE '회원'
      END AS display_name
    FROM public.thanksgiving_game_scores s
    LEFT JOIN public.profiles p ON p.user_id = s.user_id
  )
  SELECT
    r.rank,
    r.user_id,
    r.display_name,
    r.best_score
  FROM ranked r
  ORDER BY r.rank ASC, r.display_name ASC
  LIMIT GREATEST(1, LEAST(COALESCE(limit_count, 20), 100));
$$;

REVOKE ALL ON FUNCTION public.get_thanksgiving_game_ranking(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_thanksgiving_game_ranking(integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_thanksgiving_game_score()
RETURNS TABLE (
  best_score integer,
  rank bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT s.best_score
    FROM public.thanksgiving_game_scores s
    WHERE s.user_id = auth.uid()
  ),
  ranked AS (
    SELECT
      s.user_id,
      s.best_score,
      dense_rank() OVER (ORDER BY s.best_score DESC) AS rank
    FROM public.thanksgiving_game_scores s
  )
  SELECT
    m.best_score,
    r.rank
  FROM me m
  LEFT JOIN ranked r ON r.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_thanksgiving_game_score() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_thanksgiving_game_score() TO authenticated;
