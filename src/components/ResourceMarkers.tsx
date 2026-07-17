// components/ResourceMarkers.tsx
//
// This is the reusable piece for the Community Dashboard integration.
// It only renders markers absolutely positioned within a bounding box —
// it does NOT render its own map container, so it can be dropped inside
// any parent map (this module's ResourceMap, or Christopher's
// CommunityDashboard CommunityMap) as long as the parent passes the same
// bounding box math it uses for its own markers.
//
// If the team standardizes on a real map library (react-leaflet, Mapbox GL),
// this component should be rewritten as a set of <Marker> elements instead —
// the props stay the same.

import { RESOURCE_CATEGORY_CONFIG } from "../config/resourceConfig";
import type { EmergencyResource } from "../types/resource";

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

interface ResourceMarkersProps {
  resources: EmergencyResource[];
  bounds: MapBounds;
  onSelect: (resource: EmergencyResource) => void;
}

export function ResourceMarkers({ resources, bounds, onSelect }: ResourceMarkersProps) {
  const latRange = bounds.maxLat - bounds.minLat || 1;
  const lngRange = bounds.maxLng - bounds.minLng || 1;

  return (
    <>
      {resources.map((res) => {
        const top = 90 - ((res.lat - bounds.minLat) / latRange) * 80;
        const left = 10 + ((res.lng - bounds.minLng) / lngRange) * 80;
        const cfg = RESOURCE_CATEGORY_CONFIG[res.category];

        return (
          <button
            key={res.id}
            onClick={() => onSelect(res)}
            title={res.name}
            className="absolute flex items-center justify-center w-6 h-6 rounded-full border-2 border-white shadow text-xs bg-white"
            style={{ top: `${top}%`, left: `${left}%` }}
          >
            <span className={`flex items-center justify-center w-full h-full rounded-full ${cfg.color} bg-opacity-90`}>
              {cfg.icon}
            </span>
          </button>
        );
      })}
    </>
  );
}

// Helper so both this module and the dashboard compute bounds the same way.
export function computeBounds(points: Array<{ lat: number; lng: number }>): MapBounds {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}
