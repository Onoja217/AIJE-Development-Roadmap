import { describe, expect, it } from "vitest";
import { hasOrganizationPermission } from "@/features/access/accessRules";
import type { OrganizationAccess } from "@/features/access/types";
import { getPostLoginPath } from "@/features/access/roleRouting";
import { APP_PATHS } from "@/features/navigation/navigationConfig";

const organizations: OrganizationAccess[] = [
  {
    id: "org-operations",
    name: "Operations",
    slug: "operations",
    kind: "business",
    membershipId: "membership-1",
    roles: ["security_operator"],
    permissions: ["cameras.view", "alerts.resolve"],
  },
  {
    id: "org-community",
    name: "Community",
    slug: "community",
    kind: "community",
    membershipId: "membership-2",
    roles: ["resident"],
    permissions: ["incidents.create"],
  },
];

describe("hasOrganizationPermission", () => {
  it("allows platform administrators in every organization", () => {
    expect(
      hasOrganizationPermission({
        platformAdmin: true,
        organizations: [],
        permission: "platform.manage",
      }),
    ).toBe(true);
  });

  it("uses the active organization by default", () => {
    expect(
      hasOrganizationPermission({
        platformAdmin: false,
        organizations,
        activeOrganizationId: "org-operations",
        permission: "cameras.view",
      }),
    ).toBe(true);
  });

  it("does not leak permissions between organizations", () => {
    expect(
      hasOrganizationPermission({
        platformAdmin: false,
        organizations,
        activeOrganizationId: "org-community",
        permission: "cameras.view",
      }),
    ).toBe(false);
  });

  it("can evaluate an explicitly selected organization", () => {
    expect(
      hasOrganizationPermission({
        platformAdmin: false,
        organizations,
        activeOrganizationId: "org-community",
        organizationId: "org-operations",
        permission: "alerts.resolve",
      }),
    ).toBe(true);
  });
});

describe("getPostLoginPath", () => {
  it("always routes platform administrators to platform administration", () => {
    expect(getPostLoginPath(true, organizations, "org-operations")).toBe(
      APP_PATHS.platform,
    );
  });

  it("routes an active security operator to operations", () => {
    expect(getPostLoginPath(false, organizations, "org-operations")).toBe(
      APP_PATHS.operations,
    );
  });

  it("keeps resident access in the personal safety dashboard", () => {
    expect(getPostLoginPath(false, organizations, "org-community")).toBe(
      APP_PATHS.safety,
    );
  });
});
