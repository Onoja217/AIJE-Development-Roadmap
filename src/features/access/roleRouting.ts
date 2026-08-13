import type { OrganizationAccess } from "./types";

export const ROLE_HOME_PATHS = {
  resident: "/dashboard",
  household_owner: "/dashboard",
  security_operator: "/control",
  community_leader: "/community-dashboard",
  responder: "/community-dashboard",
  moderator: "/community-dashboard",
  organization_admin: "/organization",
  platform_admin: "/platform-admin",
} as const;

const ROLE_PRIORITY = [
  "organization_admin",
  "responder",
  "community_leader",
  "security_operator",
  "moderator",
  "household_owner",
  "resident",
] as const;

export function getPostLoginPath(
  platformAdmin: boolean,
  organizations: OrganizationAccess[],
  activeOrganizationId?: string | null,
) {
  if (platformAdmin) return ROLE_HOME_PATHS.platform_admin;

  const activeOrganization =
    organizations.find(
      (organization) => organization.id === activeOrganizationId,
    ) ?? organizations[0];

  const role = ROLE_PRIORITY.find((candidate) =>
    activeOrganization?.roles.includes(candidate),
  );

  return role ? ROLE_HOME_PATHS[role] : ROLE_HOME_PATHS.resident;
}
