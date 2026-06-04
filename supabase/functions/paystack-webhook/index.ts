import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!PAYSTACK_SECRET_KEY) return new Response("missing secret", { status: 500 });

  const raw = await req.text();
  const sig = req.headers.get("x-paystack-signature") ?? "";
  const computed = createHmac("sha512", PAYSTACK_SECRET_KEY).update(raw).digest("hex");
  if (computed !== sig) return new Response("invalid signature", { status: 401 });

  const evt = JSON.parse(raw);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const meta = evt?.data?.metadata ?? {};
  const userId = meta.user_id;
  const planId = meta.plan_id;

  try {
    if (evt.event === "charge.success" && userId && planId) {
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30);
      await admin.from("subscriptions").upsert(
        {
          user_id: userId,
          plan_id: planId,
          status: "active",
          paystack_customer_code: evt.data?.customer?.customer_code,
          current_period_end: periodEnd.toISOString(),
        },
        { onConflict: "user_id" },
      );
    } else if (evt.event === "subscription.disable" || evt.event === "subscription.not_renew") {
      const code = evt.data?.subscription_code;
      if (code) {
        await admin
          .from("subscriptions")
          .update({ status: "canceled", cancel_at_period_end: true })
          .eq("paystack_subscription_code", code);
      }
    } else if (evt.event === "invoice.payment_failed") {
      if (userId) await admin.from("subscriptions").update({ status: "past_due" }).eq("user_id", userId);
    }

    await admin.from("payment_events").insert({
      user_id: userId ?? null,
      event_type: evt.event,
      reference: evt.data?.reference ?? null,
      paystack_event_id: evt.data?.id ? String(evt.data.id) : null,
      payload: evt,
    });
  } catch (e) {
    console.error("webhook handler error", e);
  }

  return new Response("ok", { headers: corsHeaders });
});
