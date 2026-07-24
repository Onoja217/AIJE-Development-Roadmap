// components/UnifiedOperationsMap.tsx

import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import {
  countResourcesByLayer,
  getResourceLayer,
} from "@/lib/resourceLayers";

import { IncidentMarkers } from "./IncidentMarkers";
import {
  ResourceMarkers,
  computeBounds,
} from "./ResourceMarkers";
import {
  MapLayerControls,
  type LayerState,
} from "./MapLayerControls";

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
  const [layers, setLayers] = useState<LayerState>({
    incidents: true,
    hospitals: true,
    police: true,
    fire: true,
    shelters: true,
    warehouses: true,
  });

  const locatedIncidents = useMemo(
    () =>
      incidents.filter(
        (incident) =>
          incident.location.lat !== undefined &&
          incident.location.lng !== undefined
      ),
    [incidents]
  );

  const visibleIncidents = useMemo(
    () => (layers.incidents ? locatedIncidents : []),
    [layers.incidents, locatedIncidents]
  );

  const visibleResources = useMemo(() => {
    return resources.filter((resource) => {
      const layer = getResourceLayer(resource.category);

      if (!layer) {
        return false;
      }

      return layers[layer];
    });
  }, [resources, layers]);

  const resourceCounts = useMemo(
    () => countResourcesByLayer(resources),
    [resources]
  );

  const counts = useMemo(
    () => ({
      incidents: locatedIncidents.length,
      ...resourceCounts,
    }),
    [locatedIncidents.length, resourceCounts]
  );

  const points = useMemo(
    () => [
      ...visibleIncidents.map((incident) => ({
        lat: incident.location.lat!,
        lng: incident.location.lng!,
      })),

      ...visibleResources.map((resource) => ({
        lat: resource.lat,
        lng: resource.lng,
      })),
    ],
    [visibleIncidents, visibleResources]
  );

  if (points.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-4 p-4">
          <MapLayerControls
            layers={layers}
            onChange={setLayers}
            counts={counts}
          />

          <div className="p-6 text-center text-sm text-muted-foreground">
            No visible incidents or emergency resources with GPS coordinates to
            display.
          </div>
        </CardContent>
      </Card>
    );
  }

  const bounds = computeBounds(points);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <MapLayerControls
          layers={layers}
          onChange={setLayers}
          counts={counts}
        />

        <div className="relative h-80 w-full overflow-hidden rounded-md bg-muted">
          {layers.incidents && (
            <IncidentMarkers
              incidents={visibleIncidents}
              bounds={bounds}
              onSelect={onSelectIncident}
            />
          )}

          <ResourceMarkers
            resources={visibleResources}
            bounds={bounds}
            onSelect={onSelectResource}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border-2 border-white bg-destructive shadow" />
            Incidents
          </span>

          <span className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-white bg-white shadow">
              +
            </span>
            Emergency Resources
          </span>

          <span className="ml-auto">Layer Controls Enabled</span>
        </div>
      </CardContent>
    </Card>
  );
}