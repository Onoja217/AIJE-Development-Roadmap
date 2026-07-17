// config/resourceConfig.ts
import type { ResourceCategory } from "../types/resource";

export const RESOURCE_CATEGORY_CONFIG: Record<
  ResourceCategory,
  { label: string; icon: string; color: string }
> = {
  police_station: { label: "Police Station", icon: "🚓", color: "bg-blue-600" },
  hospital: { label: "Hospital", icon: "🏥", color: "bg-red-600" },
  fire_service: { label: "Fire Service", icon: "🚒", color: "bg-orange-600" },
  safe_shelter: { label: "Safe Shelter", icon: "🏫", color: "bg-green-600" },
  lg_emergency_office: { label: "LG Emergency Office", icon: "🏢", color: "bg-purple-600" },
  idp_camp: { label: "IDP Camp", icon: "⛺", color: "bg-yellow-600" },
};

export const RESOURCE_CATEGORIES = Object.keys(RESOURCE_CATEGORY_CONFIG) as ResourceCategory[];
