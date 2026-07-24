export const MAP_COLORS = {
  incident: "#dc2626",
  hospital: "#2563eb",
  police: "#4f46e5",
  fire: "#ef4444",
  shelter: "#16a34a",
  warehouse: "#ea580c",
  fallback: "#64748b",
  markerBorder: "#ffffff",
} as const;

export interface ResourceMapStyle {
  color: string;
  label: string;
}

const RESOURCE_MAP_STYLES: Record<string, ResourceMapStyle> = {
  hospital: {
    color: MAP_COLORS.hospital,
    label: "Hospital",
  },
  hospitals: {
    color: MAP_COLORS.hospital,
    label: "Hospital",
  },
  police: {
    color: MAP_COLORS.police,
    label: "Police",
  },
  police_station: {
    color: MAP_COLORS.police,
    label: "Police Station",
  },
  fire: {
    color: MAP_COLORS.fire,
    label: "Fire Service",
  },
  fire_station: {
    color: MAP_COLORS.fire,
    label: "Fire Station",
  },
  shelter: {
    color: MAP_COLORS.shelter,
    label: "Shelter",
  },
  shelters: {
    color: MAP_COLORS.shelter,
    label: "Shelter",
  },
  emergency_shelter: {
    color: MAP_COLORS.shelter,
    label: "Emergency Shelter",
  },
  warehouse: {
    color: MAP_COLORS.warehouse,
    label: "Warehouse",
  },
  warehouses: {
    color: MAP_COLORS.warehouse,
    label: "Warehouse",
  },
};

export function normalizeMapCategory(category?: string): string {
  return category?.trim().toLowerCase().replace(/[\s-]+/g, "_") ?? "";
}

export function getResourceMapStyle(category?: string): ResourceMapStyle {
  const normalizedCategory = normalizeMapCategory(category);
  const configuredStyle = RESOURCE_MAP_STYLES[normalizedCategory];

  if (configuredStyle) {
    return configuredStyle;
  }

  return {
    color: MAP_COLORS.fallback,
    label: category?.trim() || "Emergency Resource",
  };
}