-- ============================================================
-- Optional: schedule daily purge of soft-deleted content (15 days)
-- Requires:
-- 1) Edge Function `purge-content-trash` deployed
-- 2) Secret CONTENT_TRASH_CRON_SECRET set in Edge Function secrets
-- 3) pg_net + pg_cron enabled (Supabase Dashboard → Database → Extensions)
-- Replace PROJECT_REF and CRON_SECRET before running.
-- ============================================================

-- Example (edit values first):
-- select
--   cron.schedule(
--     'purge-content-trash-daily',
--     '15 3 * * *',
--     $$
--     select net.http_post(
--       url := 'https://PROJECT_REF.supabase.co/functions/v1/purge-content-trash',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'x-cron-secret', 'CRON_SECRET'
--       ),
--       body := '{}'::jsonb
--     );
--     $$
--   );

select 'Configure cron via Dashboard or uncomment the example after replacing placeholders.' as notice;
