import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  loadPaystackSecretKey,
  logPaystackMode,
} from "../_shared/paystack-key.ts";
import { logJson } from "../_shared/structured-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-correlation-id",
};
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(
  body: Record<string, unknown>,
  status: number,
  correlationId: string,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json",
      "x-correlation-id": correlationId,
    },
  });
}

function allowedCallbackUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 500) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )
    )
      return null;
    const configured = (Deno.env.get("ALLOWED_CALLBACK_ORIGINS") ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
    const allowedOrigins = new Set([
      ...configured,
      "https://guardian-pulse-one.vercel.app",
      "http://localhost:8082",
      "http://127.0.0.1:8082",
    ]);
    return allowedOrigins.has(url.origin) ? url.toString() : null;
  } catch {
    return null;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  const correlationId =
    request.headers.get("x-correlation-id") ?? crypto.randomUUID();
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405, correlationId);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = request.headers.get("Authorization");
  if (!supabaseUrl || !anonKey)
    return json({ error: "Payment service unavailable" }, 500, correlationId);
  if (!authorization?.startsWith("Bearer "))
    return json({ error: "Authentication required" }, 401, correlationId);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user?.email)
    return json({ error: "Invalid or expired session" }, 401, correlationId);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, correlationId);
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return json({ error: "Invalid payment request" }, 422, correlationId);
  const input = body as Record<string, unknown>;
  const planId = typeof input.plan_id === "string" ? input.plan_id.trim() : "";
  if (!UUID_PATTERN.test(planId))
    return json({ error: "A valid plan_id is required" }, 422, correlationId);
  const callbackUrl = allowedCallbackUrl(input.callback_url);
  if (!callbackUrl)
    return json(
      { error: "callback_url origin is not allowed" },
      422,
      correlationId,
    );

  const { data: plan, error: planError } = await userClient
    .from("plans")
    .select("id, code, price_ngn_kobo, is_custom, active")
    .eq("id", planId)
    .eq("active", true)
    .maybeSingle();
  if (planError)
    return json({ error: "Unable to retrieve plan" }, 500, correlationId);
  if (!plan) return json({ error: "Plan not found" }, 404, correlationId);
  if (
    plan.is_custom ||
    !Number.isInteger(plan.price_ngn_kobo) ||
    plan.price_ngn_kobo <= 0
  ) {
    return json(
      { error: "This plan requires a custom quote" },
      422,
      correlationId,
    );
  }

  try {
    const keyInfo = loadPaystackSecretKey();
    logPaystackMode("paystack-initialize", keyInfo);
    const reference = `aije_${user.id.replaceAll("-", "").slice(0, 10)}_${Date.now()}`;
    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${keyInfo.key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amount: plan.price_ngn_kobo,
          currency: "NGN",
          reference,
          callback_url: callbackUrl,
          metadata: {
            user_id: user.id,
            plan_id: plan.id,
            plan_code: plan.code,
          },
        }),
      },
    );
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.status) {
      logJson("error", "paystack.initialize.rejected", {
        correlation_id: correlationId,
        status: response.status,
        reference,
      });
      return json(
        { error: "Payment provider rejected initialization" },
        502,
        correlationId,
      );
    }
    logJson("info", "paystack.initialize.created", {
      correlation_id: correlationId,
      user_id: user.id,
      plan_id: plan.id,
      reference,
    });
    return json(
      {
        authorization_url: result.data.authorization_url,
        reference: result.data.reference,
        access_code: result.data.access_code,
        mode: keyInfo.mode,
      },
      200,
      correlationId,
    );
  } catch (error) {
    logJson("error", "paystack.initialize.failed", {
      correlation_id: correlationId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return json({ error: "Unable to initialize payment" }, 500, correlationId);
  }
});
