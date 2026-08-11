import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type {
  AccessContextPayload,
  OrganizationInvitation,
  OrganizationKind,
  OrganizationMember,
  OrganizationRole,
  OrganizationSite,
} from "./types";

const accessClient = supabase as unknown as SupabaseClient;

export async function acceptPendingInvitations() {
  const { error } = await accessClient.rpc(
    "accept_my_organization_invitations",
  );
  if (error) throw error;
}

export async function fetchAccessContext(): Promise<AccessContextPayload> {
  const { data, error } = await accessClient.rpc("get_my_access_context");
  if (error) throw error;

  const payload = data as Partial<AccessContextPayload> | null;
  return {
    platformAdmin: payload?.platformAdmin === true,
    organizations: Array.isArray(payload?.organizations)
      ? payload.organizations
      : [],
  };
}

export async function createOrganization(input: {
  name: string;
  slug: string;
  kind: OrganizationKind;
}) {
  const { data, error } = await accessClient.rpc("create_organization", {
    _name: input.name,
    _slug: input.slug,
    _kind: input.kind,
  });
  if (error) throw error;
  return data as string;
}

export async function createSite(input: {
  organizationId: string;
  name: string;
  address?: string;
}) {
  const { data, error } = await accessClient.rpc("create_site", {
    _organization_id: input.organizationId,
    _name: input.name,
    _address: input.address ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function inviteMember(input: {
  organizationId: string;
  email: string;
  role: OrganizationRole;
}) {
  const { data, error } = await accessClient.rpc("invite_organization_member", {
    _organization_id: input.organizationId,
    _email: input.email,
    _role_key: input.role,
  });
  if (error) throw error;
  return data as string;
}

export async function setMemberRoles(input: {
  organizationId: string;
  membershipId: string;
  roles: OrganizationRole[];
}) {
  const { error } = await accessClient.rpc(
    "set_organization_membership_roles",
    {
      _organization_id: input.organizationId,
      _membership_id: input.membershipId,
      _role_keys: input.roles,
    },
  );
  if (error) throw error;
}

export async function fetchOrganizationSites(
  organizationId: string,
): Promise<OrganizationSite[]> {
  const { data, error } = await accessClient
    .from("sites")
    .select("id,organization_id,name,address,created_at")
    .eq("organization_id", organizationId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as OrganizationSite[];
}

export async function fetchOrganizationMembers(
  organizationId: string,
): Promise<OrganizationMember[]> {
  const { data, error } = await accessClient.rpc("get_organization_members", {
    _organization_id: organizationId,
  });
  if (error) throw error;
  return (data ?? []) as OrganizationMember[];
}

export async function fetchOrganizationInvitations(
  organizationId: string,
): Promise<OrganizationInvitation[]> {
  const { data, error } = await accessClient
    .from("organization_invitations")
    .select("id,email,expires_at,accepted_at,created_at,access_roles(key,name)")
    .eq("organization_id", organizationId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((invitation) => {
    const row = invitation as unknown as {
      id: string;
      email: string;
      expires_at: string;
      accepted_at: string | null;
      created_at: string;
      access_roles?: Array<{ key: string; name: string }> | null;
    };
    return { ...row, role: row.access_roles?.[0] ?? null };
  });
}
