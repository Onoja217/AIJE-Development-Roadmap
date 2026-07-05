// End-to-end test for paystack-webhook-retry.
//
// Simulates a failed webhook delivery by inserting a pending row into
// webhook_dead_letter, then invokes paystack-webhook-retry and confirms:
//   1. the row transitions to "resolved"
//   2. attempts count incremented
//   3. the subscriptions row for the user becomes "active"
//   4. a webhook_deliveries "ok" entry is recorded

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
const ANON =
  Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FN_BASE = `${SUPABASE_URL}/functions/v1`;

Deno.test({
  name: "paystack-webhook-retry: dead-letter → resolved → subscription active",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    assert(SUPABASE_URL && ANON && SERVICE, "env vars must be set");

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Ephemeral test user.
    const email = `retry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@aegis-test.dev`;
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
    });
    if (cErr) throw cErr;
    const userId = created.user!.id;

    // Pick a real plan.
    const { data: plan, error: pErr } = await admin
      .from("plans")
      .select("*")
      .eq("code", "starter")
      .single();
    if (pErr) throw pErr;

    const reference = `retry_e2e_${Date.now()}`;
    let deadLetterId: string | null = null;

    try {
      // 1) Seed dead-letter row that mimics a previously failed delivery.
      const payload = {
        event: "charge.success",
        data: {
          id: Date.now(),
          reference,
          status: "success",
          customer: { customer_code: `CUS_retry_${userId.slice(0, 8)}` },
          metadata: { user_id: userId, plan_id: plan.id, plan_code: plan.code },
        },
      };
      const { data: dl, error: dlErr } = await admin
        .from("webhook_dead_letter")
        .insert({
          source: "paystack",
          event_type: "charge.success",
          reference,
          payload,
          error: "simulated: initial delivery failed",
          attempts: 1,
          status: "pending",
          // eligible for immediate retry
          next_retry_at: new Date(Date.now() - 60_000).toISOString(),
        })
        .select()
        .single();
      if (dlErr) throw dlErr;
      deadLetterId = dl.id;

      // 2) Trigger the retry worker.
      const runRes = await fetch(`${FN_BASE}/paystack-webhook-retry`, {
        method: "POST",
        headers: { apikey: ANON, "Content-Type": "application/json" },
      });
      const runJson = await runRes.json();
      assertEquals(runRes.status, 200, `retry run failed: ${JSON.stringify(runJson)}`);
      assert(runJson.processed >= 1, `expected at least 1 processed, got ${runJson.processed}`);
      assert(runJson.resolved >= 1, `expected at least 1 resolved, got ${runJson.resolved}`);

      // 3) Dead-letter row is now resolved with attempts bumped.
      const { data: after, error: afterErr } = await admin
        .from("webhook_dead_letter")
        .select("*")
        .eq("id", deadLetterId)
        .single();
      if (afterErr) throw afterErr;
      assertEquals(after.status, "resolved");
      assertEquals(after.attempts, 2);
      assertEquals(after.error, null);

      // 4) Subscription is now active for the user.
      const { data: sub, error: subErr } = await admin
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (subErr) throw subErr;
      assertEquals(sub.status, "active");
      assertEquals(sub.plan_id, plan.id);
      assert(
        sub.current_period_end && new Date(sub.current_period_end) > new Date(),
        "current_period_end must be in the future",
      );

      // 5) A successful delivery attempt was logged.
      const { data: deliveries, error: dErr } = await admin
        .from("webhook_deliveries")
        .select("*")
        .eq("reference", reference)
        .eq("status", "ok");
      if (dErr) throw dErr;
      assert(
        (deliveries?.length ?? 0) >= 1,
        "expected at least one ok delivery record",
      );
    } finally {
      if (deadLetterId) {
        await admin.from("webhook_dead_letter").delete().eq("id", deadLetterId);
      }
      await admin.from("webhook_deliveries").delete().eq("reference", reference);
      await admin.from("payment_events").delete().eq("user_id", userId);
      await admin.from("subscriptions").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
  },
});
