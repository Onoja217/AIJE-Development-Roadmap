import { supabase } from "@/integrations/supabase/client";
import type { IncidentStatus } from "@/types/incident";
import type {
  IncidentAuditRow,
  IncidentReportRow,
} from "./incidentOperationMappers";

export { mapAuditRow, mapIncidentReport } from "./incidentOperationMappers";
export type {
  IncidentAuditRow,
  IncidentReportRow,
} from "./incidentOperationMappers";

export async function fetchOrganizationIncidents(
  organizationId: string,
): Promise<IncidentReportRow[]> {
  const { data, error } = await supabase
    .from("incident_reports")
    .select("*")
    .eq("organization_id", organizationId)
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function transitionIncident(input: {
  incidentId: string;
  status: IncidentStatus;
  note?: string;
}): Promise<IncidentReportRow> {
  const { data, error } = await supabase.rpc("transition_incident", {
    _incident_id: input.incidentId,
    _to_status: input.status,
    _note: input.note ?? null,
  });
  if (error) throw error;
  return data;
}

export async function fetchIncidentAudit(input: {
  incidentId: string;
  organizationId: string;
}): Promise<IncidentAuditRow[]> {
  const { data, error } = await supabase
    .from("incident_audit_log")
    .select("*")
    .eq("organization_id", input.organizationId)
    .or(
      `incident_report_id.eq.${input.incidentId},incident_id.eq.${input.incidentId}`,
    )
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
