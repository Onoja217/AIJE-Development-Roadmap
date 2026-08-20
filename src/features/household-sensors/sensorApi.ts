import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type {
  ArmMode,
  GatewayCommand,
  GatewayEnrollment,
  HouseholdSensorSnapshot,
  HouseholdSite,
  SensorAlert,
  SensorDevice,
  SensorGateway,
} from "./types";

const client = supabase as unknown as SupabaseClient;

export async function fetchHouseholdSensors(
  organizationId: string,
): Promise<HouseholdSensorSnapshot> {
  const [
    sitesResult,
    gatewaysResult,
    devicesResult,
    alertsResult,
    commandsResult,
  ] = await Promise.all([
    client
      .from("sites")
      .select("id,name,address")
      .eq("organization_id", organizationId)
      .order("name"),
    client
      .from("sensor_gateways")
      .select(
        "id,site_id,name,status,arm_mode,battery_percent,connection_type,last_seen_at,is_demo",
      )
      .eq("organization_id", organizationId),
    client
      .from("sensor_devices")
      .select(
        "id,site_id,name,device_type,zone,status,battery_percent,last_value,last_seen_at,is_demo",
      )
      .eq("organization_id", organizationId)
      .order("name"),
    client
      .from("sensor_alerts")
      .select("id,site_id,device_id,severity,message,status,created_at")
      .eq("organization_id", organizationId)
      .neq("status", "resolved")
      .order("created_at", { ascending: false })
      .limit(20),
    client
      .from("sensor_gateway_commands")
      .select("id,gateway_id,command_type,status,error,created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const failure = [
    sitesResult,
    gatewaysResult,
    devicesResult,
    alertsResult,
    commandsResult,
  ].find((result) => result.error);
  if (failure?.error) throw failure.error;

  return {
    sites: (sitesResult.data ?? []) as HouseholdSite[],
    gateways: (gatewaysResult.data ?? []) as SensorGateway[],
    devices: (devicesResult.data ?? []) as SensorDevice[],
    alerts: (alertsResult.data ?? []) as SensorAlert[],
    commands: (commandsResult.data ?? []) as GatewayCommand[],
  };
}

export async function createGatewayEnrollment(input: {
  organizationId: string;
  siteId: string;
  gatewayName: string;
}): Promise<GatewayEnrollment> {
  const { data, error } = await client.rpc("create_sensor_gateway_enrollment", {
    _organization_id: input.organizationId,
    _site_id: input.siteId,
    _gateway_name: input.gatewayName,
  });
  if (error) throw error;
  return data as GatewayEnrollment;
}

export async function queueGatewayCommand(input: {
  organizationId: string;
  siteId: string;
  gatewayId: string;
  commandType: "set_arm_mode" | "test_siren" | "restart" | "sync_config";
  payload?: Record<string, string | number | boolean>;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await client.from("sensor_gateway_commands").insert({
    organization_id: input.organizationId,
    site_id: input.siteId,
    gateway_id: input.gatewayId,
    command_type: input.commandType,
    payload: input.payload ?? {},
    created_by: user?.id ?? null,
  });
  if (error) throw error;
}

export async function setGatewayArmMode(gatewayId: string, armMode: ArmMode) {
  const { error } = await client
    .from("sensor_gateways")
    .update({ arm_mode: armMode })
    .eq("id", gatewayId);
  if (error) throw error;
}

export async function acknowledgeSensorAlert(alertId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await client
    .from("sensor_alerts")
    .update({
      status: "acknowledged",
      acknowledged_by: user?.id ?? null,
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", alertId);
  if (error) throw error;
}

const DEMO_DEVICES = [
  ["Front Door", "door", "Main entrance", "Closed"],
  ["Living Room Motion", "motion", "Living room", "Clear"],
  ["Kitchen Smoke", "smoke", "Kitchen", "Normal"],
  ["Kitchen LPG", "gas", "Kitchen", "Normal"],
  ["Utility Water Leak", "water", "Utility area", "Dry"],
  ["Mains Power", "power", "Electrical panel", "Power on"],
  ["Indoor Siren", "siren", "Hallway", "Ready"],
  ["Panic Button", "panic", "Main bedroom", "Ready"],
] as const;

export async function installDemoSensorPackage(input: {
  organizationId: string;
  siteId: string;
}) {
  const demoId = crypto.randomUUID();
  const now = new Date().toISOString();
  const { data: gateway, error: gatewayError } = await client
    .from("sensor_gateways")
    .insert({
      organization_id: input.organizationId,
      site_id: input.siteId,
      name: "AIJE Home Gateway (Demo)",
      serial_number: `DEMO-${demoId}`,
      connection_type: "demo",
      status: "online",
      arm_mode: "home",
      battery_percent: 100,
      last_seen_at: now,
      is_demo: true,
    })
    .select("id")
    .single();
  if (gatewayError) throw gatewayError;

  const { error: devicesError } = await client.from("sensor_devices").insert(
    DEMO_DEVICES.map(([name, deviceType, zone, lastValue]) => ({
      organization_id: input.organizationId,
      site_id: input.siteId,
      gateway_id: gateway.id,
      name,
      device_type: deviceType,
      zone,
      status: "online",
      battery_percent: 100,
      last_value: lastValue,
      last_seen_at: now,
      is_demo: true,
    })),
  );
  if (devicesError) throw devicesError;
}
