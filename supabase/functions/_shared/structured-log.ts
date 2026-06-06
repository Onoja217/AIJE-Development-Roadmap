// Structured JSON logger + delivery recorder shared across Paystack webhook functions.
// Console output is JSON so it's grep-friendly in Supabase logs and ingestible by
// Grafana Loki / Datadog / any log aggregator. Delivery rows feed the in-app dashboard.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type DeliveryStatus = "ok" | "error" | "abandoned" | "invalid_signature";

export interface DeliveryRecord {
  source: string;
  event_type: string | null;
  reference: string | null;
  attempt: number;
  status: DeliveryStatus;
  latency_ms: number;
  error?: string | null;
}

export function logJson(level: "info" | "warn" | "error", msg: string, fields: Record<string, unknown>) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export async function recordDelivery(admin: SupabaseClient, rec: DeliveryRecord) {
  const { error } = await admin.from("webhook_deliveries").insert(rec);
  if (error) {
    // Never let metrics failure break the actual handler — just log it.
    logJson("warn", "webhook_deliveries insert failed", { error: error.message, rec });
  }
}
