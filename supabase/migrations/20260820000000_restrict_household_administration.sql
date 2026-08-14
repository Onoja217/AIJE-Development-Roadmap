-- Household camera access must not imply organization administration.
DELETE FROM public.role_permissions role_permission
USING public.access_roles role, public.access_permissions permission
WHERE role_permission.role_id = role.id
  AND role_permission.permission_id = permission.id
  AND role.key = 'household_owner'
  AND permission.key IN ('organization.manage', 'members.invite');
