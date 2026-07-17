// lib/resourceUtils.ts
import type { EmergencyResource, ResourceFilters } from "../types/resource";

export function filterResources(
  resources: EmergencyResource[],
  filters: ResourceFilters
): EmergencyResource[] {
  return resources.filter((r) => {
    if (filters.category && r.category !== filters.category) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = `${r.name} ${r.address}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

// Haversine formula — straight-line distance in km between two coordinates.
// Good enough for "nearest resource" sorting; not turn-by-turn routing distance.
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function sortByDistance(
  resources: EmergencyResource[],
  userLat: number,
  userLng: number
): Array<EmergencyResource & { distanceKm: number }> {
  return resources
    .map((r) => ({ ...r, distanceKm: distanceKm(userLat, userLng, r.lat, r.lng) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
