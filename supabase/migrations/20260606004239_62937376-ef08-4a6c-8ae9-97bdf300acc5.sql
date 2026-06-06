CREATE TABLE public.webhook_alert_settings (
  user_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  dead_letter_threshold integer NOT NULL DEFAULT 5,
  latency_p95_threshold_ms integer NOT NULL DEFAULT 2000,
  window_minutes integer NOT NULL DEFAULT 60,
  cooldown_minutes integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_alert_settings TO authenticated;
GRANT ALL ON public.webhook_alert_settings TO service_role;
ALTER TABLE public.webhook_alert_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own alert settings"
  ON public.webhook_alert_settings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_webhook_alert_settings_updated_at
  BEFORE UPDATE ON public.webhook_alert_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.webhook_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  value numeric NOT NULL,
  threshold numeric NOT NULL,
  window_minutes integer NOT NULL,
  message text NOT NULL,
  acknowledged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_alerts_user_created ON public.webhook_alerts (user_id, created_at DESC);

GRANT SELECT, UPDATE ON public.webhook_alerts TO authenticated;
GRANT ALL ON public.webhook_alerts TO service_role;
ALTER TABLE public.webhook_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own webhook alerts"
  ON public.webhook_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users ack own webhook alerts"
  ON public.webhook_alerts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.webhook_alerts;

SELECT cron.schedule(
  'webhook-alerts-monitor-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://evsginbpruyykvwallck.supabase.co/functions/v1/webhook-alerts-monitor',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
