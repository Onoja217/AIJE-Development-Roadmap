import type {
  EmergencyResource,
  ResourceCategory,
} from "../types/resource";

export type ResourceLayerKey =
  | "hospitals"
  | "police"
  | "fire"
  | "shelters"
  | "warehouses";

export const RESOURCE_LAYER_CATEGORIES: Record<
  ResourceLayerKey,
  ResourceCategory[]
> = {
  hospitals: [
    "hospital",
    "clinic",
    "blood_bank",
    "pharmacy",
    "ambulance_service",
  ],

  police: [
    "police_station",
    "military_base",
    "civil_defence",
    "watch_group_base",
    "command_centre",
  ],

  fire: [
    "fire_service",
    "rescue_station",
  ],

  shelters: [
    "safe_shelter",
    "idp_camp",
    "community_hall",
    "evacuation_point",
  ],

  warehouses: [
    "relief_warehouse",
    "food_distribution",
    "water_point",
    "lg_emergency_office",
  ],
};

export function getResourceLayer(
  category: ResourceCategory
): ResourceLayerKey | null {
  const entries = Object.entries(
    RESOURCE_LAYER_CATEGORIES
  ) as [ResourceLayerKey, ResourceCategory[]][];

  for (const [layer, categories] of entries) {
    if (categories.includes(category)) {
      return layer;
    }
  }

  return null;
}

export function countResourcesByLayer(
  resources: EmergencyResource[]
): Record<ResourceLayerKey, number> {
  const counts: Record<ResourceLayerKey, number> = {
    hospitals: 0,
    police: 0,
    fire: 0,
    shelters: 0,
    warehouses: 0,
  };

  for (const resource of resources) {
    const layer = getResourceLayer(resource.category);

    if (layer) {
      counts[layer] += 1;
    }
  }

  return counts;
}