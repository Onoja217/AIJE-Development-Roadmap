import { useEffect } from "react";
import type {
  LatLngBoundsExpression,
  LatLngExpression,
} from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import type { Incident } from "@/types/incident";
import type { EmergencyResource } from "@/types/resource";

import { IncidentLayer } from "./IncidentLayer";
import { ResourceLayer } from "./ResourceLayer";

const BENUE_STATE_CENTER: LatLngExpression = [7.3369, 8.7404];

interface LeafletMapProps {
  incidents?: Incident[];
  resources?: EmergencyResource[];
  bounds?: LatLngBoundsExpression;
  center?: LatLngExpression;
  zoom?: number;
  className?: string;
  userLocation?: { lat: number; lng: number } | null;
  onSelectIncident?: (incident: Incident) => void;
  onSelectResource?: (resource: EmergencyResource) => void;
}

interface FitMapBoundsProps {
  bounds?: LatLngBoundsExpression;
}

function FitMapBounds({ bounds }: FitMapBoundsProps) {
  const map = useMap();

  useEffect(() => {
    if (!bounds) return;

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
  userLocation,
  onSelectIncident,
  onSelectResource,
}: LeafletMapProps) {
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
        {/* Base Map */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Incident Markers */}
        <IncidentLayer
          incidents={incidents}
          onSelect={onSelectIncident}
        />

        {/* Emergency Resources */}
        <ResourceLayer
          resources={resources}
          onSelect={onSelectResource}
        />

        {userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={9}
            pathOptions={{
              color: "#ffffff",
              weight: 3,
              fillColor: "#2563eb",
              fillOpacity: 1,
            }}
          >
            <Popup>
              <p className="font-semibold">Your location</p>
              <p className="text-xs text-gray-500">
                Used only to find nearby emergency resources.
              </p>
            </Popup>
          </CircleMarker>
        )}

        {/* Auto Zoom */}
        <FitMapBounds bounds={bounds} />
      </MapContainer>
    </div>
  );
}

export default LeafletMap;
