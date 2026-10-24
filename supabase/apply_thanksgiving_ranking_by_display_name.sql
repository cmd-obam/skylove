-- ============================================================
-- Ranking board: one row per display name, score = highest saved score.
-- Stored rows, user ids, and guest keys are not deleted or rewritten.
-- ============================================================

CREATE OR REPLACE FUNCTION public.thanksgiving_game_ranking_source()
RETURNS TABLE (
  rank bigint,
  entry_id uuid,
  player_kind text,
  user_id uuid,
  guest_key text,
  display_name text,
  best_score integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH named AS (
    SELECT
      e.id,
      e.player_kind,
      CASE
        WHEN e.player_kind = 'member' AND e.user_id IS NOT NULL
          THEN public.resolve_primary_user_id(e.user_id)
        ELSE NULL
      END AS user_id,
      CASE
        WHEN e.player_kind = 'guest' THEN NULLIF(btrim(e.guest_key), '')
        ELSE NULL
      END AS guest_key,
      btrim(
        COALESCE(
          CASE
            WHEN e.player_kind = 'member' AND e.user_id IS NOT NULL
              THEN public.thanksgiving_member_display_name(e.user_id)
            ELSE NULL
          END,
          e.display_name
        )
      ) AS display_name,
      e.best_score,
      e.created_at
    FROM public.thanksgiving_game_entries e
  ),
  grouped AS (
    SELECT
      lower(n.display_name) AS name_key,
      MAX(n.best_score) AS best_score,
      (ARRAY_AGG(n.id ORDER BY n.best_score DESC, n.created_at ASC, n.id ASC))[1] AS entry_id,
      (ARRAY_AGG(n.player_kind ORDER BY n.best_score DESC, n.created_at ASC, n.id ASC))[1] AS player_kind,
      (ARRAY_AGG(n.user_id ORDER BY n.best_score DESC, n.created_at ASC, n.id ASC))[1] AS user_id,
      (ARRAY_AGG(n.guest_key ORDER BY n.best_score DESC, n.created_at ASC, n.id ASC))[1] AS guest_key,
      (ARRAY_AGG(n.display_name ORDER BY n.best_score DESC, n.created_at ASC, n.id ASC))[1] AS display_name
    FROM named n
    WHERE n.display_name <> ''
    GROUP BY lower(n.display_name)
  )
  SELECT
    dense_rank() OVER (ORDER BY g.best_score DESC) AS rank,
    g.entry_id,
    g.player_kind,
    g.user_id,
    g.guest_key,
    g.display_name,
    g.best_score
  FROM grouped g;
$$;

REVOKE ALL ON FUNCTION public.thanksgiving_game_ranking_source() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.thanksgiving_game_ranking_source() FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_thanksgiving_game_score(
  p_guest_key text DEFAULT NULL
)
RETURNS TABLE (
  best_score integer,
  rank bigint,
  entry_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := public.effective_user_id();
  v_guest text := NULLIF(btrim(COALESCE(p_guest_key, '')), '');
  v_score integer;
  v_id uuid;
  v_name text;
  v_rank bigint;
BEGIN
  IF v_uid IS NOT NULL THEN
    SELECT
      e.best_score,
      e.id,
      btrim(COALESCE(public.thanksgiving_member_display_name(e.user_id), e.display_name))
    INTO v_score, v_id, v_name
    FROM public.thanksgiving_game_entries e
    WHERE e.player_kind = 'member'
      AND e.user_id IS NOT NULL
      AND public.resolve_primary_user_id(e.user_id) = v_uid
    ORDER BY e.best_score DESC, e.created_at ASC
    LIMIT 1;
  ELSIF v_guest IS NOT NULL THEN
    SELECT e.best_score, e.id, btrim(e.display_name)
    INTO v_score, v_id, v_name
    FROM public.thanksgiving_game_entries e
    WHERE e.player_kind = 'guest'
      AND e.guest_key = v_guest
    ORDER BY e.best_score DESC, e.created_at ASC
    LIMIT 1;
  ELSE
    RETURN;
  END IF;

  IF v_id IS NULL THEN
    RETURN;
  END IF;

  SELECT s.rank
  INTO v_rank
  FROM public.thanksgiving_game_ranking_source() s
  WHERE lower(btrim(s.display_name)) = lower(btrim(COALESCE(v_name, '')))
  LIMIT 1;

  RETURN QUERY SELECT v_score, v_rank, v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_thanksgiving_game_score(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_thanksgiving_game_score(text) TO anon, authenticated;
