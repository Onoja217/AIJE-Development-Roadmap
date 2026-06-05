// Scheduled worker that drains the webhook_dead_letter queue with exponential backoff.
// Invoked every 5 minutes by pg_cron. Safe to call manually too.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { processPaystackEvent } from "../_shared/paystack-handler.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BACKOFF_MINUTES = [1, 5, 15, 60, 240, 720]; // 1m, 5m, 15m, 1h, 4h, 12h

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: rows, error } = await admin
    .from("webhook_dead_letter")
    .select("*")
    .eq("source", "paystack")
    .eq("status", "pending")
    .lte("next_retry_at", new Date().toISOString())
    .order("next_retry_at", { ascending: true })
    .limit(25);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results = { processed: 0, resolved: 0, requeued: 0, abandoned: 0 };

  for (const row of rows ?? []) {
    results.processed++;
    try {
      await processPaystackEvent(admin, row.payload);
      await admin
        .from("webhook_dead_letter")
        .update({
          status: "resolved",
          attempts: row.attempts + 1,
          last_attempt_at: new Date().toISOString(),
          error: null,
        })
        .eq("id", row.id);
      results.resolved++;
    } catch (e) {
      const attempts = row.attempts + 1;
      const msg = (e as Error).message ?? String(e);
      if (attempts >= row.max_attempts) {
        await admin
          .from("webhook_dead_letter")
          .update({
            status: "abandoned",
            attempts,
            last_attempt_at: new Date().toISOString(),
            error: msg,
          })
          .eq("id", row.id);
        results.abandoned++;
        console.error("paystack dead-letter ABANDONED", row.id, msg);
      } else {
        const idx = Math.min(attempts - 1, BACKOFF_MINUTES.length - 1);
        const next = new Date(Date.now() + BACKOFF_MINUTES[idx] * 60_000).toISOString();
        await admin
          .from("webhook_dead_letter")
          .update({
            attempts,
            last_attempt_at: new Date().toISOString(),
            next_retry_at: next,
            error: msg,
          })
          .eq("id", row.id);
        results.requeued++;
      }
    }
  }

  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
