-- Public signup must never grant administrative privileges. Login category is
-- presentation metadata only; elevated roles require an explicit audited
-- assignment through the RBAC system.
CREATE OR REPLACE FUNCTION public.handle_new_user_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  organization_id uuid;
  membership_id uuid;
BEGIN
  INSERT INTO public.organizations(name, slug, kind, created_by)
  VALUES (
    COALESCE(nullif(trim(NEW.raw_user_meta_data ->> 'display_name'), ''), 'Personal workspace'),
    'personal-' || replace(NEW.id::text, '-', ''),
    'personal',
    NEW.id
  )
  RETURNING id INTO organization_id;

  INSERT INTO public.organization_memberships(organization_id, user_id, status, joined_at)
  VALUES (organization_id, NEW.id, 'active', now())
  RETURNING id INTO membership_id;

  INSERT INTO public.membership_roles(membership_id, role_id, assigned_by)
  SELECT membership_id, role.id, NEW.id
  FROM public.access_roles role
  WHERE role.key = 'resident';

  RETURN NEW;
END
$$;

-- Reconcile only accounts that explicitly signed up as residents and were
-- accidentally elevated by the previous trigger. Preserve platform admins
-- and every deliberately assigned non-resident account.
WITH resident_admin_assignments AS (
  SELECT
    membership.id AS membership_id,
    membership.organization_id,
    membership.user_id,
    admin_role.id AS role_id
  FROM auth.users app_user
  JOIN public.organization_memberships membership
    ON membership.user_id = app_user.id
   AND membership.status = 'active'
  JOIN public.organizations organization
    ON organization.id = membership.organization_id
   AND organization.kind = 'personal'
  JOIN public.access_roles admin_role
    ON admin_role.key = 'organization_admin'
  WHERE app_user.raw_user_meta_data ->> 'requested_login_category' = 'resident'
    AND NOT EXISTS (
      SELECT 1
      FROM public.membership_roles platform_membership_role
      JOIN public.access_roles platform_role
        ON platform_role.id = platform_membership_role.role_id
       AND platform_role.key = 'platform_admin'
      WHERE platform_membership_role.membership_id = membership.id
    )
),
removed AS (
  DELETE FROM public.membership_roles membership_role
  USING resident_admin_assignments target
  WHERE membership_role.membership_id = target.membership_id
    AND membership_role.role_id = target.role_id
  RETURNING membership_role.membership_id
)
INSERT INTO public.access_audit_log(
  organization_id,
  actor_id,
  action,
  entity_type,
  entity_id,
  metadata
)
SELECT DISTINCT
  target.organization_id,
  NULL::uuid,
  'unintended_admin_role_removed',
  'organization_membership',
  target.membership_id::text,
  jsonb_build_object(
    'removed_role', 'organization_admin',
    'reason', 'resident_signup_role_reconciliation'
  )
FROM resident_admin_assignments target
JOIN removed ON removed.membership_id = target.membership_id;
