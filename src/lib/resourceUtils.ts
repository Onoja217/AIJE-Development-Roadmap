// lib/resourceUtils.ts
import type {
  EmergencyResource,
  ResourceFilters,
} from "../types/resource";

export function filterResources(
  resources: EmergencyResource[],
  filters: ResourceFilters
): EmergencyResource[] {
  return resources.filter((resource) => {
    if (
      filters.category &&
      resource.category !== filters.category
    ) {
      return false;
    }

    const searchQuery = filters.search?.trim().toLowerCase();

    if (searchQuery) {
      const searchableText = [
        resource.name,
        resource.address,
        resource.community,
        resource.ward,
        resource.lga,
        resource.state,
        resource.phone,
        resource.email,
        resource.notes,
        resource.status,
        resource.category.replace(/_/g, " "),
        ...(resource.services ?? []),
      ]
        .filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0
        )
        .join(" ")
        .toLowerCase();

      if (!searchableText.includes(searchQuery)) {
        return false;
      }
    }

    return true;
  });
}

// Haversine formula — straight-line distance in kilometres
// between two coordinates.
// This is suitable for nearest-resource sorting,
// but it is not a road-routing distance.
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const earthRadiusKm = 6371;

  const latitudeDifference =
    ((lat2 - lat1) * Math.PI) / 180;

  const longitudeDifference =
    ((lng2 - lng1) * Math.PI) / 180;

  const latitude1Radians = (lat1 * Math.PI) / 180;
  const latitude2Radians = (lat2 * Math.PI) / 180;

  const haversineValue =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(latitude1Radians) *
      Math.cos(latitude2Radians) *
      Math.sin(longitudeDifference / 2) ** 2;

  const angularDistance =
    2 *
    Math.atan2(
      Math.sqrt(haversineValue),
      Math.sqrt(1 - haversineValue)
    );

  return earthRadiusKm * angularDistance;
}

export function sortByDistance(
  resources: EmergencyResource[],
  userLat: number,
  userLng: number
): Array<EmergencyResource & { distanceKm: number }> {
  return resources
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
      (resourceA, resourceB) =>
        resourceA.distanceKm - resourceB.distanceKm
    );
}