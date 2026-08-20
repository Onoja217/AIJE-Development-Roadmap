import { describe, expect, it } from "vitest";
import {
  validateGatewayHeaders,
  isValidGatewayPublicKey,
  verifyGatewaySignature,
} from "../../supabase/functions/_shared/gateway-protocol";

function toBase64(bytes: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

describe("sensor gateway protocol", () => {
  it("rejects malformed identities, nonces and stale timestamps", () => {
    const now = 1_800_000_000_000;
    expect(
      validateGatewayHeaders({
        gatewayId: "bad",
        nonce: "short",
        timestamp: "bad",
        now,
      }).valid,
    ).toBe(false);
    expect(
      validateGatewayHeaders({
        gatewayId: "123e4567-e89b-42d3-a456-426614174000",
        nonce: "nonce_value_123456",
        timestamp: "1799999000",
        now,
      }),
    ).toEqual({ valid: false, reason: "timestamp outside allowed window" });
  });

  it("accepts well-formed headers inside the clock window", () => {
    const result = validateGatewayHeaders({
      gatewayId: "123e4567-e89b-42d3-a456-426614174000",
      nonce: "nonce_value_123456",
      timestamp: "1800000000",
      now: 1_800_000_000_000,
    });
    expect(result.valid).toBe(true);
  });

  it("verifies the exact signed timestamp, nonce and body", async () => {
    const keyPair = await crypto.subtle.generateKey("Ed25519", true, [
      "sign",
      "verify",
    ]);
    const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
    const timestamp = "1800000000";
    const nonce = "nonce_value_123456";
    const rawBody = JSON.stringify({ readings: [] });
    const message = new TextEncoder().encode(
      `${timestamp}.${nonce}.${rawBody}`,
    );
    const signature = await crypto.subtle.sign(
      "Ed25519",
      keyPair.privateKey,
      message,
    );
    const input = {
      publicKeySpki: toBase64(publicKey),
      signature: toBase64(signature),
      timestamp,
      nonce,
      rawBody,
    };
    await expect(isValidGatewayPublicKey(input.publicKeySpki)).resolves.toBe(
      true,
    );
    await expect(isValidGatewayPublicKey("not-a-key")).resolves.toBe(false);
    await expect(verifyGatewaySignature(input)).resolves.toBe(true);
    await expect(
      verifyGatewaySignature({ ...input, rawBody: `${rawBody} ` }),
    ).resolves.toBe(false);
  });
});
