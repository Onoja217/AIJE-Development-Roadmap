export const PERMISSIONS = [
  "organization.manage",
  "members.invite",
  "members.assign_roles",
  "sites.manage",
  "cameras.view",
  "cameras.manage",
  "alerts.dispatch",
  "alerts.resolve",
  "incidents.create",
  "incidents.assign",
  "incidents.respond",
  "reports.verify",
  "resources.moderate",
  "billing.manage",
  "audit.view",
  "platform.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ORGANIZATION_ROLES = [
  "resident",
  "household_owner",
  "security_operator",
  "community_leader",
  "responder",
  "moderator",
  "organization_admin",
] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];
export type OrganizationKind =
  | "personal"
  | "household"
  | "community"
  | "business"
  | "government";

export interface OrganizationAccess {
  id: string;
  name: string;
  slug: string;
  kind: OrganizationKind;
  membershipId: string;
  roles: string[];
  permissions: Permission[];
}

export interface AccessContextPayload {
  platformAdmin: boolean;
  organizations: OrganizationAccess[];
}

export interface OrganizationMember {
  id: string;
  user_id: string;
  display_name: string | null;
  status: "invited" | "active" | "suspended";
  joined_at: string | null;
  roles: string[];
}

export interface OrganizationSite {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  created_at: string;
}

export interface OrganizationInvitation {
  id: string;
  email: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  role: { key: string; name: string } | null;
}
