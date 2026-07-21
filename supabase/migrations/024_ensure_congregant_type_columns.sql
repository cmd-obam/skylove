-- ============================================================
-- 교인 구분 컬럼 보강 (idempotent)
-- migration 015 가 운영 DB에 누락된 경우를 대비한 안전 재적용.
-- 로그인 시 profiles.congregant_type 42703 오류 방지.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS congregant_type text,
  ADD COLUMN IF NOT EXISTS attending_church text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_congregant_type_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_congregant_type_check
      CHECK (
        congregant_type IS NULL
        OR congregant_type IN ('own_church', 'other_church', 'newcomer')
      );
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
