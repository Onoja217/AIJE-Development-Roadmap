// types/resource.ts
//
// Shared shape for emergency resources. Designed so the Community Dashboard's
// Live Map (Christopher's other module) can import EmergencyResource and the
// ResourceMarkers component from here directly, instead of duplicating data.

export type ResourceCategory =
  | "police_station"
  | "hospital"
  | "fire_service"
  | "safe_shelter"
  | "lg_emergency_office"
  | "idp_camp";

export interface EmergencyResource {
  id: string;
  name: string;
  category: ResourceCategory;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  notes?: string;
}

export interface ResourceFilters {
  search?: string;
  category?: ResourceCategory;
}
