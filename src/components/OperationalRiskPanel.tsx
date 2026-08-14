import { AlertTriangle, Clock3, TimerReset, WifiOff } from "lucide-react";
import { calculateIncidentOperationalMetrics } from "@/lib/incidentOperationalMetrics";
import type { Incident } from "@/types/incident";

export function OperationalRiskPanel({
  incidents,
  failedTransitions,
}: {
  incidents: Incident[];
  failedTransitions: number;
}) {
  const metrics = calculateIncidentOperationalMetrics(incidents);
  const values = [
    { label: "Failed transitions", value: failedTransitions, icon: WifiOff },
    {
      label: "Awaiting acknowledgement >15m",
      value: metrics.delayedAcknowledgements,
      icon: Clock3,
    },
    {
      label: "Unchanged >60m",
      value: metrics.stuckIncidents,
      icon: AlertTriangle,
    },
    {
      label: "Average acknowledgement",
      value:
        metrics.averageAcknowledgementMinutes === null
          ? "Not measured"
          : `${metrics.averageAcknowledgementMinutes}m`,
      icon: TimerReset,
    },
    {
      label: "Average resolution",
      value:
        metrics.averageResolutionMinutes === null
          ? "Not measured"
          : `${metrics.averageResolutionMinutes}m`,
      icon: TimerReset,
    },
  ];

  return (
    <section
      aria-labelledby="operational-risk-heading"
      className="rounded-lg border bg-card p-4"
    >
      <h2 id="operational-risk-heading" className="mb-3 text-sm font-semibold">
        Response reliability
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {values.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-md border p-3">
            <Icon className="mb-2 h-4 w-4 text-muted-foreground" />
            <p className="text-xl font-semibold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
