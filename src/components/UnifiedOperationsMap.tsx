import { useMemo, useState } from "react";
import {
  Activity,
  Database,
  Layers3,
  MapPin,
  Radio,
  Satellite,
} from "lucide-react";

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

        return Boolean(layers[layer]);
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

  const enabledLayers = useMemo(
    () =>
      DEFAULT_LAYERS.filter(
        (layer) => layers[layer.id] && !layer.future
      ),
    [layers]
  );

  const activeLayerCount = enabledLayers.length;
  const visibleMarkerCount =
    visibleIncidents.length + visibleResources.length;

  const layerControls = (
    <MapLayerControls
      layers={layers}
      onChange={setLayers}
      counts={counts}
    />
  );

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-500/10 p-2 text-green-600 dark:text-green-400">
              <Satellite
                className="h-4 w-4"
                aria-hidden="true"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">
                  Unified Operations Map
                </p>

                <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-400">
                  <Radio
                    className="h-2.5 w-2.5"
                    aria-hidden="true"
                  />
                  Operational
                </span>
              </div>

              <p className="mt-0.5 text-xs text-muted-foreground">
                Incident and emergency-resource visibility across the
                operational area.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Layers3
                className="h-3.5 w-3.5"
                aria-hidden="true"
              />
              <strong className="font-medium text-foreground">
                {activeLayerCount}
              </strong>
              active layers
            </span>

            <span className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin
                className="h-3.5 w-3.5"
                aria-hidden="true"
              />
              <strong className="font-medium text-foreground">
                {visibleMarkerCount}
              </strong>
              visible markers
            </span>
          </div>
        </div>

        {layerControls}

        {points.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-12 text-center">
            <MapPin
              className="mx-auto h-8 w-8 text-muted-foreground"
              aria-hidden="true"
            />

            <p className="mt-3 text-sm font-medium">
              No Operational Markers Visible
            </p>

            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">
              No incidents or emergency resources with GPS coordinates
              are available for the currently enabled map layers.
            </p>

            <p className="mt-3 text-[11px] text-muted-foreground">
              Enable another layer or wait for synchronised field data.
            </p>
          </div>
        ) : (
          <>
            {(() => {
              const bounds = computeBounds(points);

              return (
                <div className="relative overflow-hidden rounded-lg border">
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

                  <div className="pointer-events-none absolute left-3 top-3 z-[400]">
                    <div className="flex items-center gap-2 rounded-md border bg-background/90 px-2.5 py-1.5 text-[11px] shadow-sm backdrop-blur">
                      <Activity
                        className="h-3.5 w-3.5 text-green-500"
                        aria-hidden="true"
                      />

                      <span className="font-medium">
                        Live operational view
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div
              className="rounded-lg border bg-muted/20 p-3"
              aria-label="Map layer legend"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium">
                    Active Layer Legend
                  </p>

                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Marker colours correspond to enabled operational
                    layers.
                  </p>
                </div>

                <span className="text-[11px] text-muted-foreground">
                  {visibleMarkerCount} markers
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {enabledLayers.map((layer) => (
                  <span
                    key={layer.id}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <span
                      className="h-3 w-3 rounded-full border border-background shadow-sm"
                      style={{
                        backgroundColor: layer.color,
                      }}
                      aria-hidden="true"
                    />

                    {layer.label}

                    <span className="text-[10px]">
                      ({counts[layer.id] ?? 0})
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 text-xs sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <Activity
              className="h-3.5 w-3.5 text-green-500"
              aria-hidden="true"
            />

            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Map Engine
              </p>

              <p className="font-medium">
                Operational
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Database
              className="h-3.5 w-3.5 text-muted-foreground"
              aria-hidden="true"
            />

            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Data Source
              </p>

              <p className="font-medium">
                Current Dataset
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Radio
              className="h-3.5 w-3.5 text-muted-foreground"
              aria-hidden="true"
            />

            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Synchronisation
              </p>

              <p className="font-medium">
                Awaiting Live Integration
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}