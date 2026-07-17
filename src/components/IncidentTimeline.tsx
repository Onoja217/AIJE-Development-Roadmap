// components/IncidentTimeline.tsx
import { TIMELINE_LABELS } from "../config/dashboardConfig";
import type { Incident } from "../types/incident";

interface IncidentTimelineProps {
  incident: Incident;
}

export function IncidentTimeline({ incident }: IncidentTimelineProps) {
  const sorted = [...incident.timeline].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <ol className="relative border-l border-border ml-2 space-y-4">
      {sorted.map((event, idx) => (
        <li key={event.id} className="ml-4">
          <span
            className={`absolute -left-1.5 flex h-3 w-3 rounded-full ${
              idx === sorted.length - 1 ? "bg-primary" : "bg-muted-foreground"
            }`}
          />
          <p className="text-sm font-medium">{TIMELINE_LABELS[event.label] ?? event.label}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(event.timestamp).toLocaleString()}
          </p>
          {event.note && <p className="text-xs mt-0.5">{event.note}</p>}
        </li>
      ))}
    </ol>
  );
}
