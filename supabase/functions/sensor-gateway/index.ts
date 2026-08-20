import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  MAX_GATEWAY_MESSAGE_BYTES,
  isValidGatewayPublicKey,
  validateGatewayHeaders,
  verifyGatewaySignature,
} from "../_shared/gateway-protocol.ts";
import { logJson } from "../_shared/structured-log.ts";

type JsonRecord = Record<string, unknown>;

const jsonHeaders = { "Content-Type": "application/json" };
const allowedDeviceStatuses = new Set([
  "online",
  "offline",
  "warning",
  "alert",
  "tampered",
]);
const allowedSeverities = new Set(["info", "warning", "critical"]);
const allowedDeviceTypes = new Set([
  "door",
  "motion",
  "smoke",
  "gas",
  "water",
  "panic",
  "siren",
  "power",
  "camera",
  "environment",
]);
const allowedConnections = new Set(["wifi", "ethernet", "cellular", "hybrid"]);
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(status: number, body: JsonRecord) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.length <= maxLength ? value : null;
}

Deno.serve(async (request) => {
  if (request.method !== "POST")
    return json(405, { error: "method not allowed" });

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_GATEWAY_MESSAGE_BYTES)
    return json(413, { error: "request too large" });

  const rawBody = await request.text();
  if (
    new TextEncoder().encode(rawBody).byteLength > MAX_GATEWAY_MESSAGE_BYTES
  ) {
    return json(413, { error: "request too large" });
  }

  let body: JsonRecord;
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (!isRecord(parsed)) throw new Error("object required");
    body = parsed;
  } catch {
    return json(400, { error: "invalid JSON" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey)
    return json(503, { error: "gateway service unavailable" });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const action = request.headers.get("x-aije-action") ?? "telemetry";
  if (action === "enroll") {
    const claimToken = safeText(body.claim_token, 128);
    const serialNumber = safeText(body.serial_number, 120);
    const publicKeySpki = safeText(body.public_key_spki, 1024);
    const firmwareVersion = safeText(body.firmware_version, 80);
    if (!claimToken || !serialNumber || !publicKeySpki) {
      return json(400, {
        error: "claim_token, serial_number and public_key_spki are required",
      });
    }
    if (!(await isValidGatewayPublicKey(publicKeySpki))) {
      return json(400, { error: "invalid Ed25519 public key" });
    }
    const { data, error } = await admin.rpc(
      "consume_sensor_gateway_enrollment",
      {
        _claim_token: claimToken,
        _serial_number: serialNumber,
        _public_key_spki: publicKeySpki,
        _firmware_version: firmwareVersion,
      },
    );
    if (error) {
      logJson("warn", "sensor.gateway.enrollment_rejected", {
        reason: error.message,
      });
      return json(401, { error: "invalid or expired enrollment" });
    }
    logJson("info", "sensor.gateway.enrolled", {
      gateway_id: data?.gateway_id,
    });
    return json(201, { enrollment: data });
  }

  const gatewayId = request.headers.get("x-aije-gateway-id") ?? "";
  const timestamp = request.headers.get("x-aije-timestamp") ?? "";
  const nonce = request.headers.get("x-aije-nonce") ?? "";
  const signature = request.headers.get("x-aije-signature") ?? "";
  const headers = validateGatewayHeaders({ gatewayId, timestamp, nonce });
  if (!headers.valid) return json(401, { error: headers.reason });

  const { data: gateway, error: gatewayError } = await admin
    .from("sensor_gateways")
    .select("id,organization_id,site_id,public_key_spki,is_demo")
    .eq("id", gatewayId)
    .single();
  if (gatewayError || !gateway || gateway.is_demo || !gateway.public_key_spki) {
    return json(401, { error: "unknown physical gateway" });
  }

  const signatureValid = await verifyGatewaySignature({
    publicKeySpki: gateway.public_key_spki,
    signature,
    timestamp,
    nonce,
    rawBody,
  });
  if (!signatureValid) {
    logJson("warn", "sensor.gateway.invalid_signature", {
      gateway_id: gatewayId,
    });
    return json(401, { error: "invalid signature" });
  }

  if (action !== "telemetry") {
    const { error: replayError } = await admin
      .from("sensor_gateway_messages")
      .insert({
        gateway_id: gatewayId,
        nonce,
        sent_at: headers.sentAt.toISOString(),
      });
    if (replayError?.code === "23505")
      return json(409, { error: "message already processed" });
    if (replayError)
      return json(503, { error: "replay protection unavailable" });
  }

  if (action === "commands") {
    const { data: commands, error } = await admin
      .from("sensor_gateway_commands")
      .select("id,command_type,payload,created_at,expires_at")
      .eq("gateway_id", gatewayId)
      .eq("status", "queued")
      .gt("expires_at", new Date().toISOString())
      .order("created_at")
      .limit(20);
    if (error) return json(500, { error: "could not load commands" });
    const commandIds = (commands ?? []).map((command) => command.id);
    if (commandIds.length > 0) {
      await admin
        .from("sensor_gateway_commands")
        .update({ status: "delivered", delivered_at: new Date().toISOString() })
        .in("id", commandIds)
        .eq("status", "queued");
    }
    return json(200, { commands: commands ?? [] });
  }

  if (action === "ack") {
    const commandId = safeText(body.command_id, 64);
    const commandStatus =
      body.status === "acknowledged"
        ? "acknowledged"
        : body.status === "failed"
          ? "failed"
          : null;
    if (!commandId || !uuidPattern.test(commandId) || !commandStatus)
      return json(400, { error: "invalid command acknowledgement" });
    const { error } = await admin.rpc("ack_sensor_gateway_command", {
      _gateway_id: gatewayId,
      _command_id: commandId,
      _status: commandStatus,
      _error: commandStatus === "failed" ? safeText(body.error, 500) : null,
    });
    if (error?.message.includes("Command not found"))
      return json(404, { error: "command not found" });
    if (error) return json(500, { error: "could not acknowledge command" });
    return json(200, { acknowledged: true });
  }

  if (action === "inventory") {
    const inventory = Array.isArray(body.devices) ? body.devices : [];
    if (inventory.length === 0 || inventory.length > 100) {
      return json(400, { error: "inventory must contain 1 to 100 devices" });
    }
    const devices: JsonRecord[] = [];
    for (const value of inventory) {
      if (!isRecord(value))
        return json(400, { error: "invalid inventory device" });
      const hardwareId = safeText(value.hardware_id, 120);
      const name = safeText(value.name, 120);
      const deviceType = safeText(value.device_type, 40);
      const zone = safeText(value.zone, 120);
      if (
        !hardwareId ||
        !/^[A-Za-z0-9._:-]{2,120}$/.test(hardwareId) ||
        !name ||
        !deviceType ||
        !allowedDeviceTypes.has(deviceType)
      ) {
        return json(400, { error: "invalid inventory device" });
      }
      devices.push({
        organization_id: gateway.organization_id,
        site_id: gateway.site_id,
        gateway_id: gatewayId,
        hardware_id: hardwareId,
        name,
        device_type: deviceType,
        zone: zone ?? "Unassigned",
        status: "online",
        last_seen_at: new Date().toISOString(),
        is_demo: false,
      });
    }
    const { data, error } = await admin
      .from("sensor_devices")
      .upsert(devices, { onConflict: "gateway_id,hardware_id" })
      .select("id,hardware_id,name,device_type,zone");
    if (error) return json(500, { error: "inventory could not be stored" });
    return json(200, { devices: data });
  }

  if (action !== "telemetry") return json(400, { error: "unsupported action" });

  const gatewayStatus = isRecord(body.gateway) ? body.gateway : {};
  const batteryPercent =
    typeof gatewayStatus.battery_percent === "number"
      ? gatewayStatus.battery_percent
      : null;
  if (batteryPercent !== null && (batteryPercent < 0 || batteryPercent > 100)) {
    return json(400, { error: "invalid gateway battery" });
  }
  const connectionType = safeText(gatewayStatus.connection_type, 20);
  if (connectionType && !allowedConnections.has(connectionType)) {
    return json(400, { error: "invalid gateway connection type" });
  }
  const readings = Array.isArray(body.readings) ? body.readings : [];
  const alerts = Array.isArray(body.alerts) ? body.alerts : [];
  if (readings.length > 100 || alerts.length > 50)
    return json(400, { error: "too many telemetry records" });

  const { data: registeredDevices } = await admin
    .from("sensor_devices")
    .select("id")
    .eq("gateway_id", gatewayId);
  const registeredIds = new Set(
    (registeredDevices ?? []).map((device) => device.id),
  );
  const normalizedReadings: JsonRecord[] = [];
  const deviceUpdates: Array<{ id: string; update: JsonRecord }> = [];
  for (const value of readings) {
    if (
      !isRecord(value) ||
      typeof value.device_id !== "string" ||
      !registeredIds.has(value.device_id)
    ) {
      return json(400, { error: "reading references an unknown device" });
    }
    const readingType = safeText(value.reading_type, 80);
    const status = safeText(value.status, 20);
    if (!readingType || !status || !allowedDeviceStatuses.has(status))
      return json(400, { error: "invalid reading" });
    const deviceBattery =
      typeof value.battery_percent === "number" ? value.battery_percent : null;
    if (deviceBattery !== null && (deviceBattery < 0 || deviceBattery > 100))
      return json(400, { error: "invalid device battery" });
    normalizedReadings.push({
      organization_id: gateway.organization_id,
      site_id: gateway.site_id,
      device_id: value.device_id,
      reading_type: readingType,
      value:
        typeof value.value === "number" && Number.isFinite(value.value)
          ? value.value
          : null,
      text_value: safeText(value.text_value, 200),
      unit: safeText(value.unit, 32),
      recorded_at: headers.sentAt.toISOString(),
    });
    deviceUpdates.push({
      id: value.device_id,
      update: {
        status,
        battery_percent: deviceBattery,
        last_value:
          safeText(value.text_value, 200) ??
          (typeof value.value === "number" ? String(value.value) : null),
        last_seen_at: new Date().toISOString(),
      },
    });
  }

  const normalizedAlerts: JsonRecord[] = [];
  for (const value of alerts) {
    if (!isRecord(value)) return json(400, { error: "invalid alert" });
    const deviceId =
      typeof value.device_id === "string" ? value.device_id : null;
    const alertType = safeText(value.alert_type, 80);
    const severity = safeText(value.severity, 20);
    const message = safeText(value.message, 500);
    if (
      (deviceId && !registeredIds.has(deviceId)) ||
      !alertType ||
      !severity ||
      !allowedSeverities.has(severity) ||
      !message
    ) {
      return json(400, { error: "invalid alert" });
    }
    normalizedAlerts.push({
      organization_id: gateway.organization_id,
      site_id: gateway.site_id,
      device_id: deviceId,
      alert_type: alertType,
      severity,
      message,
    });
  }

  const now = new Date().toISOString();
  const transactionalReadings = normalizedReadings.map((reading, index) => ({
    ...reading,
    status: deviceUpdates[index].update.status,
    battery_percent: deviceUpdates[index].update.battery_percent,
    last_value: deviceUpdates[index].update.last_value,
  }));
  const { error: telemetryError } = await admin.rpc(
    "ingest_sensor_gateway_telemetry",
    {
      _gateway_id: gatewayId,
      _nonce: nonce,
      _sent_at: headers.sentAt.toISOString(),
      _gateway_status: {
        battery_percent: batteryPercent,
        firmware_version: safeText(gatewayStatus.firmware_version, 80),
        connection_type: connectionType ?? "hybrid",
      },
      _readings: transactionalReadings,
      _alerts: normalizedAlerts,
    },
  );
  if (telemetryError) {
    if (telemetryError.code === "23505")
      return json(409, { error: "message already processed" });
    logJson("error", "sensor.gateway.telemetry_failed", {
      gateway_id: gatewayId,
    });
    return json(500, { error: "telemetry could not be stored" });
  }

  logJson("info", "sensor.gateway.telemetry_accepted", {
    gateway_id: gatewayId,
    readings: normalizedReadings.length,
    alerts: normalizedAlerts.length,
  });
  return json(202, { accepted: true, received_at: now });
});
