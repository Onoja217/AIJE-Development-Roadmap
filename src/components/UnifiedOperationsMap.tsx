import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import {
  countResourcesByLayer,
  getResourceLayer,
} from "@/lib/resourceLayers";

import { computeBounds } from "./ResourceMarkers";
import {
  MapLayerControls,
  type LayerState,
} from "./MapLayerControls";

import { DEFAULT_LAYERS } from "./map/layerConfig";
import { LeafletMap } from "./map/LeafletMap";

import type { Incident } from "../types/incident";
import type { EmergencyResource } from "../types/resource";
import type { LayerId } from "./map/layerTypes";

interface UnifiedOperationsMapProps {
  incidents: Incident[];
  resources: EmergencyResource[];
  onSelectIncident: (incident: Incident) => void;
  onSelectResource: (resource: EmergencyResource) => void;
}

const createInitialLayerState = (): LayerState =>
  Object.fromEntries(
    DEFAULT_LAYERS.map((layer) => [layer.id, layer.visible])
  ) as LayerState;

export function UnifiedOperationsMap({
  incidents,
  resources,
  onSelectIncident,
  onSelectResource,
}: UnifiedOperationsMapProps) {
  const [layers, setLayers] = useState<LayerState>(
    createInitialLayerState
  );

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

  const visibleResources = useMemo(
    () =>
      resources.filter((resource) => {
        const layer = getResourceLayer(resource.category);

        if (!layer) {
          return false;
        }

        return layers[layer];
      }),
    [resources, layers]
  );

  const resourceCounts = useMemo(
    () => countResourcesByLayer(resources),
    [resources]
  );

  const counts = useMemo<Partial<Record<LayerId, number>>>(
    () => ({
      incidents: locatedIncidents.length,
      ...resourceCounts,
      weather: 0,
      safeBenue: 0,
      aiDetections: 0,
      osiris: 0,
      drones: 0,
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

  const layerControls = (
    <MapLayerControls
      layers={layers}
      onChange={setLayers}
      counts={counts}
    />
  );

  if (points.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-4 p-4">
          {layerControls}

          <div className="p-6 text-center text-sm text-muted-foreground">
            No visible incidents or emergency resources with GPS coordinates
            to display.
          </div>
        </CardContent>
      </Card>
    );
  }

  const bounds = computeBounds(points);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        {layerControls}

        <LeafletMap
          incidents={visibleIncidents}
          resources={visibleResources}
          bounds={[
            [bounds.minLat, bounds.minLng],
            [bounds.maxLat, bounds.maxLng],
          ]}
          onSelectIncident={onSelectIncident}
          onSelectResource={onSelectResource}
        />

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {DEFAULT_LAYERS.filter(
            (layer) => layers[layer.id] && !layer.future
          ).map((layer) => (
            <span
              key={layer.id}
              className="flex items-center gap-1.5"
            >
              <span
                className="h-3 w-3 rounded-full border border-white shadow"
                style={{
                  backgroundColor: layer.color,
                }}
              />

              {layer.label}
            </span>
          ))}

          <span className="ml-auto">
            Layer Controls Enabled
          </span>
        </div>
      </CardContent>
    </Card>
  );
}