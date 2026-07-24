// components/UnifiedOperationsMap.tsx

import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";

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

  const locatedIncidents = incidents.filter(
    (incident) =>
      incident.location.lat !== undefined &&
      incident.location.lng !== undefined
  );

  const visibleResources = useMemo(() => {
    return resources.filter((resource) => {
      switch (resource.category) {
        case "hospital":
        case "clinic":
        case "blood_bank":
        case "pharmacy":
        case "ambulance_service":
          return layers.hospitals;

        case "police_station":
        case "military_base":
        case "civil_defence":
        case "watch_group_base":
        case "command_centre":
          return layers.police;

        case "fire_service":
        case "rescue_station":
          return layers.fire;

        case "safe_shelter":
        case "idp_camp":
        case "community_hall":
        case "evacuation_point":
          return layers.shelters;

        case "relief_warehouse":
        case "food_distribution":
        case "water_point":
        case "lg_emergency_office":
          return layers.warehouses;

        default:
          return true;
      }
    });
  }, [resources, layers]);

  const points = [
    ...locatedIncidents.map((incident) => ({
      lat: incident.location.lat!,
      lng: incident.location.lng!,
    })),

    ...visibleResources.map((resource) => ({
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

  const counts = {
    incidents: locatedIncidents.length,

    hospitals: resources.filter((r) =>
      [
        "hospital",
        "clinic",
        "blood_bank",
        "pharmacy",
        "ambulance_service",
      ].includes(r.category)
    ).length,

    police: resources.filter((r) =>
      [
        "police_station",
        "military_base",
        "civil_defence",
        "watch_group_base",
        "command_centre",
      ].includes(r.category)
    ).length,

    fire: resources.filter((r) =>
      ["fire_service", "rescue_station"].includes(r.category)
    ).length,

    shelters: resources.filter((r) =>
      [
        "safe_shelter",
        "idp_camp",
        "community_hall",
        "evacuation_point",
      ].includes(r.category)
    ).length,

    warehouses: resources.filter((r) =>
      [
        "relief_warehouse",
        "food_distribution",
        "water_point",
        "lg_emergency_office",
      ].includes(r.category)
    ).length,
  };

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
              incidents={locatedIncidents}
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

          <span className="ml-auto">
            Layer Controls Enabled
          </span>
        </div>
      </CardContent>
    </Card>
  );
}