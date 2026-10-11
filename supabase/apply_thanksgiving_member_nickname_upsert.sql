-- ============================================================
-- Members: one ranking row per user_id; always apply latest nickname.
-- Guests unchanged (keyed by guest_key).
-- ============================================================

-- Prefer latest nickname + best score when collapsing duplicates.
WITH member_dupes AS (
  SELECT
    user_id,
    MAX(best_score) AS best_score,
    (ARRAY_AGG(display_name ORDER BY updated_at DESC))[1] AS display_name,
    (ARRAY_AGG(id ORDER BY best_score DESC, updated_at DESC))[1] AS keep_id,
    MIN(created_at) AS created_at
  FROM public.thanksgiving_game_entries
  WHERE player_kind = 'member'
    AND user_id IS NOT NULL
  GROUP BY user_id
  HAVING COUNT(*) > 1
)
UPDATE public.thanksgiving_game_entries e
SET
  best_score = d.best_score,
  display_name = d.display_name,
  created_at = d.created_at,
  updated_at = now()
FROM member_dupes d
WHERE e.id = d.keep_id;

DELETE FROM public.thanksgiving_game_entries e
WHERE e.player_kind = 'member'
  AND e.user_id IS NOT NULL
  AND e.id NOT IN (
    SELECT DISTINCT ON (user_id) id
    FROM public.thanksgiving_game_entries
    WHERE player_kind = 'member'
      AND user_id IS NOT NULL
    ORDER BY user_id, best_score DESC, updated_at DESC
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'thanksgiving_game_entries_member_uid'
      AND conrelid = 'public.thanksgiving_game_entries'::regclass
  ) THEN
    ALTER TABLE public.thanksgiving_game_entries
      ADD CONSTRAINT thanksgiving_game_entries_member_uid UNIQUE (user_id);
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
    -- Logged-in member: one row per user_id; nickname always becomes latest.
    SELECT e.best_score, e.id
    INTO v_existing, v_id
    FROM public.thanksgiving_game_entries e
    WHERE e.player_kind = 'member' AND e.user_id = v_uid
    FOR UPDATE;

    IF v_id IS NULL THEN
      INSERT INTO public.thanksgiving_game_entries (
        player_kind, user_id, display_name, best_score
      )
      VALUES ('member', v_uid, v_name, p_score)
      ON CONFLICT (user_id) DO UPDATE
      SET
        display_name = EXCLUDED.display_name,
        best_score = GREATEST(public.thanksgiving_game_entries.best_score, EXCLUDED.best_score),
        updated_at = now()
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
      -- Keep best score; always apply the newest nickname.
      UPDATE public.thanksgiving_game_entries
      SET display_name = v_name,
          updated_at = CASE
            WHEN display_name IS DISTINCT FROM v_name THEN now()
            ELSE updated_at
          END
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

    IF v_id IS NULL THEN
      INSERT INTO public.thanksgiving_game_entries (
        player_kind, guest_key, display_name, best_score
      )
      VALUES ('guest', v_guest, v_name, p_score)
      ON CONFLICT (guest_key) DO UPDATE
      SET
        display_name = EXCLUDED.display_name,
        best_score = GREATEST(public.thanksgiving_game_entries.best_score, EXCLUDED.best_score),
        updated_at = now()
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
          updated_at = CASE
            WHEN display_name IS DISTINCT FROM v_name THEN now()
            ELSE updated_at
          END
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

-- Ranking: one row per member (user_id) / guest (guest_key).
-- Score = best; nickname = most recently updated.
DROP FUNCTION IF EXISTS public.get_thanksgiving_game_ranking(integer);

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
  WITH identity_rows AS (
    SELECT
      e.id AS entry_id,
      e.player_kind,
      e.user_id,
      e.guest_key,
      e.display_name,
      e.best_score,
      e.updated_at,
      CASE
        WHEN e.player_kind = 'member' THEN 'm:' || e.user_id::text
        ELSE 'g:' || e.guest_key
      END AS identity_key
    FROM public.thanksgiving_game_entries e
  ),
  collapsed AS (
    SELECT
      identity_key,
      (ARRAY_AGG(entry_id ORDER BY best_score DESC, updated_at DESC))[1] AS entry_id,
      (ARRAY_AGG(player_kind ORDER BY best_score DESC, updated_at DESC))[1] AS player_kind,
      (ARRAY_AGG(user_id ORDER BY best_score DESC, updated_at DESC))[1] AS user_id,
      (ARRAY_AGG(guest_key ORDER BY best_score DESC, updated_at DESC))[1] AS guest_key,
      (ARRAY_AGG(display_name ORDER BY updated_at DESC))[1] AS display_name,
      MAX(best_score) AS best_score
    FROM identity_rows
    GROUP BY identity_key
  ),
  ranked AS (
    SELECT
      c.entry_id,
      c.player_kind,
      c.user_id,
      c.guest_key,
      c.display_name,
      c.best_score,
      dense_rank() OVER (ORDER BY c.best_score DESC) AS rank
    FROM collapsed c
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
