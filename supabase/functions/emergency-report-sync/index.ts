// supabase/functions/emergency-report-sync/index.ts
//
// Idempotent creation endpoint for emergency reports synced from the
// offline client queue. Mirrors the house style seen in
// paystack-webhook/index.ts: Deno.serve, CORS headers, a service-role
// admin client for the actual write (bypassing RLS, since we've already
// authenticated the caller and enforce ownership explicitly in code
// below), and structured JSON logging.
//
// IDEMPOTENCY: the client sends its own report.id as both the row's
// primary key AND the Idempotency-Key header. If a row with that id
// already exists, this is a RETRY of a request whose response the client
// never received (e.g. connection dropped after the server committed but
// before the ack arrived) — not a new report. We detect this by primary
// key lookup and return the existing row's data rather than attempting a
// second insert, which would otherwise raise a primary-key violation (or
// worse, silently overwrite in a naive upsert).
//
// AUTHENTICATION: this function assumes verify_jwt = true in
// supabase/config.toml for this function (Supabase's platform-level JWT
// verification), so by the time this handler runs the Authorization
// header is already a validated Supabase session token. We still create
// a request-scoped client from that token (rather than trusting a
// client-supplied user id) to resolve who the caller actually is —
// never trust an identity claim from the request body.
//
// ON A SEPARATE DEAD-LETTER TABLE: paystack-webhook writes failures to
// webhook_dead_letter for server-initiated retry, because Paystack (an
// external system) decides when to retry, not us. Here, retry is driven
// by the OFFLINE CLIENT itself (see sync/backoff.ts) — the client already
// durably queues the report in IndexedDB and will retry with exponential
// backoff regardless of what this function does. Adding a second,
// server-side retry queue on top would duplicate that responsibility
// without adding correctness; it's deliberately omitted here.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
};

const VALID_CATEGORIES = new Set(["security", "fire", "medical", "flood", "infrastructure", "other"]);
const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 5000;

interface SyncRequestBody {
  id?: unknown;
  title?: unknown;
  category?: unknown;
  description?: unknown;
  timestamp?: unknown;
  location?: unknown;
  contact?: unknown;
  clientVersion?: unknown;
  imagePaths?: unknown;
}

function logJson(level: "info" | "warn" | "error", event: string, fields: Record<string, unknown>) {
  console.log(JSON.stringify({ level, event, ...fields, ts: new Date().toISOString() }));
}

/** Server-side validation — never trust that the client's own zod schema actually ran. Returns a list of field errors, empty if valid. */
function validateBody(body: SyncRequestBody): string[] {
  const errors: string[] = [];

  if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id)) errors.push("id");
  if (typeof body.title !== "string" || body.title.trim().length === 0 || body.title.length > TITLE_MAX_LENGTH) {
    errors.push("title");
  }
  if (typeof body.category !== "string" || !VALID_CATEGORIES.has(body.category)) errors.push("category");
  if (
    typeof body.description !== "string" ||
    body.description.trim().length === 0 ||
    body.description.length > DESCRIPTION_MAX_LENGTH
  ) {
    errors.push("description");
  }
  if (typeof body.timestamp !== "string" || Number.isNaN(Date.parse(body.timestamp))) errors.push("timestamp");
  if (typeof body.clientVersion !== "number" || body.clientVersion < 1) errors.push("clientVersion");
  if (body.location !== undefined && body.location !== null && typeof body.location !== "object") {
    errors.push("location");
  }
  if (body.imagePaths !== undefined && body.imagePaths !== null && typeof body.imagePaths !== "object") {
    errors.push("imagePaths");
  }

  return errors;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const started = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Request-scoped client using the caller's own JWT, purely to resolve
  // identity — this never performs the actual write.
  const authHeader = req.headers.get("Authorization") ?? "";
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser();

  if (userError || !user) {
    logJson("warn", "emergency_report_sync.unauthenticated", { error: userError?.message });
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: SyncRequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const validationErrors = validateBody(body);
  if (validationErrors.length > 0) {
    logJson("warn", "emergency_report_sync.validation_failed", { fields: validationErrors, userId: user.id });
    // 400, not 500: this is a client bug/malformed payload, not a
    // transient failure — syncClient.ts treats non-5xx as non-retryable,
    // so a genuinely broken payload doesn't retry forever burning battery
    // and bandwidth on a request that will never succeed.
    return new Response(JSON.stringify({ error: `Invalid fields: ${validationErrors.join(", ")}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Admin client for the actual write: RLS is bypassed deliberately here
  // because ownership is already enforced explicitly in the code below
  // (comparing existing.user_id to the authenticated user), which gives
  // us more precise control over the idempotency/conflict logic than RLS
  // policies alone could express (e.g. "same id + same owner = success,
  // same id + different owner = 403" isn't a single clean RLS predicate).
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const reportId = body.id as string;

  const { data: existing, error: fetchError } = await admin
    .from("emergency_reports")
    .select("id, user_id, server_version, created_at")
    .eq("id", reportId)
    .maybeSingle();

  if (fetchError) {
    logJson("error", "emergency_report_sync.fetch_error", { error: fetchError.message, reportId });
    return new Response(JSON.stringify({ error: "Failed to check existing report" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (existing) {
    if (existing.user_id !== user.id) {
      // Extraordinarily unlikely given UUIDv4's collision space, but if a
      // report id ever collides across two different users' devices, we
      // must not silently let one user's sync overwrite another's report.
      logJson("error", "emergency_report_sync.id_collision", { reportId, userId: user.id });
      return new Response(JSON.stringify({ error: "Report id conflict" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Same user, same id => this is a retry of an already-accepted
    // creation (the client never saw our first response). Idempotent
    // success: return the existing row's version rather than re-inserting.
    logJson("info", "emergency_report_sync.idempotent_replay", { reportId, userId: user.id });
    return new Response(
      JSON.stringify({
        id: existing.id,
        serverVersion: existing.server_version,
        syncedAt: existing.created_at,
        conflict: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: inserted, error: insertError } = await admin
    .from("emergency_reports")
    .insert({
      id: reportId,
      user_id: user.id,
      title: (body.title as string).trim(),
      category: body.category,
      description: (body.description as string).trim(),
      reported_at: body.timestamp,
      location: body.location ?? {},
      contact: body.contact ?? null,
      image_paths: body.imagePaths ?? {},
      client_version: body.clientVersion,
      server_version: 1,
      status: "received",
    })
    .select("id, server_version, created_at")
    .single();

  const latencyMs = Date.now() - started;

  if (insertError) {
    logJson("error", "emergency_report_sync.insert_error", {
      error: insertError.message,
      reportId,
      userId: user.id,
      latency_ms: latencyMs,
    });
    return new Response(JSON.stringify({ error: "Failed to save report" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  logJson("info", "emergency_report_sync.created", {
    reportId,
    userId: user.id,
    latency_ms: latencyMs,
  });

  return new Response(
    JSON.stringify({
      id: inserted.id,
      serverVersion: inserted.server_version,
      syncedAt: inserted.created_at,
      conflict: false,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});