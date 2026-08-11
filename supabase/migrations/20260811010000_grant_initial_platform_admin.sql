-- Bootstrap the explicitly approved AIJE platform administrator.
-- Platform access remains permission-backed and is also mirrored to the
-- legacy admin role while older administrative routes are being migrated.
DO $$
DECLARE
  administrator_id uuid;
  administrator_membership_id uuid;
  platform_role_id uuid;
BEGIN
  SELECT id INTO administrator_id
  FROM auth.users
  WHERE lower(email) = 'onojamondayojonugba@gmail.com'
  LIMIT 1;

  IF administrator_id IS NULL THEN
    RAISE EXCEPTION 'Cannot grant platform admin: approved user account does not exist';
  END IF;

  SELECT membership.id INTO administrator_membership_id
  FROM public.organization_memberships membership
  JOIN public.organizations organization ON organization.id = membership.organization_id
  WHERE membership.user_id = administrator_id
    AND membership.status = 'active'
    AND organization.kind = 'personal'
  ORDER BY membership.created_at
  LIMIT 1;

  IF administrator_membership_id IS NULL THEN
    RAISE EXCEPTION 'Cannot grant platform admin: personal organization membership is missing';
  END IF;

  SELECT id INTO platform_role_id
  FROM public.access_roles
  WHERE key = 'platform_admin';

  IF platform_role_id IS NULL THEN
    RAISE EXCEPTION 'Cannot grant platform admin: platform role is missing';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (administrator_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.membership_roles (membership_id, role_id, assigned_by)
  VALUES (administrator_membership_id, platform_role_id, administrator_id)
  ON CONFLICT (membership_id, role_id) DO NOTHING;

  INSERT INTO public.access_audit_log (
    organization_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  SELECT
    membership.organization_id,
    administrator_id,
    'platform_admin.bootstrap_granted',
    'user',
    administrator_id::text,
    jsonb_build_object('email', 'onojamondayojonugba@gmail.com')
  FROM public.organization_memberships membership
  WHERE membership.id = administrator_membership_id;
END
$$;
