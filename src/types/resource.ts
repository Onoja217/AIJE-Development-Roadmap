export interface EmergencyResource {
  id: string;
  name: string;
  category: ResourceCategory;

  address: string;

  lat: number;
  lng: number;

  phone?: string;
  notes?: string;

  // Geographic hierarchy
  community?: string;
  ward?: string;
  lga?: string;
  state?: string;

  // Operational information
  email?: string;

  status?: "active" | "limited" | "offline" | "full";

  verified?: boolean;

  capacity?: number;

  availableCapacity?: number;

  services?: string[];

  lastUpdated?: string;
}