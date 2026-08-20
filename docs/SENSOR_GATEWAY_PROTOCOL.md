# AIJE Sensor Gateway Protocol v1

Physical household gateways enroll once, then authenticate every message with an Ed25519 signature. Private keys remain on the gateway; AIJE stores only the public key.

## Enrollment

1. A household owner opens **Household Sensor Hub > Connect physical gateway** and creates a claim code.
2. The code expires in 15 minutes and is single-use.
3. The gateway generates an Ed25519 key pair and sends `POST /functions/v1/sensor-gateway` with `x-aije-action: enroll`.

```json
{
  "claim_token": "one-time-code",
  "serial_number": "AIJE-HUB-0001",
  "public_key_spki": "base64-encoded-SPKI",
  "firmware_version": "1.0.0"
}
```

The response supplies `gateway_id` and `protocol_version`. The gateway securely persists its private key and gateway ID.

## Signed messages

Inventory, telemetry, command polling and acknowledgements use:

- `x-aije-action`: `inventory`, `telemetry`, `commands`, or `ack`
- `x-aije-gateway-id`: enrolled gateway UUID
- `x-aije-timestamp`: current Unix time in seconds
- `x-aije-nonce`: unique URL-safe value containing 16-96 characters
- `x-aije-signature`: base64 Ed25519 signature

Sign the UTF-8 bytes of `<timestamp>.<nonce>.<exact raw request body>`. Messages outside the five-minute clock window or with a previously used nonce are rejected. Bodies are limited to 256 KB.

## Device inventory

After enrollment, send a signed `inventory` message before telemetry. Hardware IDs must be stable within a gateway.

```json
{
  "devices": [
    {
      "hardware_id": "zigbee:front-door",
      "name": "Front Door",
      "device_type": "door",
      "zone": "Main entrance"
    }
  ]
}
```

The response maps each hardware ID to its AIJE device UUID. Gateways use those UUIDs in readings and alerts.

## Telemetry

```json
{
  "gateway": {
    "battery_percent": 92,
    "connection_type": "hybrid",
    "firmware_version": "1.0.0"
  },
  "readings": [
    {
      "device_id": "device-uuid",
      "reading_type": "contact",
      "text_value": "Closed",
      "status": "online",
      "battery_percent": 88
    }
  ],
  "alerts": []
}
```

Only devices registered to the authenticated gateway are accepted. A request may contain at most 100 readings and 50 alerts.

## Commands

Gateways poll with an empty JSON body and `x-aije-action: commands`. Supported v1 commands are `set_arm_mode`, `test_siren`, `restart`, and `sync_config`.

After execution, send `x-aije-action: ack` with `{"command_id":"command-uuid","status":"acknowledged"}`. Use `status: failed` and an `error` string when execution fails.
