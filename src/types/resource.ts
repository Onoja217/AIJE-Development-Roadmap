// types/resource.ts
//
// Shared domain types for AIJE emergency resources.
// Existing resource records remain compatible because advanced fields are optional.

export type ResourceCategory =
  | "hospital"
  | "clinic"
  | "police_station"
  | "military_base"
  | "civil_defence"
  | "fire_service"
  | "ambulance_service"
  | "safe_shelter"
  | "idp_camp"
  | "food_distribution"
  | "water_point"
  | "relief_warehouse"
  | "community_hall"
  | "lg_emergency_office"
  | "blood_bank"
  | "pharmacy"
  | "rescue_station"
  | "evacuation_point"
  | "watch_group_base"
  | "command_centre";

export type ResourceStatus =
  | "active"
  | "busy"
  | "full"
  | "closed"
  | "under_maintenance"
  | "temporarily_unavailable"
  | "damaged";

export type ResourceVerificationStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "expired";

export type ResourceVisibility =
  | "public"
  | "organization"
  | "restricted";

export type ResourceService =
  | "emergency_medical_care"
  | "general_medical_care"
  | "ambulance"
  | "shelter"
  | "food"
  | "water"
  | "security"
  | "fire_response"
  | "search_and_rescue"
  | "psychosocial_support"
  | "sanitation"
  | "disability_access"
  | "charging"
  | "internet"
  | "blood_services"
  | "medicine";

export interface EmergencyResource {
  id: string;

  // Ownership
  organizationId?: string;

  // Basic information
  name: string;
  category: ResourceCategory;
  description?: string;
  notes?: string;

  // Location
  address: string;
  community?: string;
  ward?: string;
  lga?: string;
  state?: string;
  country?: string;
  lat: number;
  lng: number;

  // Availability and operations
  status?: ResourceStatus;
  verificationStatus?: ResourceVerificationStatus;
  visibility?: ResourceVisibility;
  isPublic?: boolean;
  operatingHours?: string;
  services?: ResourceService[];

  // Capacity
  maximumCapacity?: number;
  availableCapacity?: number;
  capacityUnit?: string;

  // Contact information
  contactPerson?: string;
  phone?: string;
  alternatePhone?: string;
  email?: string;
  website?: string;

  // Accessibility and media
  accessibilityNotes?: string;
  imageUrls?: string[];

  // Verification and administration
  createdBy?: string;
  updatedBy?: string;
  verifiedBy?: string;
  lastVerifiedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResourceFilters {
  search?: string;
  category?: ResourceCategory;
  status?: ResourceStatus;
  verificationStatus?: ResourceVerificationStatus;
  lga?: string;
  ward?: string;
  community?: string;
  service?: ResourceService;
  onlyAvailable?: boolean;
  onlyVerified?: boolean;
}