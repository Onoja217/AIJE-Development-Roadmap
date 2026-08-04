import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHmac } from "node:crypto";
import { processPaystackEvent } from "../_shared/paystack-handler.ts";
import { logJson, recordDelivery } from "../_shared/structured-log.ts";
import { loadPaystackSecretKey, logPaystackMode } from "../_shared/paystack-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const started = Date.now();
  let keyInfo;
  try {
    keyInfo = loadPaystackSecretKey();
    logPaystackMode("paystack-webhook", keyInfo);
  } catch (e) {
    logJson("error", "paystack.webhook.key_error", { error: (e as Error).message });
    return new Response("missing or invalid PAYSTACK_SECRET_KEY", { status: 500 });
  }
  const PAYSTACK_SECRET_KEY = keyInfo.key;

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const raw = await req.text();
  const sig = req.headers.get("x-paystack-signature") ?? "";
  const computed = createHmac("sha512", PAYSTACK_SECRET_KEY).update(raw).digest("hex");

  if (computed !== sig) {
    const latency = Date.now() - started;
    logJson("warn", "paystack.webhook.invalid_signature", { source: "paystack", latency_ms: latency });
    await admin.from("webhook_dead_letter").insert({
      source: "paystack",
      event_type: null,
      reference: null,
      payload: safeJson(raw),
      signature: sig,
      error: "invalid signature",
      status: "abandoned",
      attempts: 1,
      last_attempt_at: new Date().toISOString(),
    });
    await recordDelivery(admin, {
      source: "paystack",
      event_type: null,
      reference: null,
      attempt: 1,
      status: "invalid_signature",
      latency_ms: latency,
      error: "invalid signature",
    });
    return new Response("invalid signature", { status: 401 });
  }

  let evt: Record<string, unknown>;
  try {
    evt = JSON.parse(raw);
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  try {
    await processPaystackEvent(admin, evt);
    const latency = Date.now() - started;
    logJson("info", "paystack.webhook.delivered", {
      source: "paystack",
      event_type: evt?.event ?? null,
      reference: evt?.data?.reference ?? null,
      latency_ms: latency,
      status: "ok",
      attempt: 1,
    });
    await recordDelivery(admin, {
      source: "paystack",
      event_type: evt?.event ?? null,
      reference: evt?.data?.reference ?? null,
      attempt: 1,
      status: "ok",
      latency_ms: latency,
    });
    return new Response("ok", { headers: corsHeaders });
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    const latency = Date.now() - started;
    logJson("error", "paystack.webhook.error", {
      source: "paystack",
      event_type: evt?.event ?? null,
      reference: evt?.data?.reference ?? null,
      latency_ms: latency,
      status: "error",
      attempt: 1,
      error: msg,
    });

    const nextRetry = new Date(Date.now() + 60_000).toISOString();
    await admin.from("webhook_dead_letter").insert({
      source: "paystack",
      event_type: evt?.event ?? null,
      reference: evt?.data?.reference ?? null,
      payload: evt,
      signature: sig,
      error: msg,
      status: "pending",
      attempts: 1,
      last_attempt_at: new Date().toISOString(),
      next_retry_at: nextRetry,
    });
    await recordDelivery(admin, {
      source: "paystack",
      event_type: evt?.event ?? null,
      reference: evt?.data?.reference ?? null,
      attempt: 1,
      status: "error",
      latency_ms: latency,
      error: msg,
    });

    return new Response("queued for retry", { status: 500, headers: corsHeaders });
  }
});

function safeJson(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return { raw: s.slice(0, 4000) };
  }
}
