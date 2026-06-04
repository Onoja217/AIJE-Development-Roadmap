
-- PLANS catalog
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  price_ngn_kobo integer NOT NULL DEFAULT 0,
  billing_interval text NOT NULL DEFAULT 'monthly',
  paystack_plan_code text,
  max_cameras integer NOT NULL DEFAULT 0,
  max_deployments integer NOT NULL DEFAULT 1,
  retention_days integer NOT NULL DEFAULT 7,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_custom boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans readable by all" ON public.plans FOR SELECT USING (true);

-- SUBSCRIPTIONS
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'inactive',
  paystack_customer_code text,
  paystack_subscription_code text,
  paystack_email_token text,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  trial_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own subscription" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own subscription" ON public.subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- DEPLOYMENTS
CREATE TABLE public.deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  location text,
  description text,
  status text NOT NULL DEFAULT 'active',
  timezone text DEFAULT 'Africa/Lagos',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deployments TO authenticated;
GRANT ALL ON public.deployments TO service_role;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own deployments" ON public.deployments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PAYMENT EVENTS audit
CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  reference text,
  paystack_event_id text UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_events TO authenticated;
GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own payment events" ON public.payment_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- updated_at triggers
CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_deployments_updated BEFORE UPDATE ON public.deployments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed plans
INSERT INTO public.plans (code, name, description, price_ngn_kobo, max_cameras, max_deployments, retention_days, features, sort_order, is_custom) VALUES
('starter', 'Starter', 'Essential monitoring for small sites', 750000, 4, 1, 7,
  '["Up to 4 cameras","Live monitoring","Motion detection","Mobile app access","7 days cloud storage","Basic incident reports","Email support"]'::jsonb, 1, false),
('growth', 'Growth', 'AI-powered protection for growing teams', 2500000, 20, 3, 30,
  '["Up to 20 cameras","Everything in Starter","AI-powered alerts","License plate recognition","SMS & WhatsApp notifications","30 days cloud storage","Advanced analytics & reporting","Priority support","Multiple user accounts & roles"]'::jsonb, 2, false),
('enterprise', 'Enterprise', 'Custom-scale protection for organizations', 0, 9999, 999, 90,
  '["Unlimited cameras","Multi-location monitoring","Face recognition (where legal)","Advanced analytics & heatmaps","Custom integrations","Dedicated account manager","SLA support","90+ days cloud storage","Unlimited users & permissions"]'::jsonb, 3, true);
