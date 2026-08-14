import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { getVisibleControlPanelModules } from "@/pages/ControlPanel";
import type { Permission } from "@/features/access/types";

function titlesFor(permissions: Permission[], platformAdmin = false) {
  return getVisibleControlPanelModules(platformAdmin, (permission) =>
    permissions.includes(permission),
  ).map((module) => module.title);
}

describe("control panel module boundaries", () => {
  it("does not expose response or administration modules to a household owner", () => {
    const titles = titlesFor([
      "incidents.create",
      "cameras.view",
      "cameras.manage",
      "sites.manage",
      "billing.manage",
    ]);

    expect(titles).toContain("Camera Management");
    expect(titles).toContain("Sensor Management");
    expect(titles).toContain("Deployments");
    expect(titles).not.toContain("Community Alert System");
    expect(titles).not.toContain("Community Dashboard");
    expect(titles).not.toContain("Administration");
  });

  it("shows administration only to platform administrators", () => {
    expect(titlesFor([], true)).toContain("Administration");
    expect(titlesFor(["organization.manage"])).not.toContain("Administration");
  });
});
