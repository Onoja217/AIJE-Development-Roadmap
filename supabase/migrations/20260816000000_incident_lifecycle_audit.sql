-- Canonical, auditable incident lifecycle:
-- report -> verify -> dispatch -> acknowledge -> respond -> resolve.

ALTER TABLE public.incident_reports
  DROP CONSTRAINT IF EXISTS incident_reports_status_check;

ALTER TABLE public.incident_reports
  ADD CONSTRAINT incident_reports_status_check CHECK (
    status IN ('pending', 'verified', 'dispatched', 'acknowledged', 'responding', 'resolved')
  );

CREATE TABLE IF NOT EXISTS public.incident_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  incident_report_id uuid NOT NULL REFERENCES public.incident_reports(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN (
    'report.created', 'report.verified', 'response.dispatched',
    'response.acknowledged', 'response.started', 'incident.resolved',
    'responder.assigned'
  )),
  from_status text,
  to_status text,
  note text CHECK (note IS NULL OR char_length(note) <= 2000),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Some production environments provisioned a generic incident_audit_log
-- before this canonical migration existed. Preserve those rows and extend the
-- table with the lifecycle columns rather than replacing it.
ALTER TABLE public.incident_audit_log
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS incident_report_id uuid REFERENCES public.incident_reports(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS action text,
  ADD COLUMN IF NOT EXISTS from_status text,
  ADD COLUMN IF NOT EXISTS to_status text,
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS incident_audit_incident_created_idx
  ON public.incident_audit_log(incident_report_id, created_at);
CREATE INDEX IF NOT EXISTS incident_audit_organization_created_idx
  ON public.incident_audit_log(organization_id, created_at DESC);

ALTER TABLE public.incident_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "organization members view incident audit" ON public.incident_audit_log;
CREATE POLICY "organization members view incident audit"
  ON public.incident_audit_log FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));
GRANT SELECT ON public.incident_audit_log TO authenticated;
GRANT ALL ON public.incident_audit_log TO service_role;

CREATE OR REPLACE FUNCTION public.prevent_incident_audit_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Incident audit records are immutable';
END
$$;

DROP TRIGGER IF EXISTS incident_audit_immutable ON public.incident_audit_log;
CREATE TRIGGER incident_audit_immutable
  BEFORE UPDATE OR DELETE ON public.incident_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_incident_audit_mutation();

CREATE OR REPLACE FUNCTION public.transition_incident(
  _incident_id uuid,
  _to_status text,
  _note text DEFAULT NULL
)
RETURNS public.incident_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  incident public.incident_reports;
  required_permission text;
  audit_action text;
BEGIN
  SELECT * INTO incident FROM public.incident_reports
  WHERE id = _incident_id FOR UPDATE;
  IF incident.id IS NULL THEN RAISE EXCEPTION 'Incident not found'; END IF;
  IF incident.organization_id IS NULL THEN RAISE EXCEPTION 'Incident has no organization scope'; END IF;

  IF NOT (
    (incident.status = 'pending' AND _to_status = 'verified') OR
    (incident.status = 'verified' AND _to_status = 'dispatched') OR
    (incident.status = 'dispatched' AND _to_status = 'acknowledged') OR
    (incident.status = 'acknowledged' AND _to_status = 'responding') OR
    (incident.status = 'responding' AND _to_status = 'resolved')
  ) THEN
    RAISE EXCEPTION 'Invalid incident transition: % -> %', incident.status, _to_status;
  END IF;

  required_permission := CASE
    WHEN _to_status = 'verified' THEN 'reports.verify'
    WHEN _to_status = 'dispatched' THEN 'alerts.dispatch'
    ELSE 'incidents.respond'
  END;
  IF NOT public.current_user_has_permission(incident.organization_id, required_permission) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  audit_action := CASE _to_status
    WHEN 'verified' THEN 'report.verified'
    WHEN 'dispatched' THEN 'response.dispatched'
    WHEN 'acknowledged' THEN 'response.acknowledged'
    WHEN 'responding' THEN 'response.started'
    WHEN 'resolved' THEN 'incident.resolved'
  END;

  UPDATE public.incident_reports SET status = _to_status
  WHERE id = _incident_id RETURNING * INTO incident;

  INSERT INTO public.incident_audit_log(
    organization_id, incident_report_id, actor_id, action, from_status, to_status, note
  ) VALUES (
    incident.organization_id, incident.id, auth.uid(), audit_action,
    CASE _to_status
      WHEN 'verified' THEN 'pending' WHEN 'dispatched' THEN 'verified'
      WHEN 'acknowledged' THEN 'dispatched' WHEN 'responding' THEN 'acknowledged'
      WHEN 'resolved' THEN 'responding'
    END,
    _to_status, NULLIF(trim(_note), '')
  );

  RETURN incident;
END
$$;

REVOKE ALL ON FUNCTION public.transition_incident(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_incident(uuid, text, text) TO authenticated, service_role;
