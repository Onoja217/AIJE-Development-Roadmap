// config/contactConfig.ts
import type { ContactRole, ContactStatus } from "../types/contact";

export const ROLE_CONFIG: Record<ContactRole, { label: string; icon: string }> = {
  police: { label: "Police", icon: "🚓" },
  hospital: { label: "Hospital", icon: "🏥" },
  fire_service: { label: "Fire Service", icon: "🚒" },
  community_leader: { label: "Community Leader", icon: "🧑‍💼" },
  vigilante: { label: "Vigilante", icon: "🛡️" },
  ngo: { label: "NGO", icon: "🤝" },
  family: { label: "Family", icon: "👪" },
};

export const CONTACT_ROLES = Object.keys(ROLE_CONFIG) as ContactRole[];

export const STATUS_CONFIG: Record<ContactStatus, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-green-600" },
  inactive: { label: "Inactive", color: "bg-slate-400" },
};