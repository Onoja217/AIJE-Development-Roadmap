import type { ResourceCategory } from "../types/resource";

export const RESOURCE_CATEGORY_CONFIG: Record<
  ResourceCategory,
  { label: string; icon: string; color: string }
> = {
  police_station: {
    label: "Police Station",
    icon: "🚓",
    color: "bg-blue-600",
  },

  hospital: {
    label: "Hospital",
    icon: "🏥",
    color: "bg-red-600",
  },

  fire_service: {
    label: "Fire Service",
    icon: "🚒",
    color: "bg-orange-600",
  },

  safe_shelter: {
    label: "Safe Shelter",
    icon: "🏫",
    color: "bg-green-600",
  },

  lg_emergency_office: {
    label: "Emergency Office",
    icon: "🏢",
    color: "bg-purple-600",
  },

  idp_camp: {
    label: "IDP Camp",
    icon: "⛺",
    color: "bg-yellow-600",
  },

  military_checkpoint: {
    label: "Military Checkpoint",
    icon: "🪖",
    color: "bg-emerald-700",
  },

  vigilante_post: {
    label: "Vigilante Post",
    icon: "🛡",
    color: "bg-lime-700",
  },

  ambulance: {
    label: "Ambulance",
    icon: "🚑",
    color: "bg-red-500",
  },

  relief_center: {
    label: "Relief Center",
    icon: "📦",
    color: "bg-amber-600",
  },

  food_distribution: {
    label: "Food Distribution",
    icon: "🍚",
    color: "bg-yellow-700",
  },

  water_point: {
    label: "Water Point",
    icon: "💧",
    color: "bg-cyan-600",
  },

  medical_center: {
    label: "Medical Center",
    icon: "🏨",
    color: "bg-pink-600",
  },

  pharmacy: {
    label: "Pharmacy",
    icon: "💊",
    color: "bg-rose-600",
  },

  school_shelter: {
    label: "School Shelter",
    icon: "🎓",
    color: "bg-indigo-600",
  },

  church_shelter: {
    label: "Church Shelter",
    icon: "⛪",
    color: "bg-violet-700",
  },

  mosque_shelter: {
    label: "Mosque Shelter",
    icon: "🕌",
    color: "bg-teal-700",
  },

  bridge: {
    label: "Bridge",
    icon: "🌉",
    color: "bg-slate-600",
  },

  road_block: {
    label: "Road Block",
    icon: "🚧",
    color: "bg-orange-700",
  },

  evacuation_route: {
    label: "Evacuation Route",
    icon: "🛣",
    color: "bg-sky-700",
  },

  command_center: {
    label: "Command Center",
    icon: "📍",
    color: "bg-red-800",
  },

  temporary_camp: {
    label: "Temporary Camp",
    icon: "🏕",
    color: "bg-green-700",
  },
};

export const RESOURCE_CATEGORIES =
  Object.keys(RESOURCE_CATEGORY_CONFIG) as ResourceCategory[];