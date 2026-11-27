-- 기도 남기기 함수가 prayed 컬럼을 쓰는데, 076보다 078만 적용된 DB에는 컬럼이 없다.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'prayer_participants'
      AND column_name = 'prayed'
  ) THEN
    ALTER TABLE public.prayer_participants
      ADD COLUMN prayed boolean NOT NULL DEFAULT false;

    UPDATE public.prayer_participants
    SET prayed = true;
  END IF;
END;
$$;

ALTER TABLE public.prayer_participants
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

NOTIFY pgrst, 'reload schema';
