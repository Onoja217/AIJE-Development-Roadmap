-- Public registration may create roles only inside the new, isolated tenant
-- created for that same account. Platform administration remains assignment-only.
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
  organization_kind := CASE requested_category
    WHEN 'household' THEN 'household'::public.organization_kind
    WHEN 'operations' THEN 'business'::public.organization_kind
    WHEN 'community' THEN 'community'::public.organization_kind
    WHEN 'organization_admin' THEN 'business'::public.organization_kind
    ELSE 'personal'::public.organization_kind
  END;

  initial_role := CASE requested_category
    WHEN 'household' THEN 'household_owner'
    WHEN 'operations' THEN 'security_operator'
    WHEN 'community' THEN 'community_leader'
    WHEN 'organization_admin' THEN 'organization_admin'
    ELSE 'resident'
  END;

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

-- Repair accounts created through the affected signup categories. Restrict
-- reconciliation to organizations owned by the registering user, so an
-- account can never use signup metadata to gain a role in another tenant.
WITH requested_roles(category, role_key, organization_kind) AS (
  VALUES
    ('operations', 'security_operator', 'business'::public.organization_kind),
    ('community', 'community_leader', 'community'::public.organization_kind),
    ('organization_admin', 'organization_admin', 'business'::public.organization_kind)
), affected AS (
  SELECT membership.id AS membership_id,
         membership.organization_id,
         membership.user_id,
         requested.role_key,
         requested.organization_kind
  FROM auth.users account
  JOIN requested_roles requested
    ON requested.category = account.raw_user_meta_data ->> 'requested_login_category'
  JOIN public.organization_memberships membership
    ON membership.user_id = account.id AND membership.status = 'active'
  JOIN public.organizations organization
    ON organization.id = membership.organization_id
   AND organization.created_by = account.id
)
UPDATE public.organizations organization
SET kind = affected.organization_kind
FROM affected
WHERE organization.id = affected.organization_id;

WITH requested_roles(category, role_key) AS (
  VALUES
    ('operations', 'security_operator'),
    ('community', 'community_leader'),
    ('organization_admin', 'organization_admin')
), affected AS (
  SELECT membership.id AS membership_id, membership.user_id, requested.role_key
  FROM auth.users account
  JOIN requested_roles requested
    ON requested.category = account.raw_user_meta_data ->> 'requested_login_category'
  JOIN public.organization_memberships membership
    ON membership.user_id = account.id AND membership.status = 'active'
  JOIN public.organizations organization
    ON organization.id = membership.organization_id
   AND organization.created_by = account.id
), removed AS (
  DELETE FROM public.membership_roles membership_role
  USING affected, public.access_roles role
  WHERE membership_role.membership_id = affected.membership_id
    AND membership_role.role_id = role.id
    AND role.key = 'resident'
)
INSERT INTO public.membership_roles(membership_id, role_id, assigned_by)
SELECT affected.membership_id, role.id, affected.user_id
FROM affected
JOIN public.access_roles role ON role.key = affected.role_key
ON CONFLICT DO NOTHING;
