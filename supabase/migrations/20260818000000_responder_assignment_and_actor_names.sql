ALTER TABLE public.incident_audit_log
  ADD COLUMN IF NOT EXISTS actor_display_name text;

CREATE OR REPLACE FUNCTION public.assign_incident_team(
  _incident_id uuid,
  _team_id uuid,
  _note text DEFAULT NULL
)
RETURNS public.incident_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  incident public.incident_reports;
  team public.teams;
  actor_name text;
BEGIN
  SELECT * INTO incident FROM public.incident_reports WHERE id = _incident_id FOR UPDATE;
  IF incident.id IS NULL OR incident.organization_id IS NULL THEN RAISE EXCEPTION 'Incident not found or unscoped'; END IF;
  IF NOT public.current_user_has_permission(incident.organization_id, 'incidents.assign') THEN RAISE EXCEPTION 'Permission denied'; END IF;
  SELECT * INTO team FROM public.teams WHERE id = _team_id AND organization_id = incident.organization_id;
  IF team.id IS NULL THEN RAISE EXCEPTION 'Response team is outside the incident organization'; END IF;
  SELECT display_name INTO actor_name FROM public.profiles WHERE user_id = auth.uid();

  UPDATE public.incident_reports SET assigned_team_id = team.id WHERE id = incident.id RETURNING * INTO incident;
  INSERT INTO public.incident_audit_log(
    incident_id, incident_report_id, organization_id, actor_id, actor_display_name,
    previous_status, new_status, action, from_status, to_status, note, metadata
  ) VALUES (
    incident.id, incident.id, incident.organization_id, auth.uid(), actor_name,
    incident.status, incident.status, 'responder.assigned', incident.status, incident.status,
    NULLIF(trim(_note), ''), jsonb_build_object('team_id', team.id, 'team_name', team.name)
  );
  RETURN incident;
END
$$;

REVOKE ALL ON FUNCTION public.assign_incident_team(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_incident_team(uuid, uuid, text) TO authenticated, service_role;

-- Recreate the transition function with immutable actor attribution.
CREATE OR REPLACE FUNCTION public.incident_actor_display_name()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT display_name FROM public.profiles WHERE user_id = auth.uid()), auth.uid()::text)
$$;
GRANT EXECUTE ON FUNCTION public.incident_actor_display_name() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_incident_actor_names(
  _organization_id uuid,
  _actor_ids uuid[]
)
RETURNS TABLE(user_id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT profile.user_id, COALESCE(profile.display_name, profile.user_id::text)
  FROM public.profiles profile
  WHERE profile.user_id = ANY(_actor_ids)
    AND public.current_user_has_permission(_organization_id, 'audit.view')
$$;
REVOKE ALL ON FUNCTION public.get_incident_actor_names(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_incident_actor_names(uuid, uuid[]) TO authenticated, service_role;
