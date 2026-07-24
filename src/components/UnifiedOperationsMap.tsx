// components/UnifiedOperationsMap.tsx
//
// Shared emergency operations map for incidents and emergency resources.
// Both marker layers use the same geographic bounds so they remain aligned.
//
// This component is intentionally independent of data fetching and OSINT
// providers. It only renders the data passed to it, which keeps future
// intelligence providers such as OSIRIS optional and replaceable.

import { Card, CardContent } from "@/components/ui/card";
import { IncidentMarkers } from "./IncidentMarkers";
import {
  ResourceMarkers,
  computeBounds,
} from "./ResourceMarkers";
import type { Incident } from "../types/incident";
import type { EmergencyResource } from "../types/resource";

interface UnifiedOperationsMapProps {
  incidents: Incident[];
  resources: EmergencyResource[];
  onSelectIncident: (incident: Incident) => void;
  onSelectResource: (resource: EmergencyResource) => void;
}

export function UnifiedOperationsMap({
  incidents,
  resources,
  onSelectIncident,
  onSelectResource,
}: UnifiedOperationsMapProps) {
  const locatedIncidents = incidents.filter(
    (incident) =>
      incident.location.lat !== undefined &&
      incident.location.lng !== undefined
  );

  const points = [
    ...locatedIncidents.map((incident) => ({
      lat: incident.location.lat!,
      lng: incident.location.lng!,
    })),
    ...resources.map((resource) => ({
      lat: resource.lat,
      lng: resource.lng,
    })),
  ];

  if (points.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          No incidents or emergency resources with GPS coordinates to display.
        </CardContent>
      </Card>
    );
  }

  const bounds = computeBounds(points);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="relative h-80 w-full overflow-hidden rounded-md bg-muted">
          <IncidentMarkers
            incidents={locatedIncidents}
            bounds={bounds}
            onSelect={onSelectIncident}
          />

          <ResourceMarkers
            resources={resources}
            bounds={bounds}
            onSelect={onSelectResource}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 p-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border-2 border-white bg-destructive shadow" />
            Incidents
          </span>

          <span className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-white bg-white shadow">
              +
            </span>
            Emergency resources
          </span>

          <span className="ml-auto">
            Placeholder map — ready for a future Leaflet or Mapbox renderer.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
