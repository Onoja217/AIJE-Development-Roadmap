import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  loadPaystackSecretKey,
  logPaystackMode,
} from "../_shared/paystack-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { error: "Method not allowed" },
      405,
    );
  }

  try {
    const keyInfo = loadPaystackSecretKey();
    logPaystackMode("paystack-initialize", keyInfo);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("Missing Supabase server environment variables");

      return jsonResponse(
        { error: "Payment service is not configured correctly." },
        500,
      );
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(
        { error: "Authentication token is missing." },
        401,
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      console.error("Authentication failed:", userError?.message);

      return jsonResponse(
        { error: "Your session is invalid or expired. Please sign in again." },
        401,
      );
    }

    if (!user.email) {
      return jsonResponse(
        { error: "Your account does not have an email address." },
        422,
      );
    }

    let requestBody: {
      plan_id?: string;
      callback_url?: string;
    };

    try {
      requestBody = await req.json();
    } catch {
      return jsonResponse(
        { error: "Invalid JSON request body." },
        400,
      );
    }

    const planId = requestBody.plan_id?.trim();
    const callbackUrl = requestBody.callback_url?.trim();

    if (!planId) {
      return jsonResponse(
        { error: "plan_id is required." },
        422,
      );
    }

    if (callbackUrl) {
      try {
        const url = new URL(callbackUrl);

        if (!["http:", "https:"].includes(url.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        return jsonResponse(
          { error: "callback_url must be a valid HTTP or HTTPS URL." },
          422,
        );
      }
    }

    /*
     * Use a separate service-role client to read server-owned pricing.
     * Do not pass the user's Authorization header into this client.
     */
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: plan, error: planError } = await adminClient
      .from("plans")
      .select("id, code, name, price_ngn_kobo, is_custom")
      .eq("id", planId)
      .maybeSingle();

    if (planError) {
      console.error("Plan lookup failed:", planError);

      return jsonResponse(
        { error: "Unable to retrieve the selected plan." },
        500,
      );
    }

    if (!plan) {
      return jsonResponse(
        { error: "The selected plan was not found." },
        404,
      );
    }

    if (plan.is_custom) {
      return jsonResponse(
        { error: "This plan requires a custom quote. Please contact sales." },
        422,
      );
    }

    const amount = Number(plan.price_ngn_kobo);

    if (!Number.isInteger(amount) || amount <= 0) {
      console.error("Invalid plan price:", {
        planId: plan.id,
        storedAmount: plan.price_ngn_kobo,
      });

      return jsonResponse(
        { error: "The selected plan has an invalid payment amount." },
        500,
      );
    }

    const reference =
      `aije_${user.id.replaceAll("-", "").slice(0, 10)}_${Date.now()}`;

    const paystackPayload: Record<string, unknown> = {
      email: user.email,
      amount,
      currency: "NGN",
      reference,
      metadata: {
        user_id: user.id,
        plan_id: plan.id,
        plan_code: plan.code,
      },
    };

    if (callbackUrl) {
      paystackPayload.callback_url = callbackUrl;
    }

    console.info("Initializing Paystack transaction", {
      reference,
      userId: user.id,
      planId: plan.id,
      amount,
      mode: keyInfo.mode,
      hasCallbackUrl: Boolean(callbackUrl),
    });

    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${keyInfo.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paystackPayload),
      },
    );

    const paystackJson = await paystackResponse.json().catch(() => null);

    if (!paystackResponse.ok || !paystackJson?.status) {
      console.error("Paystack initialize rejected:", {
        httpStatus: paystackResponse.status,
        message: paystackJson?.message,
        type: paystackJson?.type,
        code: paystackJson?.code,
      });

      return jsonResponse(
        {
          error:
            paystackJson?.message ??
            "Paystack could not initialize the transaction.",
        },
        502,
      );
    }

    return jsonResponse({
      authorization_url: paystackJson.data.authorization_url,
      reference: paystackJson.data.reference,
      access_code: paystackJson.data.access_code,
      mode: keyInfo.mode,
    });
  } catch (error) {
    console.error("Unexpected initialize error:", error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected payment error occurred.",
      },
      500,
    );
  }
});