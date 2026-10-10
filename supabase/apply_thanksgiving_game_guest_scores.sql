-- ============================================================
-- Thanksgiving mini-game: member + guest leaderboard entries
-- Run in Supabase SQL Editor after 052 (or alone — creates tables/RPCs).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.thanksgiving_game_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_kind text NOT NULL CHECK (player_kind IN ('member', 'guest')),
  user_id uuid NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  guest_key text NULL,
  display_name text NOT NULL,
  best_score integer NOT NULL CHECK (best_score >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT thanksgiving_game_entries_member_uid UNIQUE (user_id),
  CONSTRAINT thanksgiving_game_entries_guest_key UNIQUE (guest_key),
  CONSTRAINT thanksgiving_game_entries_identity_chk CHECK (
    (
      player_kind = 'member'
      AND user_id IS NOT NULL
      AND guest_key IS NULL
    )
    OR (
      player_kind = 'guest'
      AND guest_key IS NOT NULL
      AND btrim(guest_key) <> ''
      AND user_id IS NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS thanksgiving_game_entries_best_score_idx
  ON public.thanksgiving_game_entries (best_score DESC, updated_at ASC);

ALTER TABLE public.thanksgiving_game_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS thanksgiving_game_entries_select_authenticated
  ON public.thanksgiving_game_entries;
CREATE POLICY thanksgiving_game_entries_select_authenticated
  ON public.thanksgiving_game_entries
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS thanksgiving_game_entries_select_anon
  ON public.thanksgiving_game_entries;
CREATE POLICY thanksgiving_game_entries_select_anon
  ON public.thanksgiving_game_entries
  FOR SELECT
  TO anon
  USING (true);

-- Migrate legacy member-only table if present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'thanksgiving_game_scores'
  ) THEN
    INSERT INTO public.thanksgiving_game_entries (
      player_kind,
      user_id,
      display_name,
      best_score,
      created_at,
      updated_at
    )
    SELECT
      'member',
      s.user_id,
      COALESCE(
        NULLIF(
          CASE
            WHEN p.nickname_enabled IS TRUE
              AND p.nickname IS NOT NULL
              AND btrim(p.nickname) <> ''
              THEN btrim(p.nickname)
            WHEN p.username IS NOT NULL AND btrim(p.username) <> ''
              THEN btrim(p.username)
            ELSE NULL
          END,
          ''
        ),
        '회원'
      ),
      s.best_score,
      s.created_at,
      s.updated_at
    FROM public.thanksgiving_game_scores s
    LEFT JOIN public.profiles p ON p.user_id = s.user_id
    ON CONFLICT (user_id) DO UPDATE
      SET best_score = GREATEST(
          public.thanksgiving_game_entries.best_score,
          EXCLUDED.best_score
        ),
        updated_at = CASE
          WHEN EXCLUDED.best_score > public.thanksgiving_game_entries.best_score
            THEN EXCLUDED.updated_at
          ELSE public.thanksgiving_game_entries.updated_at
        END;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.submit_thanksgiving_game_score(
  p_score integer,
  p_display_name text DEFAULT NULL,
  p_guest_key text DEFAULT NULL
)
RETURNS TABLE (
  best_score integer,
  is_new_best boolean,
  entry_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_name text := NULLIF(btrim(COALESCE(p_display_name, '')), '');
  v_guest text := NULLIF(btrim(COALESCE(p_guest_key, '')), '');
  v_existing integer;
  v_best integer;
  v_is_new boolean;
  v_id uuid;
BEGIN
  IF p_score IS NULL OR p_score < 0 THEN
    RAISE EXCEPTION 'invalid score';
  END IF;

  IF p_score > 100000 THEN
    p_score := 100000;
  END IF;

  IF v_name IS NULL OR char_length(v_name) < 2 OR char_length(v_name) > 12 THEN
    RAISE EXCEPTION 'invalid display name';
  END IF;

  IF v_uid IS NOT NULL THEN
    SELECT e.best_score, e.id
    INTO v_existing, v_id
    FROM public.thanksgiving_game_entries e
    WHERE e.player_kind = 'member' AND e.user_id = v_uid
    FOR UPDATE;

    IF v_existing IS NULL THEN
      INSERT INTO public.thanksgiving_game_entries (
        player_kind, user_id, display_name, best_score
      )
      VALUES ('member', v_uid, v_name, p_score)
      RETURNING id, thanksgiving_game_entries.best_score INTO v_id, v_best;
      v_is_new := true;
    ELSIF p_score > v_existing THEN
      UPDATE public.thanksgiving_game_entries
      SET best_score = p_score,
          display_name = v_name,
          updated_at = now()
      WHERE id = v_id
      RETURNING thanksgiving_game_entries.best_score INTO v_best;
      v_is_new := true;
    ELSE
      UPDATE public.thanksgiving_game_entries
      SET display_name = v_name,
          updated_at = updated_at
      WHERE id = v_id;
      v_best := v_existing;
      v_is_new := false;
    END IF;
  ELSE
    IF v_guest IS NULL OR char_length(v_guest) < 8 OR char_length(v_guest) > 80 THEN
      RAISE EXCEPTION 'guest key required';
    END IF;

    SELECT e.best_score, e.id
    INTO v_existing, v_id
    FROM public.thanksgiving_game_entries e
    WHERE e.player_kind = 'guest' AND e.guest_key = v_guest
    FOR UPDATE;

    IF v_existing IS NULL THEN
      INSERT INTO public.thanksgiving_game_entries (
        player_kind, guest_key, display_name, best_score
      )
      VALUES ('guest', v_guest, v_name, p_score)
      RETURNING id, thanksgiving_game_entries.best_score INTO v_id, v_best;
      v_is_new := true;
    ELSIF p_score > v_existing THEN
      UPDATE public.thanksgiving_game_entries
      SET best_score = p_score,
          display_name = v_name,
          updated_at = now()
      WHERE id = v_id
      RETURNING thanksgiving_game_entries.best_score INTO v_best;
      v_is_new := true;
    ELSE
      UPDATE public.thanksgiving_game_entries
      SET display_name = v_name
      WHERE id = v_id;
      v_best := v_existing;
      v_is_new := false;
    END IF;
  END IF;

  RETURN QUERY SELECT v_best, v_is_new, v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_thanksgiving_game_score(integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_thanksgiving_game_score(integer, text, text)
  TO anon, authenticated;

-- Keep old 1-arg RPC for compatibility (members only).
CREATE OR REPLACE FUNCTION public.submit_thanksgiving_game_score(p_score integer)
RETURNS TABLE (
  best_score integer,
  is_new_best boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.best_score, s.is_new_best
  FROM public.submit_thanksgiving_game_score(p_score, '회원', NULL) AS s;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_thanksgiving_game_score(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_thanksgiving_game_score(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_thanksgiving_game_ranking(limit_count integer DEFAULT 20)
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
  WITH ranked AS (
    SELECT
      e.id AS entry_id,
      e.player_kind,
      e.user_id,
      e.guest_key,
      e.display_name,
      e.best_score,
      dense_rank() OVER (ORDER BY e.best_score DESC) AS rank
    FROM public.thanksgiving_game_entries e
  )
  SELECT
    r.rank,
    r.entry_id,
    r.player_kind,
    r.user_id,
    r.guest_key,
    r.display_name,
    r.best_score
  FROM ranked r
  ORDER BY r.rank ASC, r.display_name ASC
  LIMIT GREATEST(1, LEAST(COALESCE(limit_count, 20), 100));
$$;

REVOKE ALL ON FUNCTION public.get_thanksgiving_game_ranking(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_thanksgiving_game_ranking(integer) TO anon, authenticated;

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
  v_uid uuid := auth.uid();
  v_guest text := NULLIF(btrim(COALESCE(p_guest_key, '')), '');
  v_id uuid;
  v_score integer;
  v_rank bigint;
BEGIN
  IF v_uid IS NOT NULL THEN
    SELECT e.id, e.best_score
    INTO v_id, v_score
    FROM public.thanksgiving_game_entries e
    WHERE e.player_kind = 'member' AND e.user_id = v_uid;
  ELSIF v_guest IS NOT NULL THEN
    SELECT e.id, e.best_score
    INTO v_id, v_score
    FROM public.thanksgiving_game_entries e
    WHERE e.player_kind = 'guest' AND e.guest_key = v_guest;
  ELSE
    RETURN;
  END IF;

  IF v_id IS NULL THEN
    RETURN;
  END IF;

  SELECT dr.rank
  INTO v_rank
  FROM (
    SELECT
      e.id,
      dense_rank() OVER (ORDER BY e.best_score DESC) AS rank
    FROM public.thanksgiving_game_entries e
  ) dr
  WHERE dr.id = v_id;

  RETURN QUERY SELECT v_score, v_rank, v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_thanksgiving_game_score(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_thanksgiving_game_score(text) TO anon, authenticated;
