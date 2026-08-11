import type { OrganizationAccess, Permission } from "./types";

interface PermissionInput {
  platformAdmin: boolean;
  organizations: OrganizationAccess[];
  activeOrganizationId?: string | null;
  organizationId?: string;
  permission: Permission;
}

export function hasOrganizationPermission({
  platformAdmin,
  organizations,
  activeOrganizationId,
  organizationId,
  permission,
}: PermissionInput) {
  if (platformAdmin) return true;
  const targetId = organizationId ?? activeOrganizationId;
  if (!targetId) return false;
  return (
    organizations
      .find((organization) => organization.id === targetId)
      ?.permissions.includes(permission) ?? false
  );
}
