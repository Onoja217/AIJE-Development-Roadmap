import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";

import type { EmergencyResource } from "@/types/resource";

/** Operational map focus for Idoma-speaking southern Benue, centred on Otukpo. */
export const IDOMA_LAND_CENTER: LatLngExpression = [7.1906, 8.1294];

export const IDOMA_LAND_BOUNDS: LatLngBoundsExpression = [
  [6.55, 7.65],
  [7.65, 8.75],
];

const IDOMA_LGAS = new Set([
  "ado",
  "agatu",
  "apa",
  "ogbadibo",
  "ohimini",
  "okpokwu",
  "otukpo",
]);

const IDOMA_PLACE_NAMES = [
  "adoka",
  "agbaha",
  "agila",
  "ankpa",
  "enuoya",
  "ichama",
  "igumale",
  "obaganya",
  "ochekwu",
  "odessassa",
  "ogobia",
  "okpoga",
  "otukpa",
  "otukpo",
  "ugbogbo",
  "ugbokolo",
  "uicho",
  "umogidi",
];

function normalize(value?: string): string {
  return value?.trim().toLowerCase() ?? "";
}

export function isIdomaLandResource(resource: EmergencyResource): boolean {
  if (IDOMA_LGAS.has(normalize(resource.lga))) {
    return true;
  }

  const searchableLocation = [
    resource.name,
    resource.address,
    resource.community,
    resource.ward,
  ]
    .map(normalize)
    .join(" ");

  return IDOMA_PLACE_NAMES.some((place) => searchableLocation.includes(place));
}

export function getIdomaFocusedMapBounds(
  resources: EmergencyResource[],
  userLocation?: { lat: number; lng: number } | null,
): LatLngBoundsExpression {
  const points = resources
    .filter(isIdomaLandResource)
    .filter(
      (resource) =>
        Number.isFinite(resource.lat) && Number.isFinite(resource.lng),
    )
    .map((resource) => [resource.lat, resource.lng] as [number, number]);

  if (userLocation) {
    points.push([userLocation.lat, userLocation.lng]);
  }

  return points.length > 0 ? points : IDOMA_LAND_BOUNDS;
}
