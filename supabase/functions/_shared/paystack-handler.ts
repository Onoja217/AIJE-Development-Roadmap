// Shared Paystack event processor used by both the live webhook and the retry worker.
// Returning normally = handled. Throwing = should be retried / dead-lettered.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

type PaystackEvent = {
  event?: string;
  data?: { metadata?: Record<string, unknown>; [key: string]: unknown };
  [key: string]: unknown;
};

export async function processPaystackEvent(admin: SupabaseClient, evt: PaystackEvent) {
  const meta = evt?.data?.metadata ?? {};
  const userId = meta.user_id ?? null;
  const planId = meta.plan_id ?? null;

  if (evt.event === "charge.success") {
    if (!userId || !planId) throw new Error("charge.success missing user_id or plan_id metadata");
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);
    const { error } = await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        plan_id: planId,
        status: "active",
        paystack_customer_code: evt.data?.customer?.customer_code ?? null,
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(`subscriptions upsert failed: ${error.message}`);
  } else if (evt.event === "subscription.disable" || evt.event === "subscription.not_renew") {
    const code = evt.data?.subscription_code;
    if (code) {
      const { error } = await admin
        .from("subscriptions")
        .update({ status: "canceled", cancel_at_period_end: true })
        .eq("paystack_subscription_code", code);
      if (error) throw new Error(`subscriptions cancel failed: ${error.message}`);
    }
  } else if (evt.event === "invoice.payment_failed") {
    if (userId) {
      const { error } = await admin
        .from("subscriptions")
        .update({ status: "past_due" })
        .eq("user_id", userId);
      if (error) throw new Error(`subscriptions past_due failed: ${error.message}`);
    }
  }

  const { error: logErr } = await admin.from("payment_events").insert({
    user_id: userId,
    event_type: evt.event,
    reference: evt.data?.reference ?? null,
    paystack_event_id: evt.data?.id ? String(evt.data.id) : null,
    payload: evt,
  });
  if (logErr) throw new Error(`payment_events insert failed: ${logErr.message}`);
}
