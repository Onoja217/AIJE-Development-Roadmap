CREATE TABLE public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  event_type text,
  reference text,
  attempt integer NOT NULL DEFAULT 1,
  status text NOT NULL,
  latency_ms integer NOT NULL DEFAULT 0,
  error text,
  delivered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_deliveries_delivered_at ON public.webhook_deliveries (delivered_at DESC);
CREATE INDEX idx_webhook_deliveries_source_status ON public.webhook_deliveries (source, status);

GRANT SELECT ON public.webhook_deliveries TO authenticated;
GRANT ALL ON public.webhook_deliveries TO service_role;

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read webhook deliveries"
  ON public.webhook_deliveries FOR SELECT
  TO authenticated
  USING (true);
