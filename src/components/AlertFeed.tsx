// components/AlertFeed.tsx
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  MapPin,
  Radio,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PRIORITY_CONFIG, STATUS_CONFIG } from "../config/dashboardConfig";
import type { Incident } from "../types/incident";

interface AlertFeedProps {
  incidents: Incident[];
  selectedId?: string;
  onSelect: (incident: Incident) => void;
}

function timeAgo(iso: string): string {
  const timestamp = new Date(iso).getTime();

  if (Number.isNaN(timestamp)) {
    return "time unavailable";
  }

  const diffMs = Math.max(0, Date.now() - timestamp);
  const mins = Math.floor(diffMs / 60000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);

  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);

  return `${days}d ago`;
}

function isRecentIncident(iso: string): boolean {
  const timestamp = new Date(iso).getTime();

  if (Number.isNaN(timestamp)) {
    return false;
  }

  const thirtyMinutes = 30 * 60 * 1000;

  return Date.now() - timestamp <= thirtyMinutes;
}

function getIncidentLocation(incident: Incident): string {
  return (
    incident.location.address ??
    incident.location.manualEntry ??
    "Location pending"
  );
}

export function AlertFeed({
  incidents,
  selectedId,
  onSelect,
}: AlertFeedProps) {
  if (incidents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-10 text-center">
        <CheckCircle2
          className="mx-auto h-7 w-7 text-muted-foreground"
          aria-hidden="true"
        />

        <p className="mt-3 text-sm font-medium">
          No Matching Incidents
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          No incidents currently match the selected filters.
        </p>
      </div>
    );
  }

  return (
    <div
      className="space-y-3"
      role="list"
      aria-label="Operational incident alerts"
    >
      {incidents.map((incident) => {
        const isSelected = selectedId === incident.id;
        const isRecent = isRecentIncident(incident.reportedAt);
        const priority = PRIORITY_CONFIG[incident.priority];
        const status = STATUS_CONFIG[incident.status];

        return (
          <Card
            key={incident.id}
            role="listitem"
            tabIndex={0}
            aria-current={isSelected ? "true" : undefined}
            onClick={() => onSelect(incident)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(incident);
              }
            }}
            className={[
              "cursor-pointer transition-all duration-200",
              "hover:border-primary/40 hover:bg-muted/40 hover:shadow-sm",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-ring focus-visible:ring-offset-2",
              isSelected
                ? "border-primary bg-primary/[0.04] shadow-sm"
                : "",
            ].join(" ")}
          >
            <CardContent className="space-y-3 p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <div
                  className={[
                    "mt-0.5 rounded-lg p-2",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  ].join(" ")}
                >
                  <AlertTriangle
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold leading-tight">
                          {incident.title}
                        </h3>

                        {isRecent && (
                          <Badge
                            variant="secondary"
                            className="h-5 px-2 text-[10px] font-medium text-primary"
                          >
                            <Radio
                              className="mr-1 h-2.5 w-2.5"
                              aria-hidden="true"
                            />
                            New
                          </Badge>
                        )}
                      </div>

                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin
                          className="h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />

                        <span className="truncate">
                          {getIncidentLocation(incident)}
                        </span>
                      </p>
                    </div>

                    <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock3
                        className="h-3 w-3"
                        aria-hidden="true"
                      />

                      {timeAgo(incident.reportedAt)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge
                      className={`${priority.color} text-[10px] text-white`}
                    >
                      {priority.label}
                    </Badge>

                    <Badge
                      variant="outline"
                      className="text-[10px]"
                    >
                      {status.label}
                    </Badge>

                    {incident.assignedResponder && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <UserRound
                          className="h-3 w-3"
                          aria-hidden="true"
                        />
                        {incident.assignedResponder}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isSelected && (
                <div className="border-t pt-3">
                  <p className="text-[11px] font-medium text-primary">
                    Selected for operational review
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
        <p className="text-xs font-medium">
          Incident Feed
        </p>

        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
          Alerts shown here use the current incident dataset. Additional
          surveillance, community, resource, and intelligence feeds can be
          connected during the integration phase.
        </p>
      </div>
    </div>
  );
}