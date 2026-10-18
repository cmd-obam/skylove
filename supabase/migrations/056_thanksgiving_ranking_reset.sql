-- ============================================================
-- DO NOT RE-RUN. This truncates every Thanksgiving ranking row.
-- Historical reset only. Current scores must be kept.
-- ============================================================
-- Reset Thanksgiving mini-game rankings (wipe all scores).
-- Run in Supabase SQL Editor. Irreversible.
-- ============================================================

TRUNCATE TABLE public.thanksgiving_game_entries RESTART IDENTITY CASCADE;

DO $$
BEGIN
  IF to_regclass('public.thanksgiving_game_scores') IS NOT NULL THEN
    TRUNCATE TABLE public.thanksgiving_game_scores RESTART IDENTITY CASCADE;
  END IF;
END $$;
