-- ============================================================
-- Thanksgiving ranking identity
--
-- Members: one ranking row per primary auth user id
--   (public.effective_user_id / resolve_primary_user_id).
-- Guests: one ranking row per guest_key.
-- Display names are labels only. Same names are not merged.
-- Guest rows are never converted into member rows.
-- Rows with no user id and no guest key are left untouched.
--
-- There is no per-play history table. thanksgiving_game_entries stores
-- each identity's best score. This script deletes a row only after the
-- same identity's higher score has been copied onto the keeper row.
--
-- Backup: public.thanksgiving_game_entries_backup_20261018
-- Restore (manual, only if this migration must be undone):
--   TRUNCATE public.thanksgiving_game_entries;
--   INSERT INTO public.thanksgiving_game_entries (
--     id, player_kind, user_id, guest_key, display_name, best_score, created_at, updated_at
--   )
--   SELECT id, player_kind, user_id, guest_key, display_name, best_score, created_at, updated_at
--   FROM public.thanksgiving_game_entries_backup_20261018;
-- ============================================================

CREATE TABLE IF NOT EXISTS public.thanksgiving_game_entries_backup_20261018 (
  id uuid,
  player_kind text,
  user_id uuid,
  guest_key text,
  display_name text,
  best_score integer,
  created_at timestamptz,
  updated_at timestamptz,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.thanksgiving_game_entries_backup_20261018 (
  id,
  player_kind,
  user_id,
  guest_key,
  display_name,
  best_score,
  created_at,
  updated_at,
  backed_up_at
)
SELECT
  e.id,
  e.player_kind,
  e.user_id,
  e.guest_key,
  e.display_name,
  e.best_score,
  e.created_at,
  e.updated_at,
  now()
FROM public.thanksgiving_game_entries e
WHERE NOT EXISTS (
  SELECT 1 FROM public.thanksgiving_game_entries_backup_20261018
);

ALTER TABLE public.thanksgiving_game_entries_backup_20261018 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.thanksgiving_game_entries_backup_20261018 FROM PUBLIC;
REVOKE ALL ON TABLE public.thanksgiving_game_entries_backup_20261018 FROM anon, authenticated;

-- Live member label. Matches getPublicDisplayName: nickname only when enabled.
CREATE OR REPLACE FUNCTION public.thanksgiving_member_display_name(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(
    btrim(
      CASE
        WHEN p.nickname_enabled IS TRUE AND NULLIF(btrim(p.nickname), '') IS NOT NULL
          THEN btrim(p.nickname)
        WHEN NULLIF(btrim(p.name), '') IS NOT NULL
          THEN btrim(p.name)
        WHEN NULLIF(btrim(p.username), '') IS NOT NULL
          THEN btrim(p.username)
        ELSE ''
      END
    ),
    ''
  )
  FROM public.profiles p
  WHERE p.user_id = public.resolve_primary_user_id(p_user_id)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.thanksgiving_member_display_name(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.thanksgiving_member_display_name(uuid) FROM anon, authenticated;

-- Same member (linked accounts included): keep the best score, then drop extras.
WITH member_rows AS (
  SELECT
    e.id,
    public.resolve_primary_user_id(e.user_id) AS primary_id,
    e.best_score,
    e.created_at
  FROM public.thanksgiving_game_entries e
  WHERE e.player_kind = 'member'
    AND e.user_id IS NOT NULL
),
keepers AS (
  SELECT DISTINCT ON (primary_id)
    primary_id,
    id AS keep_id,
    MAX(best_score) OVER (PARTITION BY primary_id) AS max_score,
    MIN(created_at) OVER (PARTITION BY primary_id) AS min_created,
    COUNT(*) OVER (PARTITION BY primary_id) AS row_count
  FROM member_rows
  ORDER BY primary_id, member_rows.best_score DESC, member_rows.created_at ASC, member_rows.id ASC
)
UPDATE public.thanksgiving_game_entries e
SET
  best_score = k.max_score,
  created_at = k.min_created
FROM keepers k
WHERE e.id = k.keep_id
  AND k.row_count > 1
  AND (
    e.best_score IS DISTINCT FROM k.max_score
    OR e.created_at IS DISTINCT FROM k.min_created
  );

DELETE FROM public.thanksgiving_game_entries e
WHERE e.player_kind = 'member'
  AND e.user_id IS NOT NULL
  AND e.id NOT IN (
    SELECT DISTINCT ON (public.resolve_primary_user_id(user_id)) id
    FROM public.thanksgiving_game_entries
    WHERE player_kind = 'member'
      AND user_id IS NOT NULL
    ORDER BY
      public.resolve_primary_user_id(user_id),
      best_score DESC,
      created_at ASC,
      id ASC
  );

UPDATE public.thanksgiving_game_entries e
SET user_id = public.resolve_primary_user_id(e.user_id)
WHERE e.player_kind = 'member'
  AND e.user_id IS NOT NULL
  AND e.user_id IS DISTINCT FROM public.resolve_primary_user_id(e.user_id);

-- Same guest browser key only. Different keys stay separate even if the name matches.
WITH guest_stats AS (
  SELECT
    guest_key,
    MAX(best_score) AS best_score,
    MIN(created_at) AS created_at,
    (ARRAY_AGG(display_name ORDER BY updated_at DESC))[1] AS display_name,
    (ARRAY_AGG(id ORDER BY best_score DESC, created_at ASC, id ASC))[1] AS keep_id
  FROM public.thanksgiving_game_entries
  WHERE player_kind = 'guest'
    AND NULLIF(btrim(guest_key), '') IS NOT NULL
  GROUP BY guest_key
  HAVING COUNT(*) > 1
)
UPDATE public.thanksgiving_game_entries e
SET
  best_score = k.best_score,
  created_at = k.created_at,
  display_name = k.display_name
FROM guest_stats k
WHERE e.id = k.keep_id
  AND (
    e.best_score IS DISTINCT FROM k.best_score
    OR e.created_at IS DISTINCT FROM k.created_at
    OR e.display_name IS DISTINCT FROM k.display_name
  );

DELETE FROM public.thanksgiving_game_entries e
WHERE e.player_kind = 'guest'
  AND NULLIF(btrim(e.guest_key), '') IS NOT NULL
  AND e.id NOT IN (
    SELECT DISTINCT ON (guest_key) id
    FROM public.thanksgiving_game_entries
    WHERE player_kind = 'guest'
      AND NULLIF(btrim(guest_key), '') IS NOT NULL
    ORDER BY guest_key, best_score DESC, created_at ASC, id ASC
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
  WITH base AS (
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
      e.display_name,
      e.best_score,
      e.created_at,
      e.updated_at,
      CASE
        WHEN e.player_kind = 'member' AND e.user_id IS NOT NULL
          THEN 'm:' || public.resolve_primary_user_id(e.user_id)::text
        WHEN e.player_kind = 'guest' AND NULLIF(btrim(e.guest_key), '') IS NOT NULL
          THEN 'g:' || btrim(e.guest_key)
        ELSE 'unknown:' || e.id::text
      END AS identity_key
    FROM public.thanksgiving_game_entries e
  ),
  collapsed AS (
    SELECT
      (ARRAY_AGG(id ORDER BY best_score DESC, created_at ASC, id ASC))[1] AS entry_id,
      (ARRAY_AGG(player_kind ORDER BY best_score DESC, created_at ASC, id ASC))[1] AS player_kind,
      (ARRAY_AGG(user_id ORDER BY best_score DESC, created_at ASC, id ASC))[1] AS user_id,
      (ARRAY_AGG(guest_key ORDER BY best_score DESC, created_at ASC, id ASC))[1] AS guest_key,
      COALESCE(
        public.thanksgiving_member_display_name(
          (ARRAY_AGG(user_id ORDER BY best_score DESC, created_at ASC, id ASC))[1]
        ),
        (ARRAY_AGG(display_name ORDER BY updated_at DESC))[1]
      ) AS display_name,
      MAX(best_score) AS best_score
    FROM base
    GROUP BY identity_key
  )
  SELECT
    dense_rank() OVER (ORDER BY c.best_score DESC) AS rank,
    c.entry_id,
    c.player_kind,
    c.user_id,
    c.guest_key,
    c.display_name,
    c.best_score
  FROM collapsed c;
$$;

REVOKE ALL ON FUNCTION public.thanksgiving_game_ranking_source() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.thanksgiving_game_ranking_source() FROM anon, authenticated;

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
  v_uid uuid := public.effective_user_id();
  v_guest text := NULLIF(btrim(COALESCE(p_guest_key, '')), '');
  v_name text;
  v_existing integer;
  v_best integer;
  v_is_new boolean := false;
  v_id uuid;
BEGIN
  IF p_score IS NULL OR p_score < 0 THEN
    RAISE EXCEPTION 'invalid score';
  END IF;

  IF p_score > 100000 THEN
    p_score := 100000;
  END IF;

  IF v_uid IS NOT NULL THEN
    v_name := COALESCE(
      left(public.thanksgiving_member_display_name(v_uid), 40),
      NULLIF(left(btrim(COALESCE(p_display_name, '')), 40), ''),
      '회원'
    );

    SELECT s.max_score, s.keep_id
    INTO v_existing, v_id
    FROM (
      SELECT
        MAX(e.best_score) AS max_score,
        (ARRAY_AGG(e.id ORDER BY e.best_score DESC, e.created_at ASC, e.id ASC))[1] AS keep_id
      FROM public.thanksgiving_game_entries e
      WHERE e.player_kind = 'member'
        AND e.user_id IS NOT NULL
        AND public.resolve_primary_user_id(e.user_id) = v_uid
    ) s;

    IF v_id IS NOT NULL THEN
      DELETE FROM public.thanksgiving_game_entries e
      WHERE e.player_kind = 'member'
        AND e.user_id IS NOT NULL
        AND public.resolve_primary_user_id(e.user_id) = v_uid
        AND e.id <> v_id;
    END IF;

    IF v_id IS NULL THEN
      INSERT INTO public.thanksgiving_game_entries (
        player_kind, user_id, display_name, best_score
      )
      VALUES ('member', v_uid, v_name, p_score)
      ON CONFLICT (user_id) DO UPDATE
      SET
        player_kind = 'member',
        guest_key = NULL,
        display_name = EXCLUDED.display_name,
        best_score = GREATEST(public.thanksgiving_game_entries.best_score, EXCLUDED.best_score),
        updated_at = CASE
          WHEN EXCLUDED.best_score > public.thanksgiving_game_entries.best_score THEN now()
          WHEN public.thanksgiving_game_entries.display_name IS DISTINCT FROM EXCLUDED.display_name THEN now()
          ELSE public.thanksgiving_game_entries.updated_at
        END
      RETURNING id, thanksgiving_game_entries.best_score INTO v_id, v_best;
      v_is_new := v_best = p_score;
    ELSIF p_score > v_existing THEN
      UPDATE public.thanksgiving_game_entries
      SET
        user_id = v_uid,
        player_kind = 'member',
        guest_key = NULL,
        best_score = p_score,
        display_name = v_name,
        updated_at = now()
      WHERE id = v_id
      RETURNING thanksgiving_game_entries.best_score INTO v_best;
      v_is_new := true;
    ELSE
      UPDATE public.thanksgiving_game_entries
      SET
        user_id = v_uid,
        player_kind = 'member',
        guest_key = NULL,
        display_name = v_name,
        updated_at = CASE
          WHEN display_name IS DISTINCT FROM v_name THEN now()
          ELSE updated_at
        END
      WHERE id = v_id;
      v_best := v_existing;
      v_is_new := false;
    END IF;
  ELSE
    v_name := NULLIF(btrim(COALESCE(p_display_name, '')), '');
    IF v_name IS NULL OR char_length(v_name) < 2 OR char_length(v_name) > 12 THEN
      RAISE EXCEPTION 'invalid display name';
    END IF;

    IF v_guest IS NULL OR char_length(v_guest) < 8 OR char_length(v_guest) > 80 THEN
      RAISE EXCEPTION 'guest key required';
    END IF;

    SELECT s.max_score, s.keep_id
    INTO v_existing, v_id
    FROM (
      SELECT
        MAX(e.best_score) AS max_score,
        (ARRAY_AGG(e.id ORDER BY e.best_score DESC, e.created_at ASC, e.id ASC))[1] AS keep_id
      FROM public.thanksgiving_game_entries e
      WHERE e.player_kind = 'guest'
        AND e.guest_key = v_guest
    ) s;

    IF v_id IS NOT NULL THEN
      DELETE FROM public.thanksgiving_game_entries e
      WHERE e.player_kind = 'guest'
        AND e.guest_key = v_guest
        AND e.id <> v_id;
    END IF;

    IF v_id IS NULL THEN
      INSERT INTO public.thanksgiving_game_entries (
        player_kind, guest_key, display_name, best_score
      )
      VALUES ('guest', v_guest, v_name, p_score)
      ON CONFLICT (guest_key) DO UPDATE
      SET
        player_kind = 'guest',
        user_id = NULL,
        display_name = EXCLUDED.display_name,
        best_score = GREATEST(public.thanksgiving_game_entries.best_score, EXCLUDED.best_score),
        updated_at = CASE
          WHEN EXCLUDED.best_score > public.thanksgiving_game_entries.best_score THEN now()
          WHEN public.thanksgiving_game_entries.display_name IS DISTINCT FROM EXCLUDED.display_name THEN now()
          ELSE public.thanksgiving_game_entries.updated_at
        END
      RETURNING id, thanksgiving_game_entries.best_score INTO v_id, v_best;
      v_is_new := v_best = p_score;
    ELSIF p_score > v_existing THEN
      UPDATE public.thanksgiving_game_entries
      SET
        best_score = p_score,
        display_name = v_name,
        updated_at = now()
      WHERE id = v_id
      RETURNING thanksgiving_game_entries.best_score INTO v_best;
      v_is_new := true;
    ELSE
      UPDATE public.thanksgiving_game_entries
      SET
        display_name = v_name,
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
  FROM public.submit_thanksgiving_game_score(p_score, NULL, NULL) AS s;
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
  SELECT
    s.rank,
    s.entry_id,
    s.player_kind,
    s.user_id,
    s.guest_key,
    s.display_name,
    s.best_score
  FROM public.thanksgiving_game_ranking_source() s
  ORDER BY s.rank ASC, s.display_name ASC
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
  v_uid uuid := public.effective_user_id();
  v_guest text := NULLIF(btrim(COALESCE(p_guest_key, '')), '');
BEGIN
  IF v_uid IS NOT NULL THEN
    RETURN QUERY
    SELECT s.best_score, s.rank, s.entry_id
    FROM public.thanksgiving_game_ranking_source() s
    WHERE s.player_kind = 'member'
      AND s.user_id = v_uid
    LIMIT 1;
    RETURN;
  END IF;

  IF v_guest IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT s.best_score, s.rank, s.entry_id
  FROM public.thanksgiving_game_ranking_source() s
  WHERE s.player_kind = 'guest'
    AND s.guest_key = v_guest
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_thanksgiving_game_score(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_thanksgiving_game_score(text) TO anon, authenticated;
