// config/emergencyCategories.ts
import type { EmergencyCategoryId } from "../types/report";

export interface EmergencyCategory {
  id: EmergencyCategoryId;
  label: string;
  icon: string;
  description: string;
}

export const EMERGENCY_CATEGORIES: EmergencyCategory[] = [
  { id: "attack", label: "Attack", icon: "🔴", description: "Armed attack, raid, or violent incident in progress" },
  { id: "kidnapping", label: "Kidnapping", icon: "🚨", description: "Abduction or forced disappearance" },
  { id: "fire", label: "Fire", icon: "🔥", description: "Building, farmland, or bush fire" },
  { id: "flood", label: "Flood", icon: "🌊", description: "Flooding affecting homes or roads" },
  { id: "medical", label: "Medical Emergency", icon: "🚑", description: "Urgent medical situation requiring assistance" },
  { id: "accident", label: "Accident", icon: "🚗", description: "Road traffic or other accident" },
  { id: "crime", label: "Crime", icon: "🕵️", description: "Theft, assault, or other criminal activity" },
  { id: "building_collapse", label: "Building Collapse", icon: "🏚️", description: "Structural collapse of a building or other structure" },
  { id: "missing_person", label: "Missing Person", icon: "🔎", description: "A person is missing or unaccounted for" },
  { id: "road_damage", label: "Road Damage", icon: "🛣️", description: "Impassable or dangerous road conditions" },
  { id: "power_outage", label: "Power Outage", icon: "⚡", description: "Loss of electricity affecting the community" },
  { id: "water_issue", label: "Water Issue", icon: "🚰", description: "Water supply shortage, contamination, or infrastructure fault" },
];

export function getCategoryById(id: EmergencyCategoryId): EmergencyCategory | undefined {
  return EMERGENCY_CATEGORIES.find((c) => c.id === id);
}