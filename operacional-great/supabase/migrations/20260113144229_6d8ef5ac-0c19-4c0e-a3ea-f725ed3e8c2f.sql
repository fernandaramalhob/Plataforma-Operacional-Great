-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the renewal alerts check to run daily at 8am (Brazil time - UTC-3)
SELECT cron.schedule(
  'check-renewal-alerts-daily',
  '0 11 * * *', -- 11:00 UTC = 08:00 BRT
  $$
  SELECT
    net.http_post(
        url:='https://jcvmilqtmjyjynczwmlu.supabase.co/functions/v1/check-renewal-alerts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impjdm1pbHF0bWp5anluY3p3bWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5ODAxOTAsImV4cCI6MjA4MzU1NjE5MH0.o9GAtKNSFLMmTTAQs2IGBPKEvXBPM3EMcBXQ6Vj5_eI"}'::jsonb,
        body:='{"source": "cron"}'::jsonb
    ) as request_id;
  $$
);