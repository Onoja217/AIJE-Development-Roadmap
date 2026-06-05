
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE public.webhook_dead_letter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'paystack',
  event_type TEXT,
  reference TEXT,
  payload JSONB NOT NULL,
  signature TEXT,
  error TEXT,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 6,
  status TEXT NOT NULL DEFAULT 'pending',
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX webhook_dead_letter_pending_idx
  ON public.webhook_dead_letter (next_retry_at)
  WHERE status = 'pending';

GRANT ALL ON public.webhook_dead_letter TO service_role;

ALTER TABLE public.webhook_dead_letter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages dead letter"
  ON public.webhook_dead_letter FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_webhook_dead_letter_updated_at
  BEFORE UPDATE ON public.webhook_dead_letter
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
