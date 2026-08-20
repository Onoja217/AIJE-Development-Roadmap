import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

export const MAX_PAYSTACK_WEBHOOK_BYTES = 1_000_000;

export function isValidPaystackSignature(
  rawBody: string,
  signature: string,
  secretKey: string,
): boolean {
  if (!/^[0-9a-f]{128}$/i.test(signature)) return false;

  const computed = createHmac("sha512", secretKey)
    .update(rawBody)
    .digest("hex");
  return timingSafeEqual(
    Buffer.from(computed, "hex"),
    Buffer.from(signature, "hex"),
  );
}
