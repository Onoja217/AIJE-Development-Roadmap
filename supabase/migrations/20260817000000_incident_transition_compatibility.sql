-- Keep the canonical transition RPC compatible with the original immutable
-- incident audit columns while restricting history to authorized supervisors.

DROP POLICY IF EXISTS "organization members view incident audit" ON public.incident_audit_log;
CREATE POLICY "supervisors view organization incident audit"
  ON public.incident_audit_log FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL
    AND public.current_user_has_permission(organization_id, 'audit.view')
  );

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
  previous_status text;
  required_permission text;
  audit_action text;
BEGIN
  SELECT * INTO incident FROM public.incident_reports
  WHERE id = _incident_id FOR UPDATE;
  IF incident.id IS NULL THEN RAISE EXCEPTION 'Incident not found'; END IF;
  IF incident.organization_id IS NULL THEN RAISE EXCEPTION 'Incident has no organization scope'; END IF;

  previous_status := incident.status;
  IF NOT (
    (previous_status = 'pending' AND _to_status = 'verified') OR
    (previous_status = 'verified' AND _to_status = 'dispatched') OR
    (previous_status = 'dispatched' AND _to_status = 'acknowledged') OR
    (previous_status = 'acknowledged' AND _to_status = 'responding') OR
    (previous_status = 'responding' AND _to_status = 'resolved')
  ) THEN
    RAISE EXCEPTION 'Invalid incident transition: % -> %', previous_status, _to_status;
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
    incident_id, incident_report_id, organization_id, actor_id,
    previous_status, new_status, reason,
    action, from_status, to_status, note
  ) VALUES (
    incident.id, incident.id, incident.organization_id, auth.uid(),
    previous_status, _to_status, NULLIF(trim(_note), ''),
    audit_action, previous_status, _to_status, NULLIF(trim(_note), '')
  );

  RETURN incident;
END
$$;

REVOKE ALL ON FUNCTION public.transition_incident(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_incident(uuid, text, text) TO authenticated, service_role;
