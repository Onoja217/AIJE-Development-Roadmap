import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const body = await req.json();
    const { title, message, priority = "medium", channel = "sms", user_id } = body as Record<string, unknown>;
    if (!title || !message || !user_id) {
      return new Response(JSON.stringify({ error: "Missing required fields: title, message, user_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const insertPayload = {
      title: String(title),
      message: String(message),
      priority: String(priority),
      channel: String(channel),
      status: "pending",
      user_id: String(user_id),
    };

    const { error: insertError } = await admin.from("community_alerts").insert(insertPayload);
    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const providerUrl = Deno.env.get("SMS_GATEWAY_URL")?.trim();
    const providerKey = Deno.env.get("SMS_GATEWAY_KEY")?.trim();
    let sent = false;
    let providerResponse: string | null = null;

    if (providerUrl) {
      const smsPayload = {
        to: Deno.env.get("SMS_ALERT_RECIPIENTS") ?? "",
        message: `${insertPayload.title}: ${insertPayload.message}`,
        metadata: {
          priority: insertPayload.priority,
          channel: insertPayload.channel,
          source: "community-sms",
        },
      };

      const response = await fetch(providerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(providerKey ? { Authorization: `Bearer ${providerKey}` } : {}),
        },
        body: JSON.stringify(smsPayload),
      });

      providerResponse = await response.text();
      if (response.ok) {
        sent = true;
      }
    }

    return new Response(JSON.stringify({ status: "queued", sent, providerResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
