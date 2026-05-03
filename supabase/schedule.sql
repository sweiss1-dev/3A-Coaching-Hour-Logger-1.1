-- Schedule the bi-weekly hours report.
-- Run this AFTER you have deployed the Edge Function and set the secrets.
--
-- Replace YOUR-PROJECT-REF and YOUR-CRON-SECRET below.
-- Generate the cron secret in Supabase: Project Settings → API → Service role key
-- (or use a separate strong random string and store it as the SCHEDULE_AUTH header).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Run every 15 days at 09:00 UTC (use https://crontab.guru/ to tweak).
-- This cron expression fires on the 1st and 16th of every month at 09:00 UTC,
-- which is the closest reliable "every 15 days" cadence available in cron.
-- If you prefer a strict 15-day interval, use a custom interval table instead.
select cron.schedule(
  'send-biweekly-hours-report',
  '0 9 1,16 * *',
  $$
  select net.http_post(
    url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-biweekly-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR-SERVICE-ROLE-KEY'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- To remove later:
--   select cron.unschedule('send-biweekly-hours-report');

-- To view scheduled jobs:
--   select * from cron.job;

-- To view recent run history:
--   select * from cron.job_run_details order by start_time desc limit 20;
