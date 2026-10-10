-- ============================================================
-- Fix: ERROR 42P13 cannot change return type of existing function
-- Run this in Supabase SQL Editor, then re-run
-- apply_thanksgiving_game_guest_scores.sql (053) from the
-- DROP FUNCTION section onward — or re-run the full 053 file.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_thanksgiving_game_ranking(integer);
DROP FUNCTION IF EXISTS public.get_my_thanksgiving_game_score();
DROP FUNCTION IF EXISTS public.get_my_thanksgiving_game_score(text);
