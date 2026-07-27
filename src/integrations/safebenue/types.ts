export type SafeBenueIncidentCategory =
  | "security"
  | "medical"
  | "fire"
  | "flood"
  | "missing_person"
  | "infrastructure"
  | "other";

export type SafeBenueIncidentStatus =
  | "reported"
  | "verified"
  | "responding"
  | "resolved";

export interface SafeBenueLocation {
  latitude: number;
  longitude: number;
  address?: string;
  community?: string;
  localGovernment?: string;
}

export interface SafeBenueIncident {
  id: string;
  title: string;
  description: string;
  category: SafeBenueIncidentCategory;
  status: SafeBenueIncidentStatus;
  severity: "low" | "medium" | "high" | "critical";
  location: SafeBenueLocation;
  reportedAt: string;
  updatedAt: string;
  source: "citizen" | "watch_group" | "responder" | "system";
}

export interface SafeBenueResource {
  id: string;
  name: string;
  category:
    | "hospital"
    | "police"
    | "fire_service"
    | "shelter"
    | "warehouse"
    | "ngo"
    | "community_leader";
  location: SafeBenueLocation;
  phone?: string;
  availability: "available" | "limited" | "unavailable";
  updatedAt: string;
}

export interface SafeBenueMissingPerson {
  id: string;
  fullName: string;
  age?: number;
  description?: string;
  lastSeenLocation?: SafeBenueLocation;
  lastSeenAt?: string;
  status: "missing" | "located" | "reunited";
  reportedAt: string;
}

export interface SafeBenuePayload {
  incidents: SafeBenueIncident[];
  resources: SafeBenueResource[];
  missingPersons: SafeBenueMissingPerson[];
}
