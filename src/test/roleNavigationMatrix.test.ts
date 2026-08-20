import { describe, expect, it } from "vitest";
import {
  APP_PATHS,
  NAVIGATION_SECTIONS,
  canOpenNavigationItem,
} from "@/features/navigation/navigationConfig";
import type { Permission } from "@/features/access/types";

const items = NAVIGATION_SECTIONS.flatMap((section) => section.items);
const visiblePaths = (permissions: Permission[], platformAdmin = false) =>
  items
    .filter((item) =>
      canOpenNavigationItem(item, platformAdmin, (permission) =>
        permissions.includes(permission),
      ),
    )
    .map((item) => item.path);

describe("role navigation boundaries", () => {
  it.each([
    [
      "resident",
      ["incidents.create"],
      [APP_PATHS.safety],
      [APP_PATHS.operations, APP_PATHS.intelligence],
    ],
    [
      "household owner",
      ["incidents.create", "sensors.view", "sensors.manage"],
      [APP_PATHS.safety, APP_PATHS.householdSensors],
      [APP_PATHS.operations, APP_PATHS.platform],
    ],
    [
      "security operator",
      ["cameras.view", "sensors.view", "incidents.respond"],
      [APP_PATHS.cameras, APP_PATHS.householdSensors],
      [APP_PATHS.operations, APP_PATHS.intelligence],
    ],
    [
      "responder",
      ["incidents.respond", "intelligence.view"],
      [APP_PATHS.community, APP_PATHS.intelligence],
      [APP_PATHS.sites],
    ],
    [
      "community leader",
      [
        "alerts.dispatch",
        "reports.verify",
        "intelligence.view",
        "intelligence.refresh",
      ],
      [APP_PATHS.community, APP_PATHS.intelligence],
      [APP_PATHS.platform],
    ],
    [
      "organization admin",
      ["organization.manage", "sites.manage", "intelligence.view"],
      [APP_PATHS.organization, APP_PATHS.sites, APP_PATHS.intelligence],
      [APP_PATHS.platform],
    ],
  ] as Array<[string, Permission[], string[], string[]]>)(
    "shows only authorized workspaces for %s",
    (_role, permissions, allowed, denied) => {
      const paths = visiblePaths(permissions);
      allowed.forEach((path) => expect(paths).toContain(path));
      denied.forEach((path) => expect(paths).not.toContain(path));
    },
  );

  it("gives a platform administrator platform and source-management access", () => {
    const paths = visiblePaths(["intelligence.manage_sources"], true);
    expect(paths).toContain(APP_PATHS.platform);
    expect(paths).toContain(APP_PATHS.webhooks);
    expect(paths).toContain(APP_PATHS.intelligence);
  });

  it("removes organization workspaces for a suspended member", () => {
    const paths = visiblePaths([]);
    expect(paths).toContain(APP_PATHS.safety);
    expect(paths).not.toContain(APP_PATHS.organization);
    expect(paths).not.toContain(APP_PATHS.community);
    expect(paths).not.toContain(APP_PATHS.intelligence);
    expect(paths).not.toContain(APP_PATHS.sites);
  });
});
