// Scheduled monitor: for every user with alert settings, checks
// (1) pending dead-letter count and (2) p95 latency over the window,
// and inserts a webhook_alerts row when thresholds are crossed.
// A cooldown prevents alert spam.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: settings, error: sErr } = await admin
    .from("webhook_alert_settings")
    .select("*")
    .eq("enabled", true);

  if (sErr) {
    console.error(JSON.stringify({ msg: "monitor.settings_fetch_failed", error: sErr.message }));
    return new Response(JSON.stringify({ error: sErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const summary = { users: 0, fired: 0, skipped_cooldown: 0 };

  for (const s of settings ?? []) {
    summary.users++;
    const windowStart = new Date(Date.now() - s.window_minutes * 60_000).toISOString();
    const cooldownStart = new Date(Date.now() - s.cooldown_minutes * 60_000).toISOString();

    // Dead-letter pending count (global — the deployment owner cares about all pending).
    const { count: dlCount } = await admin
      .from("webhook_dead_letter")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    if ((dlCount ?? 0) >= s.dead_letter_threshold) {
      const { count: recent } = await admin
        .from("webhook_alerts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", s.user_id)
        .eq("kind", "dead_letter")
        .gte("created_at", cooldownStart);
      if (!recent) {
        await admin.from("webhook_alerts").insert({
          user_id: s.user_id,
          kind: "dead_letter",
          value: dlCount,
          threshold: s.dead_letter_threshold,
          window_minutes: s.window_minutes,
          message: `Dead-letter queue has ${dlCount} pending entries (threshold ${s.dead_letter_threshold}).`,
        });
        summary.fired++;
      } else {
        summary.skipped_cooldown++;
      }
    }

    // p95 latency over the configured window.
    const { data: deliveries } = await admin
      .from("webhook_deliveries")
      .select("latency_ms")
      .gte("delivered_at", windowStart)
      .limit(10000);

    const lats = (deliveries ?? []).map((d: any) => d.latency_ms as number);
    const p95 = percentile(lats, 0.95);

    if (lats.length >= 5 && p95 >= s.latency_p95_threshold_ms) {
      const { count: recent } = await admin
        .from("webhook_alerts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", s.user_id)
        .eq("kind", "latency_p95")
        .gte("created_at", cooldownStart);
      if (!recent) {
        await admin.from("webhook_alerts").insert({
          user_id: s.user_id,
          kind: "latency_p95",
          value: p95,
          threshold: s.latency_p95_threshold_ms,
          window_minutes: s.window_minutes,
          message: `Webhook p95 latency is ${p95}ms over the last ${s.window_minutes}m (threshold ${s.latency_p95_threshold_ms}ms).`,
        });
        summary.fired++;
      } else {
        summary.skipped_cooldown++;
      }
    }
  }

  console.log(JSON.stringify({ msg: "webhook_alerts_monitor.run", ...summary }));
  return new Response(JSON.stringify(summary), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
