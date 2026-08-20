import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isValidPaystackSignature } from "../../supabase/functions/_shared/paystack-signature";

describe("Paystack webhook signature verification", () => {
  const secret = "sk_test_security_regression";
  const body = JSON.stringify({ event: "charge.success", data: { id: 1 } });

  it("accepts the matching HMAC", () => {
    const signature = createHmac("sha512", secret).update(body).digest("hex");
    expect(isValidPaystackSignature(body, signature, secret)).toBe(true);
  });

  it("rejects missing, malformed, and forged signatures", () => {
    expect(isValidPaystackSignature(body, "", secret)).toBe(false);
    expect(isValidPaystackSignature(body, "not-hex", secret)).toBe(false);
    expect(isValidPaystackSignature(body, "é".repeat(128), secret)).toBe(false);
    expect(isValidPaystackSignature(`${body}x`, "0".repeat(128), secret)).toBe(
      false,
    );
  });
});
