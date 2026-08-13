-- Keep platform administration as one unambiguous canonical assignment.
-- Platform administrators already inherit the complete permission set, so
-- lower organization_admin and resident assignments are redundant.

BEGIN;

WITH platform_memberships AS (
  SELECT DISTINCT mr.membership_id
  FROM public.membership_roles mr
  JOIN public.access_roles role ON role.id = mr.role_id
  WHERE role.key = 'platform_admin'
),
redundant_assignments AS (
  SELECT
    mr.membership_id,
    mr.role_id,
    om.organization_id,
    role.key AS removed_role
  FROM public.membership_roles mr
  JOIN platform_memberships platform
    ON platform.membership_id = mr.membership_id
  JOIN public.access_roles role ON role.id = mr.role_id
  JOIN public.organization_memberships om ON om.id = mr.membership_id
  WHERE role.key IN ('organization_admin', 'resident')
),
removed AS (
  DELETE FROM public.membership_roles membership_role
  USING redundant_assignments target
  WHERE membership_role.membership_id = target.membership_id
    AND membership_role.role_id = target.role_id
  RETURNING membership_role.membership_id, membership_role.role_id
)
INSERT INTO public.access_audit_log(
  organization_id,
  actor_id,
  action,
  entity_type,
  entity_id,
  metadata
)
SELECT
  target.organization_id,
  NULL::uuid,
  'redundant_platform_role_removed',
  'organization_membership',
  target.membership_id::text,
  jsonb_build_object(
    'retained_role', 'platform_admin',
    'removed_role', target.removed_role,
    'reason', 'platform_admin_role_exclusivity'
  )
FROM redundant_assignments target
JOIN removed
  ON removed.membership_id = target.membership_id
 AND removed.role_id = target.role_id;

COMMIT;
