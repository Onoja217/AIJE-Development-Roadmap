import { useEffect, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { useAccess } from "@/features/access/AccessProvider";
import {
  fetchIncidentAudit,
  mapAuditRow,
  type IncidentAuditRow,
} from "@/services/incidentOperations";
import { IncidentTimeline } from "@/components/IncidentTimeline";
import type { Incident } from "@/types/incident";

interface IncidentAuditHistoryProps {
  incident: Incident;
  refreshKey?: string;
}

export function IncidentAuditHistory({
  incident,
  refreshKey,
}: IncidentAuditHistoryProps) {
  const { activeOrganization, hasPermission } = useAccess();
  const [rows, setRows] = useState<IncidentAuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canView = hasPermission("audit.view");

  useEffect(() => {
    if (!canView || !activeOrganization || incident.origin !== "database") {
      setRows([]);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    void fetchIncidentAudit({
      incidentId: incident.id,
      organizationId: activeOrganization.id,
    })
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((auditError: unknown) => {
        if (active)
          setError(
            auditError instanceof Error
              ? auditError.message
              : "Audit history could not be loaded",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeOrganization, canView, incident.id, incident.origin, refreshKey]);

  if (!canView) return null;
  if (incident.origin !== "database") {
    return (
      <p className="text-xs text-muted-foreground">
        Audit history is available for canonical operational records only.
      </p>
    );
  }

  const timelineIncident: Incident = {
    ...incident,
    timeline: rows.map(mapAuditRow),
  };

  return (
    <section
      aria-labelledby="incident-audit-heading"
      className="space-y-3 rounded-lg border p-3"
    >
      <h3
        id="incident-audit-heading"
        className="flex items-center gap-2 text-sm font-semibold"
      >
        <History className="h-4 w-4" /> Supervisor audit history
      </h3>
      {loading ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading immutable
          history…
        </p>
      ) : error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No persisted lifecycle events yet.
        </p>
      ) : (
        <IncidentTimeline incident={timelineIncident} />
      )}
    </section>
  );
}
