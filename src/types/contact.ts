// types/contact.ts

export type ContactRole =
  | "police"
  | "hospital"
  | "fire_service"
  | "community_leader"
  | "vigilante"
  | "ngo"
  | "family";

export type ContactStatus = "active" | "inactive";

export interface EmergencyContact {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: ContactRole;
  community: string;
  status: ContactStatus;
}

// Used by the form before an id exists (create flow).
export type EmergencyContactInput = Omit<EmergencyContact, "id">;