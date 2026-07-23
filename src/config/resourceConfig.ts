// config/resourceConfig.ts

import type {
  ResourceCategory,
  ResourceStatus,
  ResourceVerificationStatus,
} from "../types/resource";

interface ResourceCategoryConfig {
  label: string;
  icon: string;
 color: string;
  description: string;
}

export const RESOURCE_CATEGORY_CONFIG: Record<
  ResourceCategory,
  ResourceCategoryConfig
> = {
  hospital: {
    label: "Hospital",
    icon: "🏥",
    color: "bg-red-600",
    description: "Hospital providing emergency and general medical care",
  },
  clinic: {
    label: "Clinic",
    icon: "🩺",
    color: "bg-rose-600",
    description: "Primary healthcare facility",
  },
  police_station: {
    label: "Police Station",
    icon: "🚓",
    color: "bg-blue-600",
    description: "Police response station",
  },
  military_base: {
    label: "Military Base",
    icon: "🛡️",
    color: "bg-slate-700",
    description: "Military coordination facility",
  },
  civil_defence: {
    label: "Civil Defence",
    icon: "🛡️",
    color: "bg-indigo-600",
    description: "Civil defence office",
  },
  fire_service: {
    label: "Fire Service",
    icon: "🚒",
    color: "bg-orange-600",
    description: "Fire and rescue service",
  },
  ambulance_service: {
    label: "Ambulance",
    icon: "🚑",
    color: "bg-red-500",
    description: "Emergency ambulance service",
  },
  safe_shelter: {
    label: "Safe Shelter",
    icon: "🏫",
    color: "bg-green-600",
    description: "Verified emergency shelter",
  },
  idp_camp: {
    label: "IDP Camp",
    icon: "⛺",
    color: "bg-yellow-600",
    description: "Internally displaced persons camp",
  },
  food_distribution: {
    label: "Food Centre",
    icon: "🍲",
    color: "bg-amber-600",
    description: "Food distribution point",
  },
  water_point: {
    label: "Water Point",
    icon: "💧",
    color: "bg-cyan-600",
    description: "Emergency water source",
  },
  relief_warehouse: {
    label: "Relief Warehouse",
    icon: "📦",
    color: "bg-stone-600",
    description: "Emergency supplies warehouse",
  },
  community_hall: {
    label: "Community Hall",
    icon: "🏛️",
    color: "bg-teal-600",
    description: "Community coordination centre",
  },
  lg_emergency_office: {
    label: "LG Emergency Office",
    icon: "🏢",
    color: "bg-purple-600",
    description: "Local government emergency office",
  },
  blood_bank: {
    label: "Blood Bank",
    icon: "🩸",
    color: "bg-red-700",
    description: "Blood donation and storage",
  },
  pharmacy: {
    label: "Pharmacy",
    icon: "💊",
    color: "bg-emerald-600",
    description: "Medicine supply point",
  },
  rescue_station: {
    label: "Rescue Station",
    icon: "🛟",
    color: "bg-sky-600",
    description: "Search and rescue station",
  },
  evacuation_point: {
    label: "Evacuation Point",
    icon: "🚩",
    color: "bg-lime-700",
    description: "Emergency evacuation point",
  },
  watch_group_base: {
    label: "Watch Group Base",
    icon: "👁️",
    color: "bg-zinc-700",
    description: "Community watch base",
  },
  command_centre: {
    label: "Command Centre",
    icon: "📡",
    color: "bg-violet-700",
    description: "Emergency command centre",
  },
};

export const RESOURCE_CATEGORIES = Object.keys(
  RESOURCE_CATEGORY_CONFIG
) as ResourceCategory[];

export const RESOURCE_STATUS_CONFIG: Record<
  ResourceStatus,
  { label: string }
> = {
  active: { label: "Active" },
  busy: { label: "Busy" },
  full: { label: "Full" },
  closed: { label: "Closed" },
  under_maintenance: { label: "Under Maintenance" },
  temporarily_unavailable: { label: "Temporarily Unavailable" },
  damaged: { label: "Damaged" },
};

export const RESOURCE_VERIFICATION_CONFIG: Record<
  ResourceVerificationStatus,
  { label: string }
> = {
  pending: { label: "Pending" },
  verified: { label: "Verified" },
  rejected: { label: "Rejected" },
  expired: { label: "Expired" },
};