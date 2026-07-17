// components/ResourceCard.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RESOURCE_CATEGORY_CONFIG } from "../config/resourceConfig";
import type { EmergencyResource } from "../types/resource";

interface ResourceCardProps {
  resource: EmergencyResource & { distanceKm?: number };
  selected?: boolean;
  onSelect: (resource: EmergencyResource) => void;
}

export function ResourceCard({ resource, selected, onSelect }: ResourceCardProps) {
  const cfg = RESOURCE_CATEGORY_CONFIG[resource.category];

  return (
    <Card
      onClick={() => onSelect(resource)}
      className={`cursor-pointer transition-colors hover:bg-muted ${selected ? "border-primary" : ""}`}
    >
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-tight">
            {cfg.icon} {resource.name}
          </h3>
          {resource.distanceKm !== undefined && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {resource.distanceKm.toFixed(1)} km
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">{resource.address}</p>

        <div className="flex items-center gap-1.5">
          <Badge className={`${cfg.color} text-white text-[10px]`}>{cfg.label}</Badge>
          {resource.phone && (
            <a
              href={`tel:${resource.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] text-primary underline"
            >
              📞 {resource.phone}
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
