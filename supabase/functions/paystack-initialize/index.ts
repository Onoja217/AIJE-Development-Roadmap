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
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;

    const body = await req.json();
    const { plan_id, callback_url } = body;
    if (!plan_id) throw new Error("plan_id required");

    const { data: plan, error: planErr } = await supabase
      .from("plans")
      .select("*")
      .eq("id", plan_id)
      .single();
    if (planErr || !plan) throw new Error("Plan not found");
    if (plan.is_custom || plan.price_ngn_kobo <= 0) {
      throw new Error("This plan requires a custom quote — contact sales.");
    }

    const reference = `aegis_${user.id.slice(0, 8)}_${Date.now()}`;

    const ps = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: plan.price_ngn_kobo,
        currency: "NGN",
        reference,
        callback_url,
        metadata: {
          user_id: user.id,
          plan_id: plan.id,
          plan_code: plan.code,
        },
      }),
    });
    const psJson = await ps.json();
    if (!psJson.status) throw new Error(psJson.message || "Paystack init failed");

    return new Response(
      JSON.stringify({
        authorization_url: psJson.data.authorization_url,
        reference: psJson.data.reference,
        access_code: psJson.data.access_code,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
