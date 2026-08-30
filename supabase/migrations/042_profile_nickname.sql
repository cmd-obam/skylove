-- ============================================================
-- profiles: nickname + nickname_enabled
-- Supabase Dashboard → SQL Editor → Run
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.nickname IS
  'Optional public display nickname. Independent from legal name.';

COMMENT ON COLUMN public.profiles.nickname_enabled IS
  'When true and nickname is set, new posts/comments use nickname as writer label.';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_nickname_unique_ci
  ON public.profiles (lower(btrim(nickname)))
  WHERE nickname IS NOT NULL AND btrim(nickname) <> '';

CREATE OR REPLACE FUNCTION public.is_nickname_available(
  check_nickname text,
  exclude_user_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN check_nickname IS NULL OR btrim(check_nickname) = '' THEN true
      ELSE NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE nickname IS NOT NULL
          AND btrim(nickname) <> ''
          AND lower(btrim(nickname)) = lower(btrim(check_nickname))
          AND (exclude_user_id IS NULL OR user_id IS DISTINCT FROM exclude_user_id)
      )
    END;
$$;

GRANT EXECUTE ON FUNCTION public.is_nickname_available(text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.prevent_profile_name_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.user_id
     AND NEW.name IS DISTINCT FROM OLD.name THEN
    RAISE EXCEPTION '이름은 가입 후 변경할 수 없습니다.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_name_change ON public.profiles;

CREATE TRIGGER trg_prevent_profile_name_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_name_change();

NOTIFY pgrst, 'reload schema';
