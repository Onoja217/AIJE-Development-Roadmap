import { describe, expect, it } from "vitest";
import { distanceKm, filterResources, sortByDistance } from "@/lib/resourceUtils";
import type { EmergencyResource } from "@/types/resource";

const resources = [
  { id: "available", name: "Clinic", address: "Makurdi", category: "hospital", status: "active", verificationStatus: "verified", lat: 7.73, lng: 8.52, services: ["emergency_medical_care"] },
  { id: "full", name: "Shelter", address: "Otukpo", category: "safe_shelter", status: "full", verificationStatus: "verified", lat: 7.8, lng: 8.6 },
  { id: "invalid", name: "Unknown", address: "Unknown", category: "hospital", verificationStatus: "pending", lat: 999, lng: 8.5 },
] satisfies EmergencyResource[];

describe("resource utilities", () => {
  it("applies availability, verification, and service filters together", () => {
    expect(filterResources(resources, { onlyAvailable: true, onlyVerified: true, service: "emergency_medical_care" })).toEqual([resources[0]]);
  });

  it("calculates distance and excludes invalid coordinates", () => {
    expect(distanceKm(7.73, 8.52, 7.73, 8.52)).toBe(0);
    expect(sortByDistance(resources, 7.73, 8.52).map(({ id }) => id)).toEqual(["available", "full"]);
  });
});
