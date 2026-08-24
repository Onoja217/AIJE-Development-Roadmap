import { describe, expect, it } from "vitest";

import { mapOsirisHotspotToResource } from "@/integrations/osiris/mapper";
import type { OsirisHotspot } from "@/integrations/osiris/types";

const hotspot: OsirisHotspot = {
  id: "makurdi-central",
  name: "Makurdi Central",
  location: {
    latitude: 7.73,
    longitude: 8.52,
    community: "Makurdi",
  },
  radiusMetres: 2500,
  riskScore: 78,
  threatLevel: "high",
  incidentCount: 12,
  updatedAt: "2026-08-25T10:00:00.000Z",
};

describe("mapOsirisHotspotToResource", () => {
  it("creates an explicit non-facility map marker", () => {
    expect(mapOsirisHotspotToResource(hotspot)).toMatchObject({
      id: "osiris-hotspot-makurdi-central",
      name: "Risk hotspot: Makurdi Central",
      address: "Makurdi",
      lat: 7.73,
      lng: 8.52,
      status: "temporarily_unavailable",
      verificationStatus: "verified",
      updatedBy: "osiris-integration",
    });
  });
});
