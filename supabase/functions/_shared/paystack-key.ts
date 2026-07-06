// Central Paystack secret-key loader + mode detector.
// Fails closed when the key is missing or malformed so we never silently
// fall back to a test key in production.

export type PaystackMode = "live" | "test";

export interface PaystackKeyInfo {
  key: string;
  mode: PaystackMode;
  prefix: string; // e.g. "sk_live" — safe to log
}

export function loadPaystackSecretKey(): PaystackKeyInfo {
  const key = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!key || key.trim().length === 0) {
    throw new Error(
      "PAYSTACK_SECRET_KEY is not configured. Set it in Edge Function Secrets.",
    );
  }
  const trimmed = key.trim();
  let mode: PaystackMode;
  if (trimmed.startsWith("sk_live_")) mode = "live";
  else if (trimmed.startsWith("sk_test_")) mode = "test";
  else {
    throw new Error(
      "PAYSTACK_SECRET_KEY is malformed: expected prefix sk_live_ or sk_test_.",
    );
  }
  return { key: trimmed, mode, prefix: trimmed.slice(0, 7) };
}

/**
 * Log the current mode + key prefix (never the key itself).
 * Emits a warn line when running in test mode so it's easy to spot
 * accidental test-key deployments in logs.
 */
export function logPaystackMode(fn: string, info: PaystackKeyInfo) {
  const line = JSON.stringify({
    level: info.mode === "live" ? "info" : "warn",
    msg: "paystack.mode",
    fn,
    mode: info.mode,
    key_prefix: info.prefix,
    ts: new Date().toISOString(),
  });
  console.log(line);
}
