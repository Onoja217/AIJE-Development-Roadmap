import { useEffect } from "react";
import type {
  LatLngBoundsExpression,
  LatLngExpression,
} from "leaflet";
import {
  MapContainer,
  TileLayer,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import type { Incident } from "@/types/incident";
import type { EmergencyResource } from "@/types/resource";

const BENUE_STATE_CENTER: LatLngExpression = [7.3369, 8.7404];

interface LeafletMapProps {
  incidents?: Incident[];
  resources?: EmergencyResource[];
  bounds?: LatLngBoundsExpression;
  center?: LatLngExpression;
  zoom?: number;
  className?: string;
  onSelectIncident?: (incident: Incident) => void;
  onSelectResource?: (resource: EmergencyResource) => void;
}

interface FitMapBoundsProps {
  bounds?: LatLngBoundsExpression;
}

function FitMapBounds({ bounds }: FitMapBoundsProps) {
  const map = useMap();

  useEffect(() => {
    if (!bounds) {
      return;
    }

    map.fitBounds(bounds, {
      padding: [32, 32],
      maxZoom: 14,
    });
  }, [bounds, map]);

  return null;
}

export function LeafletMap({
  incidents = [],
  resources = [],
  bounds,
  center = BENUE_STATE_CENTER,
  zoom = 8,
  className = "",
  onSelectIncident,
  onSelectResource,
}: LeafletMapProps) {
  // These props will be used when real Leaflet markers are introduced
  // in the next migration phase.
  void incidents;
  void resources;
  void onSelectIncident;
  void onSelectResource;

  return (
    <div
      className={[
        "relative h-80 w-full overflow-hidden rounded-md border bg-muted",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitMapBounds bounds={bounds} />
      </MapContainer>
    </div>
  );
}

export default LeafletMap;