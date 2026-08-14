-- Household registration is a tenant type, not merely a login-screen choice.
-- Keep privileged operational categories invitation-only, while safely
-- provisioning household owners from their explicit signup selection.
CREATE OR REPLACE FUNCTION public.handle_new_user_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  organization_id uuid;
  membership_id uuid;
  requested_category text := NEW.raw_user_meta_data ->> 'requested_login_category';
  organization_kind public.organization_kind;
  initial_role text;
BEGIN
  organization_kind := CASE WHEN requested_category = 'household' THEN 'household' ELSE 'personal' END;
  initial_role := CASE WHEN requested_category = 'household' THEN 'household_owner' ELSE 'resident' END;

  INSERT INTO public.organizations(name, slug, kind, created_by)
  VALUES (
    COALESCE(nullif(trim(NEW.raw_user_meta_data ->> 'display_name'), ''), 'Personal workspace'),
    'personal-' || replace(NEW.id::text, '-', ''),
    organization_kind,
    NEW.id
  ) RETURNING id INTO organization_id;

  INSERT INTO public.organization_memberships(organization_id, user_id, status, joined_at)
  VALUES (organization_id, NEW.id, 'active', now()) RETURNING id INTO membership_id;

  INSERT INTO public.membership_roles(membership_id, role_id, assigned_by)
  SELECT membership_id, role.id, NEW.id
  FROM public.access_roles role
  WHERE role.key = initial_role;

  RETURN NEW;
END
$$;

-- Correct users who already chose Household but received the legacy default.
UPDATE public.organizations organization
SET kind = 'household'
FROM public.organization_memberships membership
JOIN auth.users account ON account.id = membership.user_id
WHERE membership.organization_id = organization.id
  AND organization.created_by = account.id
  AND account.raw_user_meta_data ->> 'requested_login_category' = 'household';

DELETE FROM public.membership_roles membership_role
USING public.organization_memberships membership, auth.users account, public.access_roles role
WHERE membership_role.membership_id = membership.id
  AND membership.user_id = account.id
  AND membership_role.role_id = role.id
  AND account.raw_user_meta_data ->> 'requested_login_category' = 'household'
  AND role.key IN ('resident', 'organization_admin');

INSERT INTO public.membership_roles(membership_id, role_id, assigned_by)
SELECT membership.id, role.id, membership.user_id
FROM public.organization_memberships membership
JOIN auth.users account ON account.id = membership.user_id
JOIN public.organizations organization ON organization.id = membership.organization_id
JOIN public.access_roles role ON role.key = 'household_owner'
WHERE account.raw_user_meta_data ->> 'requested_login_category' = 'household'
  AND organization.created_by = account.id
ON CONFLICT DO NOTHING;

WITH household_permissions(permission_key) AS (
  VALUES ('organization.manage'), ('members.invite'), ('sites.manage'), ('billing.manage')
)
INSERT INTO public.role_permissions(role_id, permission_id)
SELECT role.id, permission.id
FROM public.access_roles role
CROSS JOIN household_permissions requested
JOIN public.access_permissions permission ON permission.key = requested.permission_key
WHERE role.key = 'household_owner'
ON CONFLICT DO NOTHING;
