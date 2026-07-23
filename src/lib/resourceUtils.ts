// lib/resourceUtils.ts

import type {
  EmergencyResource,
  ResourceFilters,
  ResourceStatus,
} from "../types/resource";

const UNAVAILABLE_STATUSES: ReadonlySet<ResourceStatus> = new Set([
  "full",
  "closed",
  "under_maintenance",
  "temporarily_unavailable",
  "damaged",
]);

export function filterResources(
  resources: EmergencyResource[],
  filters: ResourceFilters
): EmergencyResource[] {
  const search = filters.search?.trim().toLowerCase();

  return resources.filter((resource) => {
    if (filters.category && resource.category !== filters.category) {
      return false;
    }

    if (filters.status && resource.status !== filters.status) {
      return false;
    }

    if (
      filters.verificationStatus &&
      resource.verificationStatus !== filters.verificationStatus
    ) {
      return false;
    }

    if (
      filters.lga &&
      resource.lga?.toLowerCase() !== filters.lga.toLowerCase()
    ) {
      return false;
    }

    if (
      filters.ward &&
      resource.ward?.toLowerCase() !== filters.ward.toLowerCase()
    ) {
      return false;
    }

    if (
      filters.community &&
      resource.community?.toLowerCase() !==
        filters.community.toLowerCase()
    ) {
      return false;
    }

    if (
      filters.service &&
      !resource.services?.includes(filters.service)
    ) {
      return false;
    }

    if (
      filters.onlyVerified &&
      resource.verificationStatus !== "verified"
    ) {
      return false;
    }

    if (filters.onlyAvailable) {
      if (
        resource.status &&
        UNAVAILABLE_STATUSES.has(resource.status)
      ) {
        return false;
      }

      if (
        resource.availableCapacity !== undefined &&
        resource.availableCapacity <= 0
      ) {
        return false;
      }
    }

    if (search) {
      const searchableText = [
        resource.name,
        resource.description,
        resource.address,
        resource.community,
        resource.ward,
        resource.lga,
        resource.state,
        resource.contactPerson,
        resource.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!searchableText.includes(search)) {
        return false;
      }
    }

    return true;
  });
}

// Haversine formula: straight-line distance in kilometres.
// This is not turn-by-turn road distance.
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const calculation =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  const centralAngle =
    2 *
    Math.atan2(
      Math.sqrt(calculation),
      Math.sqrt(1 - calculation)
    );

  return earthRadiusKm * centralAngle;
}

export function sortByDistance(
  resources: EmergencyResource[],
  userLat: number,
  userLng: number
): Array<EmergencyResource & { distanceKm: number }> {
  return resources
    .filter(
      (resource) =>
        Number.isFinite(resource.lat) &&
        Number.isFinite(resource.lng) &&
        resource.lat >= -90 &&
        resource.lat <= 90 &&
        resource.lng >= -180 &&
        resource.lng <= 180
    )
    .map((resource) => ({
      ...resource,
      distanceKm: distanceKm(
        userLat,
        userLng,
        resource.lat,
        resource.lng
      ),
    }))
    .sort(
      (firstResource, secondResource) =>
        firstResource.distanceKm - secondResource.distanceKm
    );
}