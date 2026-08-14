import { createClient } from "npm:@supabase/supabase-js@2";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const required = (name: string): string => {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

Deno.test(
  "authenticated incident lifecycle persists audit and isolates tenants",
  async () => {
    const url = required("SUPABASE_URL");
    const anonKey = required("SUPABASE_ANON_KEY");
    const email = required("E2E_OPERATOR_EMAIL");
    const password = required("E2E_OPERATOR_PASSWORD");
    const organizationId = required("E2E_ORGANIZATION_ID");
    const otherOrganizationId = required("E2E_OTHER_ORGANIZATION_ID");
    const client = createClient(url, anonKey, {
      auth: { persistSession: false },
    });

    const { data: session, error: signInError } =
      await client.auth.signInWithPassword({ email, password });
    if (signInError || !session.user)
      throw signInError ?? new Error("Operator sign-in failed");

    const marker = crypto.randomUUID();
    const { data: incident, error: insertError } = await client
      .from("incident_reports")
      .insert({
        reporter_id: session.user.id,
        organization_id: organizationId,
        client_id: `e2e-${marker}`,
        title: `[E2E] Lifecycle ${marker}`,
        category: "security",
        description: "Automated staging verification record",
        status: "pending",
      })
      .select("id,status,organization_id")
      .single();
    if (insertError) throw insertError;

    for (const status of [
      "verified",
      "dispatched",
      "acknowledged",
      "responding",
      "resolved",
    ] as const) {
      const { data, error } = await client.rpc("transition_incident", {
        _incident_id: incident.id,
        _to_status: status,
        _note: `E2E transition to ${status}`,
      });
      if (error) throw error;
      assertEquals(data.status, status);
      assertEquals(data.organization_id, organizationId);
    }

    const { data: audit, error: auditError } = await client
      .from("incident_audit_log")
      .select("action,to_status,organization_id")
      .eq("incident_report_id", incident.id)
      .order("created_at");
    if (auditError) throw auditError;
    assertEquals(
      audit?.map((row) => row.to_status),
      ["verified", "dispatched", "acknowledged", "responding", "resolved"],
    );
    assertEquals(
      audit?.every((row) => row.organization_id === organizationId),
      true,
    );

    const { data: crossTenantAudit, error: crossTenantError } = await client
      .from("incident_audit_log")
      .select("id")
      .eq("organization_id", otherOrganizationId)
      .limit(1);
    if (crossTenantError) throw crossTenantError;
    assertEquals(crossTenantAudit, []);
  },
);
