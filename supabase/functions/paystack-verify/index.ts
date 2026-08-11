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
const REFERENCE_PATTERN = /^aije_[a-z0-9_]{8,80}$/i;

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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  const correlationId =
    request.headers.get("x-correlation-id") ?? crypto.randomUUID();
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405, correlationId);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");
  if (!supabaseUrl || !anonKey || !serviceRoleKey)
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
  if (authError || !user)
    return json({ error: "Invalid or expired session" }, 401, correlationId);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, correlationId);
  }
  const reference =
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    typeof (body as Record<string, unknown>).reference === "string"
      ? ((body as Record<string, unknown>).reference as string).trim()
      : "";
  if (!REFERENCE_PATTERN.test(reference))
    return json(
      { error: "A valid payment reference is required" },
      422,
      correlationId,
    );

  try {
    const keyInfo = loadPaystackSecretKey();
    logPaystackMode("paystack-verify", keyInfo);
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${keyInfo.key}` } },
    );
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.status || result.data?.status !== "success") {
      logJson("warn", "paystack.verify.rejected", {
        correlation_id: correlationId,
        reference,
        status: response.status,
      });
      return json(
        { success: false, error: "Payment is not successful" },
        409,
        correlationId,
      );
    }

    const transaction = result.data as Record<string, unknown>;
    const metadata =
      transaction.metadata &&
      typeof transaction.metadata === "object" &&
      !Array.isArray(transaction.metadata)
        ? (transaction.metadata as Record<string, unknown>)
        : {};
    const planId = typeof metadata.plan_id === "string" ? metadata.plan_id : "";
    if (metadata.user_id !== user.id)
      return json(
        { error: "Payment does not belong to this account" },
        403,
        correlationId,
      );

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: plan, error: planError } = await admin
      .from("plans")
      .select("id, price_ngn_kobo, active")
      .eq("id", planId)
      .eq("active", true)
      .maybeSingle();
    if (planError)
      return json(
        { error: "Unable to validate payment plan" },
        500,
        correlationId,
      );
    if (!plan)
      return json(
        { error: "Payment plan no longer exists" },
        409,
        correlationId,
      );
    if (
      transaction.currency !== "NGN" ||
      transaction.amount !== plan.price_ngn_kobo
    ) {
      logJson("error", "paystack.verify.amount_mismatch", {
        correlation_id: correlationId,
        user_id: user.id,
        plan_id: plan.id,
        reference,
      });
      return json(
        { error: "Payment amount does not match the selected plan" },
        409,
        correlationId,
      );
    }

    const eventId =
      transaction.id === undefined ? null : String(transaction.id);
    if (eventId) {
      const { data: existing } = await admin
        .from("payment_events")
        .select("id")
        .eq("paystack_event_id", eventId)
        .maybeSingle();
      if (existing)
        return json(
          { success: true, duplicate: true, reference },
          200,
          correlationId,
        );
    }

    const periodEnd = new Date();
    periodEnd.setUTCDate(periodEnd.getUTCDate() + 30);
    const customer =
      transaction.customer &&
      typeof transaction.customer === "object" &&
      !Array.isArray(transaction.customer)
        ? (transaction.customer as Record<string, unknown>)
        : {};
    const { error: subscriptionError } = await admin
      .from("subscriptions")
      .upsert(
        {
          user_id: user.id,
          plan_id: plan.id,
          status: "active",
          paystack_customer_code:
            typeof customer.customer_code === "string"
              ? customer.customer_code
              : null,
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
        },
        { onConflict: "user_id" },
      );
    if (subscriptionError)
      throw new Error(
        `Subscription update failed: ${subscriptionError.message}`,
      );

    const { error: eventError } = await admin.from("payment_events").insert({
      user_id: user.id,
      event_type: "charge.success.verified",
      reference,
      paystack_event_id: eventId,
      payload: {
        id: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        plan_id: plan.id,
      },
    });
    if (eventError?.code !== "23505" && eventError)
      throw new Error(`Payment event insert failed: ${eventError.message}`);

    logJson("info", "paystack.verify.completed", {
      correlation_id: correlationId,
      user_id: user.id,
      plan_id: plan.id,
      reference,
    });
    return json(
      { success: true, reference, plan_id: plan.id },
      200,
      correlationId,
    );
  } catch (error) {
    logJson("error", "paystack.verify.failed", {
      correlation_id: correlationId,
      reference,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return json({ error: "Unable to verify payment" }, 500, correlationId);
  }
});
