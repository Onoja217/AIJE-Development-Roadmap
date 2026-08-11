-- Multi-tenant access-control foundation for AIJE.
-- Existing owner-based policies remain valid while records are progressively
-- moved to organization/site scopes.

CREATE TYPE public.membership_status AS ENUM ('invited', 'active', 'suspended');
CREATE TYPE public.organization_kind AS ENUM ('personal', 'household', 'community', 'business', 'government');

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  kind public.organization_kind NOT NULL DEFAULT 'business',
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.membership_status NOT NULL DEFAULT 'active',
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE public.access_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE CHECK (key ~ '^[a-z][a-z0-9_]*$'),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.access_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE CHECK (key ~ '^[a-z][a-z0-9_.]*$'),
  description text NOT NULL DEFAULT ''
);

CREATE TABLE public.role_permissions (
  role_id uuid NOT NULL REFERENCES public.access_roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.access_permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE public.membership_roles (
  membership_id uuid NOT NULL REFERENCES public.organization_memberships(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.access_roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (membership_id, role_id)
);

CREATE TABLE public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  role_id uuid NOT NULL REFERENCES public.access_roles(id),
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX organization_invitations_pending_idx
  ON public.organization_invitations (organization_id, lower(email))
  WHERE accepted_at IS NULL;

CREATE TABLE public.sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  address text,
  latitude double precision,
  longitude double precision,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.site_memberships (
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES public.organization_memberships(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (site_id, membership_id)
);

CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  team_type text NOT NULL DEFAULT 'operations',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.team_memberships (
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES public.organization_memberships(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, membership_id)
);

CREATE TABLE public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.household_members (
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES public.organization_memberships(id) ON DELETE CASCADE,
  relationship text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, membership_id)
);

CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  ward text,
  lga text,
  state text NOT NULL DEFAULT 'Benue',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.community_memberships (
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES public.organization_memberships(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, membership_id)
);

CREATE TABLE public.responder_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  incident_report_id uuid NOT NULL REFERENCES public.incident_reports(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES public.organization_memberships(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'acknowledged', 'responding', 'resolved', 'cancelled')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (incident_report_id, membership_id)
);

CREATE TABLE public.access_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.public_incident_rate_limits (
  client_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  submission_count integer NOT NULL DEFAULT 0 CHECK (submission_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.access_permissions (key, description) VALUES
  ('organization.manage', 'Manage organization settings'),
  ('members.invite', 'Invite organization members'),
  ('members.assign_roles', 'Assign organization roles'),
  ('sites.manage', 'Manage operational sites'),
  ('cameras.view', 'View assigned cameras'),
  ('cameras.manage', 'Manage cameras'),
  ('alerts.dispatch', 'Dispatch emergency alerts'),
  ('alerts.resolve', 'Resolve emergency alerts'),
  ('incidents.create', 'Create incident reports'),
  ('incidents.assign', 'Assign incident responders'),
  ('incidents.respond', 'Respond to assigned incidents'),
  ('reports.verify', 'Verify community reports'),
  ('resources.moderate', 'Moderate emergency resources'),
  ('billing.manage', 'Manage billing and plans'),
  ('audit.view', 'View organization audit history'),
  ('platform.manage', 'Manage the AIJE platform');

INSERT INTO public.access_roles (key, name, description) VALUES
  ('resident', 'Resident', 'Personal safety, alerts and incident reporting'),
  ('household_owner', 'Household Owner', 'Manage household members and home security'),
  ('security_operator', 'Security Operator', 'Monitor assigned cameras, sensors and alerts'),
  ('community_leader', 'Community Leader', 'Coordinate community watch and dispatch alerts'),
  ('responder', 'Responder', 'Respond to assigned incidents'),
  ('moderator', 'Moderator', 'Verify reports and moderate resources'),
  ('organization_admin', 'Organization Admin', 'Manage an organization and its members'),
  ('platform_admin', 'Platform Admin', 'Manage the entire AIJE platform');

WITH grants(role_key, permission_key) AS (VALUES
  ('resident', 'incidents.create'),
  ('household_owner', 'incidents.create'), ('household_owner', 'cameras.view'), ('household_owner', 'cameras.manage'),
  ('security_operator', 'cameras.view'), ('security_operator', 'alerts.resolve'), ('security_operator', 'incidents.respond'),
  ('community_leader', 'alerts.dispatch'), ('community_leader', 'alerts.resolve'), ('community_leader', 'incidents.assign'), ('community_leader', 'reports.verify'),
  ('responder', 'incidents.respond'),
  ('moderator', 'reports.verify'), ('moderator', 'resources.moderate'),
  ('organization_admin', 'organization.manage'), ('organization_admin', 'members.invite'),
  ('organization_admin', 'members.assign_roles'), ('organization_admin', 'sites.manage'),
  ('organization_admin', 'cameras.view'), ('organization_admin', 'cameras.manage'),
  ('organization_admin', 'alerts.dispatch'), ('organization_admin', 'alerts.resolve'),
  ('organization_admin', 'incidents.create'), ('organization_admin', 'incidents.assign'),
  ('organization_admin', 'incidents.respond'), ('organization_admin', 'reports.verify'),
  ('organization_admin', 'resources.moderate'), ('organization_admin', 'billing.manage'),
  ('organization_admin', 'audit.view'),
  ('platform_admin', 'platform.manage'), ('platform_admin', 'organization.manage'),
  ('platform_admin', 'members.invite'), ('platform_admin', 'members.assign_roles'),
  ('platform_admin', 'sites.manage'), ('platform_admin', 'cameras.view'),
  ('platform_admin', 'cameras.manage'), ('platform_admin', 'alerts.dispatch'),
  ('platform_admin', 'alerts.resolve'), ('platform_admin', 'incidents.create'),
  ('platform_admin', 'incidents.assign'), ('platform_admin', 'incidents.respond'),
  ('platform_admin', 'reports.verify'), ('platform_admin', 'resources.moderate'),
  ('platform_admin', 'billing.manage'), ('platform_admin', 'audit.view')
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM grants
JOIN public.access_roles role ON role.key = grants.role_key
JOIN public.access_permissions permission ON permission.key = grants.permission_key;

CREATE OR REPLACE FUNCTION public.is_organization_member(_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships membership
    WHERE membership.organization_id = _organization_id
      AND membership.user_id = auth.uid()
      AND membership.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_permission(_organization_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.organization_memberships membership
      JOIN public.membership_roles membership_role ON membership_role.membership_id = membership.id
      JOIN public.role_permissions role_permission ON role_permission.role_id = membership_role.role_id
      JOIN public.access_permissions permission ON permission.id = role_permission.permission_id
      WHERE membership.organization_id = _organization_id
        AND membership.user_id = auth.uid()
        AND membership.status = 'active'
        AND (permission.key = _permission OR permission.key = 'platform.manage')
    )
$$;

REVOKE ALL ON FUNCTION public.is_organization_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_has_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_organization_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_has_permission(uuid, text) TO authenticated, service_role;

-- Add tenant scope before policies reference these columns. All columns remain
-- nullable during the compatibility phase.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'cameras', 'camera_media', 'system_state', 'sensor_configs', 'alert_history',
    'incident_reports', 'emergency_resources', 'subscriptions', 'deployments',
    'community_watch_groups', 'emergency_contacts', 'community_alerts'
  ] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL', table_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(organization_id)', 'idx_' || table_name || '_organization', table_name);
    END IF;
  END LOOP;
END
$$;

ALTER TABLE public.cameras ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL;
ALTER TABLE public.incident_reports ADD COLUMN IF NOT EXISTS assigned_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.incident_reports ALTER COLUMN reporter_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS incident_reports_public_client_idx
  ON public.incident_reports(client_id) WHERE reporter_id IS NULL AND client_id IS NOT NULL;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responder_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_incident_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view organizations" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_organization_member(id));
CREATE POLICY "members view memberships" ON public.organization_memberships FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));
CREATE POLICY "authenticated view roles" ON public.access_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated view permissions" ON public.access_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated view role permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "members view assigned roles" ON public.membership_roles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_memberships membership
    WHERE membership.id = membership_id AND public.is_organization_member(membership.organization_id)
  ));
CREATE POLICY "admins view invitations" ON public.organization_invitations FOR SELECT TO authenticated
  USING (public.current_user_has_permission(organization_id, 'members.invite'));
CREATE POLICY "members view sites" ON public.sites FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));
CREATE POLICY "admins manage sites" ON public.sites FOR ALL TO authenticated
  USING (public.current_user_has_permission(organization_id, 'sites.manage'))
  WITH CHECK (public.current_user_has_permission(organization_id, 'sites.manage'));
CREATE POLICY "members view site assignments" ON public.site_memberships FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sites site WHERE site.id = site_id AND public.is_organization_member(site.organization_id)));
CREATE POLICY "members view teams" ON public.teams FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));
CREATE POLICY "members view team assignments" ON public.team_memberships FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teams team WHERE team.id = team_id AND public.is_organization_member(team.organization_id)));
CREATE POLICY "members view households" ON public.households FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));
CREATE POLICY "members view household assignments" ON public.household_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.households household WHERE household.id = household_id AND public.is_organization_member(household.organization_id)));
CREATE POLICY "members view communities" ON public.communities FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));
CREATE POLICY "members view community assignments" ON public.community_memberships FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.communities community WHERE community.id = community_id AND public.is_organization_member(community.organization_id)));
CREATE POLICY "members view responder assignments" ON public.responder_assignments FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));
CREATE POLICY "incident coordinators manage assignments" ON public.responder_assignments FOR ALL TO authenticated
  USING (public.current_user_has_permission(organization_id, 'incidents.assign'))
  WITH CHECK (public.current_user_has_permission(organization_id, 'incidents.assign'));
CREATE POLICY "auditors view access audit" ON public.access_audit_log FOR SELECT TO authenticated
  USING (public.current_user_has_permission(organization_id, 'audit.view'));

-- Organization-scoped access for operational records. Legacy owner policies
-- remain in place during the transition, so existing personal workflows keep
-- working while shared workspaces gain explicit permission-based access.
CREATE POLICY "organization members view cameras" ON public.cameras FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND (
    public.current_user_has_permission(organization_id, 'cameras.view')
    OR public.current_user_has_permission(organization_id, 'cameras.manage')
  ));
CREATE POLICY "organization managers create cameras" ON public.cameras FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND organization_id IS NOT NULL AND public.current_user_has_permission(organization_id, 'cameras.manage'));
CREATE POLICY "organization managers update cameras" ON public.cameras FOR UPDATE TO authenticated
  USING (organization_id IS NOT NULL AND public.current_user_has_permission(organization_id, 'cameras.manage'))
  WITH CHECK (organization_id IS NOT NULL AND public.current_user_has_permission(organization_id, 'cameras.manage'));
CREATE POLICY "organization managers delete cameras" ON public.cameras FOR DELETE TO authenticated
  USING (organization_id IS NOT NULL AND public.current_user_has_permission(organization_id, 'cameras.manage'));

CREATE POLICY "organization responders view incidents" ON public.incident_reports FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND (
    public.current_user_has_permission(organization_id, 'incidents.assign')
    OR public.current_user_has_permission(organization_id, 'incidents.respond')
    OR public.current_user_has_permission(organization_id, 'reports.verify')
  ));
CREATE POLICY "organization coordinators update incidents" ON public.incident_reports FOR UPDATE TO authenticated
  USING (organization_id IS NOT NULL AND public.current_user_has_permission(organization_id, 'incidents.assign'))
  WITH CHECK (organization_id IS NOT NULL AND public.current_user_has_permission(organization_id, 'incidents.assign'));

CREATE POLICY "organization moderators view resources" ON public.emergency_resources FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND public.current_user_has_permission(organization_id, 'resources.moderate'));
CREATE POLICY "organization moderators create resources" ON public.emergency_resources FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND organization_id IS NOT NULL AND public.current_user_has_permission(organization_id, 'resources.moderate'));
CREATE POLICY "organization moderators update resources" ON public.emergency_resources FOR UPDATE TO authenticated
  USING (organization_id IS NOT NULL AND public.current_user_has_permission(organization_id, 'resources.moderate'))
  WITH CHECK (organization_id IS NOT NULL AND public.current_user_has_permission(organization_id, 'resources.moderate'));

CREATE POLICY "organization leaders manage watch groups" ON public.community_watch_groups FOR ALL TO authenticated
  USING (organization_id IS NOT NULL AND public.current_user_has_permission(organization_id, 'alerts.dispatch'))
  WITH CHECK (owner_id = auth.uid() AND organization_id IS NOT NULL AND public.current_user_has_permission(organization_id, 'alerts.dispatch'));
CREATE POLICY "organization leaders manage group members" ON public.community_group_members FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.community_watch_groups watch_group
    WHERE watch_group.id = group_id AND watch_group.organization_id IS NOT NULL
      AND public.current_user_has_permission(watch_group.organization_id, 'alerts.dispatch')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.community_watch_groups watch_group
    WHERE watch_group.id = group_id AND watch_group.organization_id IS NOT NULL
      AND public.current_user_has_permission(watch_group.organization_id, 'alerts.dispatch')
  ));
CREATE POLICY "organization leaders manage contacts" ON public.emergency_contacts FOR ALL TO authenticated
  USING (organization_id IS NOT NULL AND public.current_user_has_permission(organization_id, 'alerts.dispatch'))
  WITH CHECK (owner_id = auth.uid() AND organization_id IS NOT NULL AND public.current_user_has_permission(organization_id, 'alerts.dispatch'));
CREATE POLICY "organization members view alerts" ON public.community_alerts FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND public.is_organization_member(organization_id));
CREATE POLICY "organization coordinators resolve alerts" ON public.community_alerts FOR UPDATE TO authenticated
  USING (organization_id IS NOT NULL AND public.current_user_has_permission(organization_id, 'alerts.resolve'))
  WITH CHECK (organization_id IS NOT NULL AND public.current_user_has_permission(organization_id, 'alerts.resolve'));

GRANT SELECT ON public.organizations, public.organization_memberships, public.access_roles,
  public.access_permissions, public.role_permissions, public.membership_roles,
  public.organization_invitations, public.sites, public.site_memberships,
  public.teams, public.team_memberships, public.households, public.household_members,
  public.communities, public.community_memberships, public.responder_assignments,
  public.access_audit_log TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sites, public.responder_assignments TO authenticated;
GRANT ALL ON public.organizations, public.organization_memberships, public.access_roles,
  public.access_permissions, public.role_permissions, public.membership_roles,
  public.organization_invitations, public.sites, public.site_memberships,
  public.teams, public.team_memberships, public.households, public.household_members,
  public.communities, public.community_memberships, public.responder_assignments,
  public.access_audit_log, public.public_incident_rate_limits TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.access_audit_log_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.create_organization(_name text, _slug text, _kind public.organization_kind DEFAULT 'business')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  organization_id uuid;
  membership_id uuid;
  admin_role_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF char_length(trim(_name)) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Invalid organization name'; END IF;
  IF _slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN RAISE EXCEPTION 'Invalid organization slug'; END IF;

  INSERT INTO public.organizations(name, slug, kind, created_by)
  VALUES (trim(_name), _slug, _kind, auth.uid()) RETURNING id INTO organization_id;
  INSERT INTO public.organization_memberships(organization_id, user_id, status, joined_at)
  VALUES (organization_id, auth.uid(), 'active', now()) RETURNING id INTO membership_id;
  SELECT id INTO admin_role_id FROM public.access_roles WHERE key = 'organization_admin';
  INSERT INTO public.membership_roles(membership_id, role_id, assigned_by)
  VALUES (membership_id, admin_role_id, auth.uid());
  INSERT INTO public.access_audit_log(organization_id, actor_id, action, entity_type, entity_id)
  VALUES (organization_id, auth.uid(), 'organization.created', 'organization', organization_id::text);
  RETURN organization_id;
END
$$;

CREATE OR REPLACE FUNCTION public.create_site(_organization_id uuid, _name text, _address text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE site_id uuid;
BEGIN
  IF NOT public.current_user_has_permission(_organization_id, 'sites.manage') THEN RAISE EXCEPTION 'Permission denied'; END IF;
  INSERT INTO public.sites(organization_id, name, address, created_by)
  VALUES (_organization_id, trim(_name), nullif(trim(_address), ''), auth.uid()) RETURNING id INTO site_id;
  INSERT INTO public.access_audit_log(organization_id, actor_id, action, entity_type, entity_id)
  VALUES (_organization_id, auth.uid(), 'site.created', 'site', site_id::text);
  RETURN site_id;
END
$$;

CREATE OR REPLACE FUNCTION public.invite_organization_member(_organization_id uuid, _email text, _role_key text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE invitation_id uuid; selected_role_id uuid;
BEGIN
  IF NOT public.current_user_has_permission(_organization_id, 'members.invite') THEN RAISE EXCEPTION 'Permission denied'; END IF;
  SELECT id INTO selected_role_id FROM public.access_roles WHERE key = _role_key AND key <> 'platform_admin';
  IF selected_role_id IS NULL THEN RAISE EXCEPTION 'Invalid role'; END IF;
  INSERT INTO public.organization_invitations(organization_id, email, role_id, invited_by)
  VALUES (_organization_id, lower(trim(_email)), selected_role_id, auth.uid())
  ON CONFLICT (organization_id, (lower(email))) WHERE accepted_at IS NULL
  DO UPDATE SET role_id = EXCLUDED.role_id, invited_by = EXCLUDED.invited_by, expires_at = now() + interval '7 days'
  RETURNING id INTO invitation_id;
  INSERT INTO public.access_audit_log(organization_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (_organization_id, auth.uid(), 'member.invited', 'invitation', invitation_id::text, jsonb_build_object('role', _role_key));
  RETURN invitation_id;
END
$$;

CREATE OR REPLACE FUNCTION public.accept_my_organization_invitations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE invitation record; membership_id uuid; accepted_count integer := 0; current_email text;
BEGIN
  SELECT lower(email) INTO current_email FROM auth.users WHERE id = auth.uid();
  IF current_email IS NULL THEN RETURN 0; END IF;
  FOR invitation IN
    SELECT * FROM public.organization_invitations
    WHERE lower(email) = current_email AND accepted_at IS NULL AND expires_at > now()
    FOR UPDATE
  LOOP
    INSERT INTO public.organization_memberships(organization_id, user_id, status, joined_at)
    VALUES (invitation.organization_id, auth.uid(), 'active', now())
    ON CONFLICT (organization_id, user_id) DO UPDATE SET status = 'active', joined_at = COALESCE(organization_memberships.joined_at, now())
    RETURNING id INTO membership_id;
    INSERT INTO public.membership_roles(membership_id, role_id, assigned_by)
    VALUES (membership_id, invitation.role_id, invitation.invited_by) ON CONFLICT DO NOTHING;
    UPDATE public.organization_invitations SET accepted_at = now() WHERE id = invitation.id;
    accepted_count := accepted_count + 1;
  END LOOP;
  RETURN accepted_count;
END
$$;

CREATE OR REPLACE FUNCTION public.set_organization_membership_roles(
  _organization_id uuid,
  _membership_id uuid,
  _role_keys text[]
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_user_id uuid; inserted_count integer;
BEGIN
  IF NOT public.current_user_has_permission(_organization_id, 'members.assign_roles') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  IF coalesce(array_length(_role_keys, 1), 0) = 0 OR array_length(_role_keys, 1) > 5 THEN
    RAISE EXCEPTION 'Select between one and five roles';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(_role_keys) role_key WHERE role_key = 'platform_admin') THEN
    RAISE EXCEPTION 'Platform roles cannot be assigned here';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(_role_keys) requested(key)
    WHERE NOT EXISTS (SELECT 1 FROM public.access_roles role WHERE role.key = requested.key)
  ) THEN RAISE EXCEPTION 'Invalid role supplied'; END IF;
  SELECT user_id INTO target_user_id FROM public.organization_memberships
  WHERE id = _membership_id AND organization_id = _organization_id AND status = 'active';
  IF target_user_id IS NULL THEN RAISE EXCEPTION 'Membership not found'; END IF;
  IF NOT ('organization_admin' = ANY(_role_keys))
    AND EXISTS (
      SELECT 1 FROM public.membership_roles mr JOIN public.access_roles role ON role.id = mr.role_id
      WHERE mr.membership_id = _membership_id AND role.key = 'organization_admin'
    )
    AND 1 >= (
      SELECT count(*) FROM public.organization_memberships membership
      JOIN public.membership_roles mr ON mr.membership_id = membership.id
      JOIN public.access_roles role ON role.id = mr.role_id
      WHERE membership.organization_id = _organization_id AND membership.status = 'active' AND role.key = 'organization_admin'
    )
  THEN RAISE EXCEPTION 'An organization must retain at least one administrator'; END IF;

  DELETE FROM public.membership_roles membership_role
  USING public.access_roles role
  WHERE membership_role.membership_id = _membership_id
    AND role.id = membership_role.role_id
    AND role.key <> 'platform_admin';
  INSERT INTO public.membership_roles(membership_id, role_id, assigned_by)
  SELECT _membership_id, role.id, auth.uid()
  FROM public.access_roles role WHERE role.key = ANY(_role_keys) AND role.key <> 'platform_admin'
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF inserted_count = 0 THEN RAISE EXCEPTION 'No valid roles supplied'; END IF;

  INSERT INTO public.access_audit_log(organization_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (_organization_id, auth.uid(), 'member.roles_updated', 'membership', _membership_id::text, jsonb_build_object('roles', _role_keys));
END
$$;

CREATE OR REPLACE FUNCTION public.get_my_access_context()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'platformAdmin', public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.organization_memberships membership
      JOIN public.membership_roles membership_role ON membership_role.membership_id = membership.id
      JOIN public.access_roles role ON role.id = membership_role.role_id
      WHERE membership.user_id = auth.uid() AND membership.status = 'active' AND role.key = 'platform_admin'
    ),
    'organizations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', organization.id,
        'name', organization.name,
        'slug', organization.slug,
        'kind', organization.kind,
        'membershipId', membership.id,
        'roles', COALESCE((SELECT jsonb_agg(DISTINCT role.key) FROM public.membership_roles mr JOIN public.access_roles role ON role.id = mr.role_id WHERE mr.membership_id = membership.id), '[]'::jsonb),
        'permissions', COALESCE((SELECT jsonb_agg(DISTINCT permission.key) FROM public.membership_roles mr JOIN public.role_permissions rp ON rp.role_id = mr.role_id JOIN public.access_permissions permission ON permission.id = rp.permission_id WHERE mr.membership_id = membership.id), '[]'::jsonb)
      ) ORDER BY organization.name)
      FROM public.organization_memberships membership
      JOIN public.organizations organization ON organization.id = membership.organization_id
      WHERE membership.user_id = auth.uid() AND membership.status = 'active'
    ), '[]'::jsonb)
  )
$$;

CREATE OR REPLACE FUNCTION public.get_organization_members(_organization_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  display_name text,
  status public.membership_status,
  joined_at timestamptz,
  roles text[]
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    membership.id,
    membership.user_id,
    profile.display_name,
    membership.status,
    membership.joined_at,
    COALESCE(array_agg(DISTINCT role.key) FILTER (WHERE role.key IS NOT NULL), '{}'::text[])
  FROM public.organization_memberships membership
  LEFT JOIN public.profiles profile ON profile.user_id = membership.user_id
  LEFT JOIN public.membership_roles membership_role ON membership_role.membership_id = membership.id
  LEFT JOIN public.access_roles role ON role.id = membership_role.role_id
  WHERE membership.organization_id = _organization_id
    AND public.is_organization_member(_organization_id)
  GROUP BY membership.id, profile.display_name
  ORDER BY COALESCE(profile.display_name, membership.user_id::text)
$$;

REVOKE ALL ON FUNCTION public.create_organization(text, text, public.organization_kind) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_site(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invite_organization_member(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_my_organization_invitations() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_access_context() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_organization_members(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_organization_membership_roles(uuid, uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization(text, text, public.organization_kind) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_site(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_organization_member(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_my_organization_invitations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_access_context() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_members(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_organization_membership_roles(uuid, uuid, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.consume_public_incident_rate_limit(_client_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE allowed boolean;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Permission denied'; END IF;
  INSERT INTO public.public_incident_rate_limits(client_hash, window_started_at, submission_count, updated_at)
  VALUES (_client_hash, now(), 1, now())
  ON CONFLICT (client_hash) DO UPDATE SET
    window_started_at = CASE WHEN public.public_incident_rate_limits.window_started_at < now() - interval '1 hour' THEN now() ELSE public.public_incident_rate_limits.window_started_at END,
    submission_count = CASE WHEN public.public_incident_rate_limits.window_started_at < now() - interval '1 hour' THEN 1 ELSE public.public_incident_rate_limits.submission_count + 1 END,
    updated_at = now()
  RETURNING submission_count <= 5 INTO allowed;
  RETURN allowed;
END
$$;
REVOKE ALL ON FUNCTION public.consume_public_incident_rate_limit(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_public_incident_rate_limit(text) TO service_role;

-- Give every existing user a personal tenant and preserve legacy global roles.
WITH created AS (
  INSERT INTO public.organizations(name, slug, kind, created_by)
  SELECT COALESCE(nullif(trim(profile.display_name), ''), 'Personal workspace'),
         'personal-' || replace(profile.user_id::text, '-', ''), 'personal', profile.user_id
  FROM public.profiles profile
  ON CONFLICT (slug) DO NOTHING
  RETURNING id, created_by
)
INSERT INTO public.organization_memberships(organization_id, user_id, status, joined_at)
SELECT id, created_by, 'active', now() FROM created ON CONFLICT DO NOTHING;

INSERT INTO public.membership_roles(membership_id, role_id, assigned_by)
SELECT membership.id, role.id, membership.user_id
FROM public.organization_memberships membership
JOIN public.organizations organization ON organization.id = membership.organization_id AND organization.kind = 'personal'
JOIN public.access_roles role ON role.key = 'organization_admin'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user_access()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE organization_id uuid; membership_id uuid;
BEGIN
  INSERT INTO public.organizations(name, slug, kind, created_by)
  VALUES (
    COALESCE(nullif(trim(NEW.raw_user_meta_data ->> 'display_name'), ''), 'Personal workspace'),
    'personal-' || replace(NEW.id::text, '-', ''),
    'personal',
    NEW.id
  ) RETURNING id INTO organization_id;
  INSERT INTO public.organization_memberships(organization_id, user_id, status, joined_at)
  VALUES (organization_id, NEW.id, 'active', now()) RETURNING id INTO membership_id;
  INSERT INTO public.membership_roles(membership_id, role_id, assigned_by)
  SELECT membership_id, role.id, NEW.id FROM public.access_roles role
  WHERE role.key IN ('resident', 'organization_admin');
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS on_auth_user_access_created ON auth.users;
CREATE TRIGGER on_auth_user_access_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_access();

INSERT INTO public.membership_roles(membership_id, role_id, assigned_by)
SELECT membership.id, role.id, membership.user_id
FROM public.organization_memberships membership
JOIN public.organizations organization ON organization.id = membership.organization_id AND organization.kind = 'personal'
JOIN public.access_roles role ON role.key = 'resident'
ON CONFLICT DO NOTHING;

INSERT INTO public.membership_roles(membership_id, role_id, assigned_by)
SELECT membership.id, role.id, membership.user_id
FROM public.organization_memberships membership
JOIN public.user_roles legacy ON legacy.user_id = membership.user_id AND legacy.role = 'admin'
JOIN public.access_roles role ON role.key = 'platform_admin'
ON CONFLICT DO NOTHING;

-- Populate tenant scope from legacy ownership columns when available.
DO $$
DECLARE item record;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('cameras', 'user_id'), ('camera_media', 'user_id'), ('system_state', 'user_id'),
    ('sensor_configs', 'user_id'), ('alert_history', 'user_id'), ('incident_reports', 'reporter_id'),
    ('subscriptions', 'user_id'), ('deployments', 'user_id'), ('community_watch_groups', 'owner_id'),
    ('emergency_contacts', 'owner_id'), ('community_alerts', 'owner_id')
  ) AS mapping(table_name, owner_column)
  LOOP
    IF to_regclass('public.' || item.table_name) IS NOT NULL THEN
      EXECUTE format(
        'UPDATE public.%I target SET organization_id = membership.organization_id FROM public.organization_memberships membership JOIN public.organizations organization ON organization.id = membership.organization_id AND organization.kind = ''personal'' WHERE membership.user_id = target.%I AND target.organization_id IS NULL',
        item.table_name, item.owner_column
      );
    END IF;
  END LOOP;
END
$$;

CREATE INDEX organization_memberships_user_idx ON public.organization_memberships(user_id, status);
CREATE INDEX sites_organization_idx ON public.sites(organization_id);
CREATE INDEX teams_organization_idx ON public.teams(organization_id);
CREATE INDEX access_audit_organization_created_idx ON public.access_audit_log(organization_id, created_at DESC);

CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sites_updated_at BEFORE UPDATE ON public.sites
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER responder_assignments_updated_at BEFORE UPDATE ON public.responder_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.prevent_access_audit_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'Access audit records are immutable'; END
$$;
CREATE TRIGGER access_audit_immutable BEFORE UPDATE OR DELETE ON public.access_audit_log
FOR EACH ROW EXECUTE FUNCTION public.prevent_access_audit_mutation();
