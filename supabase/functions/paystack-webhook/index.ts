import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { processPaystackEvent } from "../_shared/paystack-handler.ts";
import { logJson, recordDelivery } from "../_shared/structured-log.ts";
import {
  loadPaystackSecretKey,
  logPaystackMode,
} from "../_shared/paystack-key.ts";
import {
  isValidPaystackSignature,
  MAX_PAYSTACK_WEBHOOK_BYTES,
} from "../_shared/paystack-signature.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")
    return new Response("method not allowed", {
      status: 405,
      headers: { ...corsHeaders, Allow: "POST" },
    });

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_PAYSTACK_WEBHOOK_BYTES)
    return new Response("request too large", {
      status: 413,
      headers: corsHeaders,
    });

  const started = Date.now();
  let keyInfo;
  try {
    keyInfo = loadPaystackSecretKey();
    logPaystackMode("paystack-webhook", keyInfo);
  } catch (e) {
    logJson("error", "paystack.webhook.key_error", {
      error: (e as Error).message,
    });
    return new Response("missing or invalid PAYSTACK_SECRET_KEY", {
      status: 500,
    });
  }
  const PAYSTACK_SECRET_KEY = keyInfo.key;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_PAYSTACK_WEBHOOK_BYTES)
    return new Response("request too large", {
      status: 413,
      headers: corsHeaders,
    });
  const sig = req.headers.get("x-paystack-signature") ?? "";
  const signatureValid = isValidPaystackSignature(
    raw,
    sig,
    PAYSTACK_SECRET_KEY,
  );
  if (!signatureValid) {
    const latency = Date.now() - started;
    logJson("warn", "paystack.webhook.invalid_signature", {
      source: "paystack",
      latency_ms: latency,
    });
    return new Response("invalid signature", { status: 401 });
  }

  let evt: unknown;
  try {
    evt = JSON.parse(raw);
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  if (
    !evt ||
    typeof evt !== "object" ||
    !("event" in evt) ||
    typeof evt.event !== "string"
  ) {
    return new Response("invalid event", { status: 400, headers: corsHeaders });
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
      signature: null,
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

    return new Response("queued for retry", {
      status: 500,
      headers: corsHeaders,
    });
  }
});
