// components/IncidentMarkers.tsx
//
// Reusable incident marker layer for the Unified Operations Map.
// This component does not render a map container. It only positions
// incident markers inside a parent that provides shared geographic bounds.
//
// Resource markers and incident markers can therefore use the same
// coordinate system without duplicating map calculations.

import { PRIORITY_CONFIG } from "../config/dashboardConfig";
import type { Incident } from "../types/incident";
import type { MapBounds } from "./ResourceMarkers";

interface IncidentMarkersProps {
  incidents: Incident[];
  bounds: MapBounds;
  onSelect: (incident: Incident) => void;
}

export function IncidentMarkers({
  incidents,
  bounds,
  onSelect,
}: IncidentMarkersProps) {
  const latRange = bounds.maxLat - bounds.minLat || 1;
  const lngRange = bounds.maxLng - bounds.minLng || 1;

  const locatedIncidents = incidents.filter(
    (incident) =>
      incident.location.lat !== undefined &&
      incident.location.lng !== undefined
  );

  return (
    <>
      {locatedIncidents.map((incident) => {
        const lat = incident.location.lat!;
        const lng = incident.location.lng!;

        const top =
          90 - ((lat - bounds.minLat) / latRange) * 80;

        const left =
          10 + ((lng - bounds.minLng) / lngRange) * 80;

        const priorityConfig =
          PRIORITY_CONFIG[incident.priority];

        return (
          <button
            key={incident.id}
            type="button"
            onClick={() => onSelect(incident)}
            title={`${incident.title} — ${incident.priority} priority`}
            aria-label={`View incident: ${incident.title}`}
            className={[
              "absolute z-20",
              "flex h-5 w-5 items-center justify-center",
              "rounded-full border-2 border-white shadow-md",
              "transition-transform hover:scale-125",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              priorityConfig.color,
            ].join(" ")}
            style={{
              top: `${top}%`,
              left: `${left}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          </button>
        );
      })}
    </>
  );
}
