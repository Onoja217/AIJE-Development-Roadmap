-- Security and reliability hardening for payment, incident and alert workflows.

-- Subscription state is payment-provider-owned. Authenticated clients may read
-- their record but only service-role functions may create or mutate it.
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
DROP POLICY IF EXISTS "users insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "users update own subscription" ON public.subscriptions;

-- Delivery/escalation history is an audit trail, not client-editable state.
REVOKE INSERT, UPDATE, DELETE ON public.alert_deliveries FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.alert_escalations FROM authenticated;
DROP POLICY IF EXISTS "owners manage deliveries" ON public.alert_deliveries;
DROP POLICY IF EXISTS "owners manage escalations" ON public.alert_escalations;
DROP POLICY IF EXISTS "Owners view their alert deliveries" ON public.alert_deliveries;
DROP POLICY IF EXISTS "Owners view their alert escalations" ON public.alert_escalations;
CREATE POLICY "Owners view their alert deliveries"
  ON public.alert_deliveries FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.community_alerts alert
    WHERE alert.id = alert_id AND alert.owner_id = auth.uid()
  ));
CREATE POLICY "Owners view their alert escalations"
  ON public.alert_escalations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.community_alerts alert
    WHERE alert.id = alert_id AND alert.owner_id = auth.uid()
  ));

-- Prevent duplicate alert requests and duplicate provider deliveries.
ALTER TABLE public.community_alerts ADD COLUMN IF NOT EXISTS idempotency_key uuid;
CREATE UNIQUE INDEX IF NOT EXISTS community_alerts_owner_idempotency_idx
  ON public.community_alerts(owner_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
ALTER TABLE public.alert_deliveries ADD COLUMN IF NOT EXISTS delivery_key text;
CREATE UNIQUE INDEX IF NOT EXISTS alert_deliveries_dedup_idx
  ON public.alert_deliveries(alert_id, delivery_key)
  WHERE delivery_key IS NOT NULL;

-- Bound user-controlled fields at the database boundary as defense in depth.
ALTER TABLE public.community_alerts
  ADD CONSTRAINT community_alerts_summary_length CHECK (char_length(summary) BETWEEN 3 AND 500) NOT VALID,
  ADD CONSTRAINT community_alerts_location_length CHECK (char_length(location) BETWEEN 2 AND 300) NOT VALID,
  ADD CONSTRAINT community_alerts_instructions_length CHECK (char_length(instructions) <= 1000) NOT VALID;
ALTER TABLE public.community_group_members
  ADD CONSTRAINT community_group_members_phone_length CHECK (char_length(phone) BETWEEN 7 AND 20) NOT VALID;
ALTER TABLE public.emergency_contacts
  ADD CONSTRAINT emergency_contacts_phone_length CHECK (char_length(phone) BETWEEN 7 AND 20) NOT VALID;

-- Immutable incident lifecycle history. Clients can read relevant records;
-- writes occur through trusted server-side workflows.
CREATE TABLE IF NOT EXISTS public.incident_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incident_reports(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  previous_status text,
  new_status text NOT NULL,
  reason text,
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.incident_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.incident_audit_log FROM anon, authenticated;
GRANT SELECT ON public.incident_audit_log TO authenticated;
GRANT ALL ON public.incident_audit_log TO service_role;
CREATE POLICY "Reporters and admins view incident audit"
  ON public.incident_audit_log FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.incident_reports report
    WHERE report.id = incident_id
      AND (report.reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));
CREATE INDEX IF NOT EXISTS incident_audit_log_incident_created_idx
  ON public.incident_audit_log(incident_id, created_at DESC);

-- A reporter may submit and read a report, but operational status is admin-owned.
DROP POLICY IF EXISTS "Users manage their own incident reports" ON public.incident_reports;
CREATE POLICY "Users create their own incident reports"
  ON public.incident_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id AND status = 'pending');
CREATE POLICY "Users view their own incident reports"
  ON public.incident_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);
CREATE POLICY "Admins update incident reports"
  ON public.incident_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
REVOKE DELETE ON public.incident_reports FROM authenticated;
