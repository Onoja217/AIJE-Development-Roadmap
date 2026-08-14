import { describe, expect, it } from "vitest";
import {
  APP_PATHS,
  NAVIGATION_SECTIONS,
  canOpenNavigationItem,
} from "@/features/navigation/navigationConfig";

describe("domain navigation", () => {
  it("keeps every canonical navigation path unique", () => {
    const paths = NAVIGATION_SECTIONS.flatMap((section) =>
      section.items.map((item) => item.path),
    );
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("groups operational tools under their domain", () => {
    expect(APP_PATHS.cameras).toBe("/operations/cameras");
    expect(APP_PATHS.intelligence).toBe("/intelligence/osiris");
    expect(APP_PATHS.safeBenue).toBe("/community/safebenue");
  });

  it("does not expose restricted navigation without permission", () => {
    const osiris = NAVIGATION_SECTIONS.flatMap((section) => section.items).find(
      (item) => item.path === APP_PATHS.intelligence,
    );
    expect(osiris).toBeDefined();
    expect(canOpenNavigationItem(osiris!, false, () => false)).toBe(false);
    expect(
      canOpenNavigationItem(
        osiris!,
        false,
        (permission) => permission === "intelligence.view",
      ),
    ).toBe(true);
  });
});
