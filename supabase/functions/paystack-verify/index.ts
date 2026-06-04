import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) throw new Error("Not authenticated");

    const admin = createClient(supabaseUrl, serviceKey);

    const { reference } = await req.json();
    if (!reference) throw new Error("reference required");

    const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const j = await r.json();
    if (!j.status || j.data.status !== "success") {
      return new Response(JSON.stringify({ success: false, status: j.data?.status ?? "failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const meta = j.data.metadata ?? {};
    const planId = meta.plan_id;
    const userId = meta.user_id ?? userData.user.id;
    const customerCode = j.data.customer?.customer_code;
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);

    await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        plan_id: planId,
        status: "active",
        paystack_customer_code: customerCode,
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
      },
      { onConflict: "user_id" },
    );

    await admin.from("payment_events").insert({
      user_id: userId,
      event_type: "verify.success",
      reference,
      payload: j.data,
    });

    return new Response(JSON.stringify({ success: true, plan_id: planId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
