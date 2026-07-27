export type ContactRole =
  | "police"
  | "hospital"
  | "fire_service"
  | "community_leader"
  | "vigilante"
  | "ngo"
  | "family";

export type ContactStatus =
  | "active"
  | "inactive";

export interface EmergencyContact {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: ContactRole;
  community: string;
  status: ContactStatus;
  createdAt?: string;
  updatedAt?: string;
}

export type EmergencyContactInput = Omit<
  EmergencyContact,
  "id" | "createdAt" | "updatedAt"
>;