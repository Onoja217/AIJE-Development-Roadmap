import { describe, expect, it } from "vitest";
import {
  distanceKm,
  filterResources,
  sortByDistance,
} from "@/lib/resourceUtils";
import type { EmergencyResource } from "@/types/resource";

const resources = [
  {
    id: "available",
    name: "Clinic",
    address: "Makurdi",
    category: "hospital",
    status: "active",
    verificationStatus: "verified",
    lat: 7.73,
    lng: 8.52,
    lga: "Makurdi",
    ward: "Central",
    community: "Wadata",
    description: "Emergency trauma centre",
    contactPerson: "Ada",
    services: ["emergency_medical_care"],
  },
  {
    id: "full",
    name: "Shelter",
    address: "Otukpo",
    category: "safe_shelter",
    status: "full",
    verificationStatus: "verified",
    lat: 7.8,
    lng: 8.6,
  },
  {
    id: "invalid",
    name: "Unknown",
    address: "Unknown",
    category: "hospital",
    verificationStatus: "pending",
    lat: 999,
    lng: 8.5,
  },
] satisfies EmergencyResource[];

describe("resource utilities", () => {
  it("applies availability, verification, and service filters together", () => {
    expect(
      filterResources(resources, {
        onlyAvailable: true,
        onlyVerified: true,
        service: "emergency_medical_care",
      }),
    ).toEqual([resources[0]]);
  });

  it("calculates distance and excludes invalid coordinates", () => {
    expect(distanceKm(7.73, 8.52, 7.73, 8.52)).toBe(0);
    expect(sortByDistance(resources, 7.73, 8.52).map(({ id }) => id)).toEqual([
      "available",
      "full",
    ]);
  });

  it("supports each directory filter and free-text search", () => {
    const expected = [resources[0]];
    expect(filterResources(resources, { category: "hospital" })).toHaveLength(
      2,
    );
    expect(filterResources(resources, { status: "active" })).toEqual(expected);
    expect(
      filterResources(resources, { verificationStatus: "pending" }),
    ).toEqual([resources[2]]);
    expect(filterResources(resources, { lga: "MAKURDI" })).toEqual(expected);
    expect(filterResources(resources, { ward: "central" })).toEqual(expected);
    expect(filterResources(resources, { community: "wadata" })).toEqual(
      expected,
    );
    expect(filterResources(resources, { search: "trauma" })).toEqual(expected);
    expect(filterResources(resources, { search: "missing" })).toEqual([]);
  });

  it("treats zero capacity and unavailable statuses as unavailable", () => {
    const noCapacity = { ...resources[0], id: "zero", availableCapacity: 0 };
    expect(filterResources([noCapacity], { onlyAvailable: true })).toEqual([]);
    expect(filterResources([resources[1]], { onlyAvailable: true })).toEqual(
      [],
    );
    expect(filterResources([resources[0]], { onlyAvailable: true })).toEqual([
      resources[0],
    ]);
  });

  it("orders distinct coordinates by increasing distance", () => {
    const sorted = sortByDistance(resources, 7.7, 8.5);
    expect(sorted[0].distanceKm).toBeLessThan(sorted[1].distanceKm);
  });
});
