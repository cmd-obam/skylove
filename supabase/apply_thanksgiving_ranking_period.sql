-- ============================================================
-- Thanksgiving ranking writes are accepted only during the event window.
-- 2026-10-25 00:00:00 KST inclusive through 2026-10-30 23:59:00 KST exclusive.
-- Existing rows are not deleted or reset. Clock source is the database now().
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

CREATE OR REPLACE FUNCTION public.enforce_thanksgiving_ranking_period()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.thanksgiving_ranking_period_open(now()) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'ranking period closed'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.best_score IS DISTINCT FROM OLD.best_score THEN
    RAISE EXCEPTION 'ranking period closed'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_thanksgiving_ranking_period() FROM PUBLIC;

DROP TRIGGER IF EXISTS thanksgiving_game_entries_ranking_period
  ON public.thanksgiving_game_entries;

CREATE TRIGGER thanksgiving_game_entries_ranking_period
  BEFORE INSERT OR UPDATE ON public.thanksgiving_game_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_thanksgiving_ranking_period();

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

  IF NOT public.thanksgiving_ranking_period_open(now()) THEN
    RAISE EXCEPTION 'ranking period closed'
      USING ERRCODE = 'check_violation';
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

