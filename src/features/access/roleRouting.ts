import type { OrganizationAccess } from "./types";
import { APP_PATHS } from "@/features/navigation/navigationConfig";

export const ROLE_HOME_PATHS = {
  resident: APP_PATHS.safety,
  household_owner: APP_PATHS.safety,
  security_operator: APP_PATHS.operations,
  community_leader: APP_PATHS.community,
  responder: APP_PATHS.community,
  moderator: APP_PATHS.community,
  organization_admin: APP_PATHS.organization,
  platform_admin: APP_PATHS.platform,
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
