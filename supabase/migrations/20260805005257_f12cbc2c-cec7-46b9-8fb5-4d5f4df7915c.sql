CREATE TABLE IF NOT EXISTS public.internal_cron_secrets (
  name text PRIMARY KEY,
  secret text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.internal_cron_secrets FROM anon, authenticated;
GRANT ALL ON public.internal_cron_secrets TO service_role;

ALTER TABLE public.internal_cron_secrets ENABLE ROW LEVEL SECURITY;

INSERT INTO public.internal_cron_secrets (name) VALUES ('scheduled_functions')
ON CONFLICT (name) DO NOTHING;