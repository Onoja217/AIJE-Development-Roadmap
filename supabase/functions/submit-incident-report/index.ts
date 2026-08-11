import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface IncidentPayload {
  id?: unknown;
  title?: unknown;
  category?: unknown;
  description?: unknown;
  contact?: unknown;
  timestamp?: unknown;
  location?: {
    address?: unknown;
    lat?: unknown;
    lng?: unknown;
    manualEntry?: unknown;
  };
  images?: unknown[];
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function boundedString(value: unknown, min: number, max: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length >= min && normalized.length <= max
    ? normalized
    : null;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405);

  const correlationId = crypto.randomUUID();
  try {
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > 32_000)
      return json({ error: "Request too large", correlationId }, 413);

    const payload = (await request.json()) as IncidentPayload;
    const clientId = boundedString(payload.id, 8, 100);
    const title = boundedString(payload.title, 3, 160);
    const category = boundedString(payload.category, 2, 60);
    const description = boundedString(payload.description, 10, 3000);
    if (!clientId || !title || !category || !description) {
      return json({ error: "Invalid incident report", correlationId }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey)
      throw new Error("Service configuration missing");
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const forwardedFor = request.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim();
    const clientFingerprint = await sha256(
      `${forwardedFor ?? "unknown"}:${request.headers.get("user-agent") ?? "unknown"}`,
    );
    const { data: allowed, error: limitError } = await admin.rpc(
      "consume_public_incident_rate_limit",
      { _client_hash: clientFingerprint },
    );
    if (limitError) throw limitError;
    if (!allowed)
      return json(
        { error: "Too many reports. Please try again later.", correlationId },
        429,
      );

    const occurredAt =
      typeof payload.timestamp === "string" &&
      !Number.isNaN(Date.parse(payload.timestamp))
        ? payload.timestamp
        : new Date().toISOString();
    const contact = boundedString(payload.contact, 0, 100);
    const address = boundedString(payload.location?.address, 0, 300);
    const manualLocation = boundedString(payload.location?.manualEntry, 0, 300);
    const latitude =
      typeof payload.location?.lat === "number" &&
      payload.location.lat >= -90 &&
      payload.location.lat <= 90
        ? payload.location.lat
        : null;
    const longitude =
      typeof payload.location?.lng === "number" &&
      payload.location.lng >= -180 &&
      payload.location.lng <= 180
        ? payload.location.lng
        : null;

    const { data: existing, error: lookupError } = await admin
      .from("incident_reports")
      .select("id")
      .is("reporter_id", null)
      .eq("client_id", clientId)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (!existing) {
      const { error } = await admin.from("incident_reports").insert({
        reporter_id: null,
        client_id: clientId,
        title,
        category,
        description,
        contact,
        address,
        manual_location: manualLocation,
        latitude,
        longitude,
        image_count: Math.min(
          Array.isArray(payload.images) ? payload.images.length : 0,
          5,
        ),
        status: "pending",
        occurred_at: occurredAt,
      });
      if (error && error.code !== "23505") throw error;
    }

    console.log("[public-incident] accepted", { correlationId, category });
    return json({ accepted: true, correlationId }, 202);
  } catch (error) {
    console.error("[public-incident] failed", {
      correlationId,
      error: String(error),
    });
    return json(
      { error: "Unable to submit incident report", correlationId },
      500,
    );
  }
});
