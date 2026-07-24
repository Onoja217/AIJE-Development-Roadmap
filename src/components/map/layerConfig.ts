import { MAP_COLORS } from "./MapIcons";
import type { MapLayer } from "./layerTypes";

export const DEFAULT_LAYERS: MapLayer[] = [
  {
    id: "incidents",
    label: "Incidents",
    visible: true,
    color: MAP_COLORS.incident,
  },
  {
    id: "hospitals",
    label: "Hospitals",
    visible: true,
    color: MAP_COLORS.hospital,
  },
  {
    id: "police",
    label: "Police",
    visible: true,
    color: MAP_COLORS.police,
  },
  {
    id: "fire",
    label: "Fire Service",
    visible: true,
    color: MAP_COLORS.fire,
  },
  {
    id: "shelters",
    label: "Shelters",
    visible: true,
    color: MAP_COLORS.shelter,
  },
  {
    id: "warehouses",
    label: "Warehouses",
    visible: true,
    color: MAP_COLORS.warehouse,
  },

  {
    id: "weather",
    label: "Weather",
    visible: false,
    color: "#38bdf8",
    future: true,
  },
  {
    id: "safeBenue",
    label: "Safe Benue Alerts",
    visible: false,
    color: "#22c55e",
    future: true,
  },
  {
    id: "aiDetections",
    label: "AI Detections",
    visible: false,
    color: "#8b5cf6",
    future: true,
  },
  {
    id: "osiris",
    label: "OSIRIS Intelligence",
    visible: false,
    color: "#f59e0b",
    future: true,
  },
  {
    id: "drones",
    label: "Drone Feed",
    visible: false,
    color: "#64748b",
    future: true,
  },
];