import { CircleMarker, Popup } from "react-leaflet";

import type { Incident } from "@/types/incident";

interface IncidentLayerProps {
  incidents: Incident[];
  onSelect?: (incident: Incident) => void;
}

export function IncidentLayer({
  incidents,
  onSelect,
}: IncidentLayerProps) {
  return (
    <>
      {incidents.map((incident, index) => {
        const { lat, lng } = incident.location;

        if (lat === undefined || lng === undefined) {
          return null;
        }

        const markerKey =
          "id" in incident && incident.id
            ? String(incident.id)
            : `${lat}-${lng}-${index}`;

        return (
          <CircleMarker
            key={markerKey}
            center={[lat, lng]}
            radius={9}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: "#dc2626",
              fillOpacity: 0.9,
            }}
            eventHandlers={{
              click: () => onSelect?.(incident),
            }}
          >
            <Popup>
              <div className="min-w-[180px] space-y-2">
                <div>
                  <p className="font-semibold">Reported Incident</p>
                  <p className="text-xs text-gray-500">
                    {lat.toFixed(5)}, {lng.toFixed(5)}
                  </p>
                </div>

                {onSelect && (
                  <button
                    type="button"
                    className="w-full rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                    onClick={() => onSelect(incident)}
                  >
                    View incident details
                  </button>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

export default IncidentLayer;