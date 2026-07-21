-- ============================================================
-- 교인 구분 컬럼 보강 (SQL Editor 단독 실행용, idempotent)
-- 증상: 로그인 시 "column profiles.congregant_type does not exist" (42703)
-- 원인: migration 015_congregant_type.sql 이 운영 DB에 미적용
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
