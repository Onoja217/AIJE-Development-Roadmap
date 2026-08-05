// Shared authentication for scheduled (pg_cron) edge functions.
// These endpoints run with the service role, so they must never be callable
// anonymously. Callers must present the private token stored in
// public.internal_cron_secrets (or the ALERT_CRON_SECRET env value).
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function presented(req: Request): string | null {
  const header = req.headers.get("x-cron-secret");
  if (header) return header;
  const bearer = req.headers.get("Authorization");
  if (bearer?.startsWith("Bearer ")) return bearer.slice(7);
  return null;
}

export async function isAuthorizedCronCall(
  req: Request,
  admin: SupabaseClient,
): Promise<boolean> {
  const token = presented(req);
  if (!token) return false;

  const envSecret = Deno.env.get("ALERT_CRON_SECRET");
  if (envSecret && token === envSecret) return true;

  const { data } = await admin
    .from("internal_cron_secrets")
    .select("secret")
    .eq("name", "scheduled_functions")
    .maybeSingle();

  return Boolean(data?.secret) && token === data!.secret;
}

export function unauthorized(corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
