import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHmac } from "node:crypto";
import { processPaystackEvent } from "../_shared/paystack-handler.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!PAYSTACK_SECRET_KEY) return new Response("missing secret", { status: 500 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const raw = await req.text();
  const sig = req.headers.get("x-paystack-signature") ?? "";
  const computed = createHmac("sha512", PAYSTACK_SECRET_KEY).update(raw).digest("hex");

  if (computed !== sig) {
    // Log rejected delivery so we can audit suspicious traffic, but don't retry.
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
    return new Response("invalid signature", { status: 401 });
  }

  let evt: any;
  try {
    evt = JSON.parse(raw);
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  try {
    await processPaystackEvent(admin, evt);
    return new Response("ok", { headers: corsHeaders });
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    console.error("paystack-webhook handler error:", msg);

    // Dead-letter so the retry worker can take another swing even if Paystack stops retrying.
    const nextRetry = new Date(Date.now() + 60_000).toISOString(); // first retry in 1 min
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

    // Return 500 so Paystack also retries on its own schedule.
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
