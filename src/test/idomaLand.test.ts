import { describe, expect, it } from "vitest";

import {
  IDOMA_LAND_BOUNDS,
  getIdomaFocusedMapBounds,
  isIdomaLandResource,
} from "@/lib/idomaLand";
import type { EmergencyResource } from "@/types/resource";

function resource(overrides: Partial<EmergencyResource>): EmergencyResource {
  return {
    id: "resource",
    name: "Emergency facility",
    category: "hospital",
    address: "Benue State",
    lat: 7.2,
    lng: 8.13,
    ...overrides,
  };
}

describe("Idoma land map focus", () => {
  it("recognises resources by Idoma-area LGA or place name", () => {
    expect(isIdomaLandResource(resource({ lga: "Otukpo" }))).toBe(true);
    expect(isIdomaLandResource(resource({ community: "Ugbokolo" }))).toBe(true);
    expect(isIdomaLandResource(resource({ lga: "Makurdi" }))).toBe(false);
  });

  it("uses the Idoma operational viewport when no focused records exist", () => {
    expect(getIdomaFocusedMapBounds([resource({ lga: "Makurdi" })])).toEqual(
      IDOMA_LAND_BOUNDS,
    );
  });

  it("fits recognised Idoma resources and an explicitly shared location", () => {
    expect(
      getIdomaFocusedMapBounds([resource({ lga: "Apa", lat: 7.3, lng: 8.2 })], {
        lat: 7.4,
        lng: 8.3,
      }),
    ).toEqual([
      [7.3, 8.2],
      [7.4, 8.3],
    ]);
  });
});
