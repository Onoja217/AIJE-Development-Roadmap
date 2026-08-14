-- Consolidate authorization on canonical organization-scoped RBAC and add
-- audited membership lifecycle controls. No application data is removed.

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships membership
    JOIN public.membership_roles membership_role
      ON membership_role.membership_id = membership.id
    JOIN public.access_roles role ON role.id = membership_role.role_id
    WHERE membership.user_id = auth.uid()
      AND membership.status = 'active'
      AND role.key = 'platform_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_organization_member(_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin() OR EXISTS (
    SELECT 1 FROM public.organization_memberships membership
    WHERE membership.organization_id = _organization_id
      AND membership.user_id = auth.uid()
      AND membership.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_permission(
  _organization_id uuid,
  _permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin() OR EXISTS (
    SELECT 1
    FROM public.organization_memberships membership
    JOIN public.membership_roles membership_role
      ON membership_role.membership_id = membership.id
    JOIN public.role_permissions role_permission
      ON role_permission.role_id = membership_role.role_id
    JOIN public.access_permissions permission
      ON permission.id = role_permission.permission_id
    WHERE membership.organization_id = _organization_id
      AND membership.user_id = auth.uid()
      AND membership.status = 'active'
      AND (permission.key = _permission OR permission.key = 'platform.manage')
  )
$$;

CREATE OR REPLACE FUNCTION public.get_my_access_context()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'platformAdmin', public.is_platform_admin(),
    'organizations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', organization.id,
        'name', organization.name,
        'slug', organization.slug,
        'kind', organization.kind,
        'membershipId', membership.id,
        'roles', COALESCE((
          SELECT jsonb_agg(DISTINCT role.key)
          FROM public.membership_roles mr
          JOIN public.access_roles role ON role.id = mr.role_id
          WHERE mr.membership_id = membership.id
        ), '[]'::jsonb),
        'permissions', COALESCE((
          SELECT jsonb_agg(DISTINCT permission.key)
          FROM public.membership_roles mr
          JOIN public.role_permissions rp ON rp.role_id = mr.role_id
          JOIN public.access_permissions permission ON permission.id = rp.permission_id
          WHERE mr.membership_id = membership.id
        ), '[]'::jsonb)
      ) ORDER BY organization.name)
      FROM public.organization_memberships membership
      JOIN public.organizations organization
        ON organization.id = membership.organization_id
      WHERE membership.user_id = auth.uid()
        AND membership.status = 'active'
    ), '[]'::jsonb)
  )
$$;

CREATE OR REPLACE FUNCTION public.accept_my_organization_invitations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation record;
  membership_id uuid;
  accepted_count integer := 0;
  current_email text;
  accepted_role text;
BEGIN
  SELECT lower(email) INTO current_email FROM auth.users WHERE id = auth.uid();
  IF current_email IS NULL THEN RETURN 0; END IF;

  FOR invitation IN
    SELECT * FROM public.organization_invitations
    WHERE lower(email) = current_email
      AND accepted_at IS NULL
      AND expires_at > now()
    FOR UPDATE
  LOOP
    SELECT key INTO accepted_role FROM public.access_roles
    WHERE id = invitation.role_id;

    INSERT INTO public.organization_memberships(
      organization_id, user_id, status, joined_at
    ) VALUES (
      invitation.organization_id, auth.uid(), 'active', now()
    )
    ON CONFLICT (organization_id, user_id) DO UPDATE
      SET status = 'active',
          joined_at = COALESCE(organization_memberships.joined_at, now())
    RETURNING id INTO membership_id;

    INSERT INTO public.membership_roles(membership_id, role_id, assigned_by)
    VALUES (membership_id, invitation.role_id, invitation.invited_by)
    ON CONFLICT DO NOTHING;

    UPDATE public.organization_invitations
    SET accepted_at = now()
    WHERE id = invitation.id;

    INSERT INTO public.access_audit_log(
      organization_id, actor_id, action, entity_type, entity_id, metadata
    ) VALUES (
      invitation.organization_id,
      auth.uid(),
      'member.invitation_accepted',
      'membership',
      membership_id::text,
      jsonb_build_object('invitation_id', invitation.id, 'role', accepted_role)
    );
    accepted_count := accepted_count + 1;
  END LOOP;
  RETURN accepted_count;
END
$$;

CREATE OR REPLACE FUNCTION public.invite_organization_member(
  _organization_id uuid,
  _email text,
  _role_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_id uuid;
  selected_role_id uuid;
BEGIN
  IF NOT public.current_user_has_permission(
    _organization_id, 'members.invite'
  ) THEN RAISE EXCEPTION 'Permission denied'; END IF;
  IF _role_key = 'platform_admin' THEN
    RAISE EXCEPTION 'Platform roles cannot be assigned here';
  END IF;
  IF _role_key = 'organization_admin'
    AND NOT public.is_platform_admin()
    AND NOT EXISTS (
      SELECT 1 FROM public.organizations organization
      WHERE organization.id = _organization_id
        AND organization.created_by = auth.uid()
    ) THEN
    RAISE EXCEPTION 'Only the organization creator or a platform administrator can invite organization administrators';
  END IF;

  SELECT id INTO selected_role_id
  FROM public.access_roles WHERE key = _role_key;
  IF selected_role_id IS NULL THEN RAISE EXCEPTION 'Invalid role'; END IF;

  INSERT INTO public.organization_invitations(
    organization_id, email, role_id, invited_by
  ) VALUES (
    _organization_id, lower(trim(_email)), selected_role_id, auth.uid()
  )
  ON CONFLICT (organization_id, (lower(email))) WHERE accepted_at IS NULL
  DO UPDATE SET
    role_id = EXCLUDED.role_id,
    invited_by = EXCLUDED.invited_by,
    expires_at = now() + interval '7 days'
  RETURNING id INTO invitation_id;

  INSERT INTO public.access_audit_log(
    organization_id, actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    _organization_id, auth.uid(), 'member.invited', 'invitation',
    invitation_id::text, jsonb_build_object('role', _role_key)
  );
  RETURN invitation_id;
END
$$;

CREATE OR REPLACE FUNCTION public.set_organization_membership_status(
  _organization_id uuid,
  _membership_id uuid,
  _status public.membership_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
  current_status public.membership_status;
  target_is_admin boolean;
BEGIN
  IF NOT public.current_user_has_permission(
    _organization_id, 'members.assign_roles'
  ) THEN RAISE EXCEPTION 'Permission denied'; END IF;
  IF _status = 'invited' THEN
    RAISE EXCEPTION 'Use the invitation workflow for invited memberships';
  END IF;

  SELECT user_id, status INTO target_user_id, current_status
  FROM public.organization_memberships
  WHERE id = _membership_id AND organization_id = _organization_id
  FOR UPDATE;
  IF target_user_id IS NULL THEN RAISE EXCEPTION 'Membership not found'; END IF;
  IF target_user_id = auth.uid() AND _status = 'suspended' THEN
    RAISE EXCEPTION 'You cannot suspend your own membership';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.membership_roles mr
    JOIN public.access_roles role ON role.id = mr.role_id
    WHERE mr.membership_id = _membership_id
      AND role.key = 'organization_admin'
  ) INTO target_is_admin;

  IF _status = 'suspended' AND target_is_admin AND 1 >= (
    SELECT count(*)
    FROM public.organization_memberships membership
    JOIN public.membership_roles mr ON mr.membership_id = membership.id
    JOIN public.access_roles role ON role.id = mr.role_id
    WHERE membership.organization_id = _organization_id
      AND membership.status = 'active'
      AND role.key = 'organization_admin'
  ) THEN RAISE EXCEPTION 'An organization must retain an active administrator';
  END IF;

  UPDATE public.organization_memberships
  SET status = _status,
      joined_at = CASE WHEN _status = 'active'
        THEN COALESCE(joined_at, now()) ELSE joined_at END
  WHERE id = _membership_id;

  INSERT INTO public.access_audit_log(
    organization_id, actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    _organization_id,
    auth.uid(),
    'member.status_updated',
    'membership',
    _membership_id::text,
    jsonb_build_object('previous_status', current_status, 'status', _status)
  );
END
$$;

-- Organization administrators may manage operational roles. Assigning the
-- organization_admin role additionally requires platform authority or being
-- the audited creator of that organization.
CREATE OR REPLACE FUNCTION public.set_organization_membership_roles(
  _organization_id uuid,
  _membership_id uuid,
  _role_keys text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
  inserted_count integer;
BEGIN
  IF NOT public.current_user_has_permission(
    _organization_id, 'members.assign_roles'
  ) THEN RAISE EXCEPTION 'Permission denied'; END IF;
  IF coalesce(array_length(_role_keys, 1), 0) = 0
    OR array_length(_role_keys, 1) > 5 THEN
    RAISE EXCEPTION 'Select between one and five roles';
  END IF;
  IF 'platform_admin' = ANY(_role_keys) THEN
    RAISE EXCEPTION 'Platform roles cannot be assigned here';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(_role_keys) requested(key)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.access_roles role WHERE role.key = requested.key
    )
  ) THEN RAISE EXCEPTION 'Invalid role supplied'; END IF;
  IF 'organization_admin' = ANY(_role_keys)
    AND NOT public.is_platform_admin()
    AND NOT EXISTS (
      SELECT 1 FROM public.organizations organization
      WHERE organization.id = _organization_id
        AND organization.created_by = auth.uid()
    ) THEN
    RAISE EXCEPTION 'Only the organization creator or a platform administrator can assign organization administrators';
  END IF;

  SELECT user_id INTO target_user_id
  FROM public.organization_memberships
  WHERE id = _membership_id
    AND organization_id = _organization_id
    AND status = 'active';
  IF target_user_id IS NULL THEN RAISE EXCEPTION 'Membership not found'; END IF;

  IF NOT ('organization_admin' = ANY(_role_keys))
    AND EXISTS (
      SELECT 1 FROM public.membership_roles mr
      JOIN public.access_roles role ON role.id = mr.role_id
      WHERE mr.membership_id = _membership_id
        AND role.key = 'organization_admin'
    )
    AND 1 >= (
      SELECT count(*) FROM public.organization_memberships membership
      JOIN public.membership_roles mr ON mr.membership_id = membership.id
      JOIN public.access_roles role ON role.id = mr.role_id
      WHERE membership.organization_id = _organization_id
        AND membership.status = 'active'
        AND role.key = 'organization_admin'
    ) THEN RAISE EXCEPTION 'An organization must retain at least one administrator';
  END IF;

  DELETE FROM public.membership_roles membership_role
  USING public.access_roles role
  WHERE membership_role.membership_id = _membership_id
    AND role.id = membership_role.role_id
    AND role.key <> 'platform_admin';
  INSERT INTO public.membership_roles(membership_id, role_id, assigned_by)
  SELECT _membership_id, role.id, auth.uid()
  FROM public.access_roles role
  WHERE role.key = ANY(_role_keys) AND role.key <> 'platform_admin'
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF inserted_count = 0 THEN RAISE EXCEPTION 'No valid roles supplied'; END IF;

  INSERT INTO public.access_audit_log(
    organization_id, actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    _organization_id, auth.uid(), 'member.roles_updated', 'membership',
    _membership_id::text, jsonb_build_object('roles', _role_keys)
  );
END
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_organization_membership_status(
  uuid, uuid, public.membership_status
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_organization_membership_status(
  uuid, uuid, public.membership_status
) TO authenticated;
