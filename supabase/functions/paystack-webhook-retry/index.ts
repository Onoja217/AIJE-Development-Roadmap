// Scheduled worker that drains the webhook_dead_letter queue with exponential backoff.
// Invoked every 5 minutes by pg_cron. Safe to call manually too.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { processPaystackEvent } from "../_shared/paystack-handler.ts";
import { logJson, recordDelivery } from "../_shared/structured-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BACKOFF_MINUTES = [1, 5, 15, 60, 240, 720]; // 1m, 5m, 15m, 1h, 4h, 12h

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const runStarted = Date.now();
  const { data: rows, error } = await admin
    .from("webhook_dead_letter")
    .select("*")
    .eq("source", "paystack")
    .eq("status", "pending")
    .lte("next_retry_at", new Date().toISOString())
    .order("next_retry_at", { ascending: true })
    .limit(25);

  if (error) {
    logJson("error", "paystack.retry.fetch_failed", { error: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results = { processed: 0, resolved: 0, requeued: 0, abandoned: 0 };

  for (const row of rows ?? []) {
    results.processed++;
    const attemptStarted = Date.now();
    const attempt = row.attempts + 1;
    try {
      await processPaystackEvent(admin, row.payload);
      const latency = Date.now() - attemptStarted;
      await admin
        .from("webhook_dead_letter")
        .update({
          status: "resolved",
          attempts: attempt,
          last_attempt_at: new Date().toISOString(),
          error: null,
        })
        .eq("id", row.id);
      logJson("info", "paystack.retry.resolved", {
        dead_letter_id: row.id,
        event_type: row.event_type,
        reference: row.reference,
        attempt,
        latency_ms: latency,
      });
      await recordDelivery(admin, {
        source: "paystack",
        event_type: row.event_type,
        reference: row.reference,
        attempt,
        status: "ok",
        latency_ms: latency,
      });
      results.resolved++;
    } catch (e) {
      const latency = Date.now() - attemptStarted;
      const msg = (e as Error).message ?? String(e);
      if (attempt >= row.max_attempts) {
        await admin
          .from("webhook_dead_letter")
          .update({
            status: "abandoned",
            attempts: attempt,
            last_attempt_at: new Date().toISOString(),
            error: msg,
          })
          .eq("id", row.id);
        logJson("error", "paystack.retry.abandoned", {
          dead_letter_id: row.id,
          event_type: row.event_type,
          reference: row.reference,
          attempt,
          latency_ms: latency,
          error: msg,
        });
        await recordDelivery(admin, {
          source: "paystack",
          event_type: row.event_type,
          reference: row.reference,
          attempt,
          status: "abandoned",
          latency_ms: latency,
          error: msg,
        });
        results.abandoned++;
      } else {
        const idx = Math.min(attempt - 1, BACKOFF_MINUTES.length - 1);
        const next = new Date(Date.now() + BACKOFF_MINUTES[idx] * 60_000).toISOString();
        await admin
          .from("webhook_dead_letter")
          .update({
            attempts: attempt,
            last_attempt_at: new Date().toISOString(),
            next_retry_at: next,
            error: msg,
          })
          .eq("id", row.id);
        logJson("warn", "paystack.retry.requeued", {
          dead_letter_id: row.id,
          event_type: row.event_type,
          reference: row.reference,
          attempt,
          latency_ms: latency,
          next_retry_at: next,
          error: msg,
        });
        await recordDelivery(admin, {
          source: "paystack",
          event_type: row.event_type,
          reference: row.reference,
          attempt,
          status: "error",
          latency_ms: latency,
          error: msg,
        });
        results.requeued++;
      }
    }
  }

  logJson("info", "paystack.retry.run", {
    ...results,
    run_latency_ms: Date.now() - runStarted,
  });

  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
