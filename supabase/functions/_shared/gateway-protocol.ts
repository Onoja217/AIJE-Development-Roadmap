export const MAX_GATEWAY_MESSAGE_BYTES = 256_000;
export const MAX_GATEWAY_CLOCK_SKEW_SECONDS = 300;

const gatewayIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const noncePattern = /^[A-Za-z0-9_-]{16,96}$/;
const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;

function fromBase64(value: string): ArrayBuffer {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
    .buffer as ArrayBuffer;
}

export function validateGatewayHeaders(input: {
  gatewayId: string;
  nonce: string;
  timestamp: string;
  now?: number;
}): { valid: true; sentAt: Date } | { valid: false; reason: string } {
  if (!gatewayIdPattern.test(input.gatewayId))
    return { valid: false, reason: "invalid gateway id" };
  if (!noncePattern.test(input.nonce))
    return { valid: false, reason: "invalid nonce" };
  if (!/^\d{10}$/.test(input.timestamp))
    return { valid: false, reason: "invalid timestamp" };
  const timestampSeconds = Number(input.timestamp);
  const nowSeconds = Math.floor((input.now ?? Date.now()) / 1000);
  if (
    Math.abs(nowSeconds - timestampSeconds) > MAX_GATEWAY_CLOCK_SKEW_SECONDS
  ) {
    return { valid: false, reason: "timestamp outside allowed window" };
  }
  return { valid: true, sentAt: new Date(timestampSeconds * 1000) };
}

export async function verifyGatewaySignature(input: {
  publicKeySpki: string;
  signature: string;
  timestamp: string;
  nonce: string;
  rawBody: string;
}): Promise<boolean> {
  try {
    if (
      !base64Pattern.test(input.publicKeySpki) ||
      !base64Pattern.test(input.signature)
    )
      return false;
    const publicKey = await crypto.subtle.importKey(
      "spki",
      fromBase64(input.publicKeySpki),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const message = new TextEncoder().encode(
      `${input.timestamp}.${input.nonce}.${input.rawBody}`,
    ).buffer as ArrayBuffer;
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      publicKey,
      fromBase64(input.signature),
      message,
    );
  } catch {
    return false;
  }
}

export async function isValidGatewayPublicKey(
  publicKeySpki: string,
): Promise<boolean> {
  try {
    if (!base64Pattern.test(publicKeySpki)) return false;
    await crypto.subtle.importKey(
      "spki",
      fromBase64(publicKeySpki),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    return true;
  } catch {
    return false;
  }
}
