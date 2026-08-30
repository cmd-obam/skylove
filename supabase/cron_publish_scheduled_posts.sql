-- ============================================================
-- Optional: schedule publish of due board posts every minute
-- Requires:
-- 1) Edge Function `publish-scheduled-posts` deployed
-- 2) Secret SCHEDULED_POSTS_CRON_SECRET (or CONTENT_TRASH_CRON_SECRET) set
-- 3) pg_net + pg_cron enabled
-- Replace PROJECT_REF and CRON_SECRET before running.
-- ============================================================

-- Example (edit values first):
-- select
--   cron.schedule(
--     'publish-scheduled-posts-minutely',
--     '* * * * *',
--     $$
--     select net.http_post(
--       url := 'https://PROJECT_REF.supabase.co/functions/v1/publish-scheduled-posts',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'x-cron-secret', 'CRON_SECRET'
--       ),
--       body := '{}'::jsonb
--     );
--     $$
--   );

-- Alternative without Edge Function (DB-only cron):
-- select
--   cron.schedule(
--     'publish-due-board-posts-minutely',
--     '* * * * *',
--     $$select public.publish_due_board_posts();$$
--   );

select 'Configure cron via Dashboard or uncomment an example after replacing placeholders.' as notice;
