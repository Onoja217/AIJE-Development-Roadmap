export type SensorStatus =
  | "online"
  | "offline"
  | "warning"
  | "alert"
  | "tampered";
export type ArmMode = "disarmed" | "home" | "away";

export interface HouseholdSite {
  id: string;
  name: string;
  address: string | null;
}

export interface SensorGateway {
  id: string;
  site_id: string;
  name: string;
  status: "online" | "offline" | "warning";
  arm_mode: ArmMode;
  battery_percent: number | null;
  connection_type: string;
  last_seen_at: string | null;
  is_demo: boolean;
}

export interface GatewayCommand {
  id: string;
  gateway_id: string;
  command_type: string;
  status: "queued" | "delivered" | "acknowledged" | "failed" | "expired";
  error: string | null;
  created_at: string;
}

export interface GatewayEnrollment {
  id: string;
  claim_token: string;
  expires_at: string;
}

export interface SensorDevice {
  id: string;
  site_id: string;
  name: string;
  device_type: string;
  zone: string;
  status: SensorStatus;
  battery_percent: number | null;
  last_value: string | null;
  last_seen_at: string | null;
  is_demo: boolean;
}

export interface SensorAlert {
  id: string;
  site_id: string;
  device_id: string | null;
  severity: "info" | "warning" | "critical";
  message: string;
  status: "open" | "acknowledged" | "resolved";
  created_at: string;
}

export interface HouseholdSensorSnapshot {
  sites: HouseholdSite[];
  gateways: SensorGateway[];
  devices: SensorDevice[];
  alerts: SensorAlert[];
  commands: GatewayCommand[];
}
