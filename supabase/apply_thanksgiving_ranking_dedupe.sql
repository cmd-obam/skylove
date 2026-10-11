-- ============================================================
-- Clean duplicate Thanksgiving ranking rows, then collapse by nickname.
-- Run in Supabase SQL Editor.
-- ============================================================

-- 1) Members: merge stats onto keeper, then delete extras
WITH member_stats AS (
  SELECT
    user_id,
    MAX(best_score) AS best_score,
    (ARRAY_AGG(display_name ORDER BY updated_at DESC))[1] AS display_name,
    MIN(created_at) AS created_at,
    (ARRAY_AGG(id ORDER BY best_score DESC, updated_at DESC))[1] AS keep_id
  FROM public.thanksgiving_game_entries
  WHERE player_kind = 'member'
    AND user_id IS NOT NULL
  GROUP BY user_id
)
UPDATE public.thanksgiving_game_entries e
SET
  best_score = s.best_score,
  display_name = s.display_name,
  created_at = s.created_at,
  updated_at = now()
FROM member_stats s
WHERE e.id = s.keep_id;

DELETE FROM public.thanksgiving_game_entries e
WHERE e.player_kind = 'member'
  AND e.user_id IS NOT NULL
  AND e.id NOT IN (
    SELECT (ARRAY_AGG(id ORDER BY best_score DESC, updated_at DESC))[1]
    FROM public.thanksgiving_game_entries
    WHERE player_kind = 'member'
      AND user_id IS NOT NULL
    GROUP BY user_id
  );

-- 2) Guests: one row per guest_key
WITH guest_stats AS (
  SELECT
    guest_key,
    MAX(best_score) AS best_score,
    (ARRAY_AGG(display_name ORDER BY updated_at DESC))[1] AS display_name,
    MIN(created_at) AS created_at,
    (ARRAY_AGG(id ORDER BY best_score DESC, updated_at DESC))[1] AS keep_id
  FROM public.thanksgiving_game_entries
  WHERE player_kind = 'guest'
    AND guest_key IS NOT NULL
  GROUP BY guest_key
)
UPDATE public.thanksgiving_game_entries e
SET
  best_score = s.best_score,
  display_name = s.display_name,
  created_at = s.created_at,
  updated_at = now()
FROM guest_stats s
WHERE e.id = s.keep_id;

DELETE FROM public.thanksgiving_game_entries e
WHERE e.player_kind = 'guest'
  AND e.guest_key IS NOT NULL
  AND e.id NOT IN (
    SELECT (ARRAY_AGG(id ORDER BY best_score DESC, updated_at DESC))[1]
    FROM public.thanksgiving_game_entries
    WHERE player_kind = 'guest'
      AND guest_key IS NOT NULL
    GROUP BY guest_key
  );

-- 3) Same nickname still duplicated (e.g. member + guest): keep best score only
WITH name_stats AS (
  SELECT
    lower(btrim(display_name)) AS name_key,
    (ARRAY_AGG(
      id
      ORDER BY
        best_score DESC,
        CASE WHEN player_kind = 'member' THEN 0 ELSE 1 END,
        updated_at DESC
    ))[1] AS keep_id
  FROM public.thanksgiving_game_entries
  GROUP BY lower(btrim(display_name))
)
DELETE FROM public.thanksgiving_game_entries e
WHERE e.id NOT IN (SELECT keep_id FROM name_stats);

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

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'thanksgiving_game_entries_guest_key'
      AND conrelid = 'public.thanksgiving_game_entries'::regclass
  ) THEN
    ALTER TABLE public.thanksgiving_game_entries
      ADD CONSTRAINT thanksgiving_game_entries_guest_key UNIQUE (guest_key);
  END IF;
END $$;

-- Ranking API: never show the same nickname twice.
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
      lower(btrim(e.display_name)) AS name_key,
      CASE
        WHEN e.player_kind = 'member' AND e.user_id IS NOT NULL
          THEN 'm:' || e.user_id::text
        ELSE 'g:' || COALESCE(e.guest_key, e.id::text)
      END AS identity_key
    FROM public.thanksgiving_game_entries e
  ),
  by_identity AS (
    SELECT
      identity_key,
      (ARRAY_AGG(entry_id ORDER BY best_score DESC, updated_at DESC))[1] AS entry_id,
      (ARRAY_AGG(player_kind ORDER BY best_score DESC, updated_at DESC))[1] AS player_kind,
      (ARRAY_AGG(user_id ORDER BY best_score DESC, updated_at DESC))[1] AS user_id,
      (ARRAY_AGG(guest_key ORDER BY best_score DESC, updated_at DESC))[1] AS guest_key,
      (ARRAY_AGG(display_name ORDER BY updated_at DESC))[1] AS display_name,
      (ARRAY_AGG(name_key ORDER BY updated_at DESC))[1] AS name_key,
      MAX(best_score) AS best_score,
      MAX(updated_at) AS updated_at
    FROM identity_rows
    GROUP BY identity_key
  ),
  by_name AS (
    SELECT
      name_key,
      (ARRAY_AGG(entry_id ORDER BY best_score DESC, CASE WHEN player_kind = 'member' THEN 0 ELSE 1 END, updated_at DESC))[1] AS entry_id,
      (ARRAY_AGG(player_kind ORDER BY best_score DESC, CASE WHEN player_kind = 'member' THEN 0 ELSE 1 END, updated_at DESC))[1] AS player_kind,
      (ARRAY_AGG(user_id ORDER BY best_score DESC, CASE WHEN player_kind = 'member' THEN 0 ELSE 1 END, updated_at DESC))[1] AS user_id,
      (ARRAY_AGG(guest_key ORDER BY best_score DESC, CASE WHEN player_kind = 'member' THEN 0 ELSE 1 END, updated_at DESC))[1] AS guest_key,
      (ARRAY_AGG(display_name ORDER BY updated_at DESC))[1] AS display_name,
      MAX(best_score) AS best_score
    FROM by_identity
    GROUP BY name_key
  ),
  ranked AS (
    SELECT
      b.entry_id,
      b.player_kind,
      b.user_id,
      b.guest_key,
      b.display_name,
      b.best_score,
      dense_rank() OVER (ORDER BY b.best_score DESC) AS rank
    FROM by_name b
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

-- Keep my-rank calculation consistent with collapsed ranking.
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
  v_name_key text;
BEGIN
  IF v_uid IS NOT NULL THEN
    SELECT e.id, e.best_score, lower(btrim(e.display_name))
    INTO v_id, v_score, v_name_key
    FROM public.thanksgiving_game_entries e
    WHERE e.player_kind = 'member' AND e.user_id = v_uid;
  ELSIF v_guest IS NOT NULL THEN
    SELECT e.id, e.best_score, lower(btrim(e.display_name))
    INTO v_id, v_score, v_name_key
    FROM public.thanksgiving_game_entries e
    WHERE e.player_kind = 'guest' AND e.guest_key = v_guest;
  ELSE
    RETURN;
  END IF;

  IF v_id IS NULL THEN
    RETURN;
  END IF;

  SELECT r.rank
  INTO v_rank
  FROM public.get_thanksgiving_game_ranking(100) r
  WHERE r.entry_id = v_id
     OR (
       v_name_key IS NOT NULL
       AND lower(btrim(r.display_name)) = v_name_key
     )
  ORDER BY CASE WHEN r.entry_id = v_id THEN 0 ELSE 1 END
  LIMIT 1;

  RETURN QUERY SELECT v_score, v_rank, v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_thanksgiving_game_score(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_thanksgiving_game_score(text) TO anon, authenticated;
