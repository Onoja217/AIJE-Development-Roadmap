export type LayerId =
  | "incidents"
  | "hospitals"
  | "police"
  | "fire"
  | "shelters"
  | "warehouses"
  | "weather"
  | "safeBenue"
  | "aiDetections"
  | "osiris"
  | "drones";

export interface MapLayer {
  id: LayerId;
  label: string;
  visible: boolean;
  color: string;
  future?: boolean;
}