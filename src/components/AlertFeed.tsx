// components/AlertFeed.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_CONFIG, STATUS_CONFIG } from "../config/dashboardConfig";
import type { Incident } from "../types/incident";

interface AlertFeedProps {
  incidents: Incident[];
  selectedId?: string;
  onSelect: (incident: Incident) => void;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function AlertFeed({ incidents, selectedId, onSelect }: AlertFeedProps) {
  if (incidents.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">No incidents match the current filters.</p>;
  }

  return (
    <div className="space-y-2">
      {incidents.map((inc) => (
        <Card
          key={inc.id}
          onClick={() => onSelect(inc)}
          className={`cursor-pointer transition-colors hover:bg-muted ${
            selectedId === inc.id ? "border-primary" : ""
          }`}
        >
          <CardContent className="p-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold leading-tight">{inc.title}</h3>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {timeAgo(inc.reportedAt)}
              </span>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-1">
              {inc.location.address ?? inc.location.manualEntry ?? "Location pending"}
            </p>

            <div className="flex items-center gap-1.5">
              <Badge className={`${PRIORITY_CONFIG[inc.priority].color} text-white text-[10px]`}>
                {PRIORITY_CONFIG[inc.priority].label}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {STATUS_CONFIG[inc.status].label}
              </Badge>
              {inc.assignedResponder && (
                <span className="text-[10px] text-muted-foreground">→ {inc.assignedResponder}</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
