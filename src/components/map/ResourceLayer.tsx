import { CircleMarker, Popup } from "react-leaflet";

import type { EmergencyResource } from "@/types/resource";

interface ResourceLayerProps {
  resources: EmergencyResource[];
  onSelect?: (resource: EmergencyResource) => void;
}

const RESOURCE_STYLES: Record<
  string,
  {
    color: string;
    label: string;
  }
> = {
  hospital: {
    color: "#2563eb",
    label: "Hospital",
  },
  hospitals: {
    color: "#2563eb",
    label: "Hospital",
  },
  police: {
    color: "#4f46e5",
    label: "Police",
  },
  fire: {
    color: "#dc2626",
    label: "Fire Service",
  },
  shelter: {
    color: "#16a34a",
    label: "Shelter",
  },
  shelters: {
    color: "#16a34a",
    label: "Shelter",
  },
  warehouse: {
    color: "#ea580c",
    label: "Warehouse",
  },
  warehouses: {
    color: "#ea580c",
    label: "Warehouse",
  },
};

function getResourceStyle(category: string) {
  const normalizedCategory = category.trim().toLowerCase();

  return (
    RESOURCE_STYLES[normalizedCategory] ?? {
      color: "#64748b",
      label: category || "Emergency Resource",
    }
  );
}

export function ResourceLayer({
  resources,
  onSelect,
}: ResourceLayerProps) {
  return (
    <>
      {resources.map((resource, index) => {
        if (
          typeof resource.lat !== "number" ||
          typeof resource.lng !== "number"
        ) {
          return null;
        }

        const style = getResourceStyle(resource.category);

        const markerKey =
          "id" in resource && resource.id
            ? String(resource.id)
            : `${resource.category}-${resource.lat}-${resource.lng}-${index}`;

        return (
          <CircleMarker
            key={markerKey}
            center={[resource.lat, resource.lng]}
            radius={8}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: style.color,
              fillOpacity: 0.95,
            }}
            eventHandlers={{
              click: () => onSelect?.(resource),
            }}
          >
            <Popup>
              <div className="min-w-[190px] space-y-2">
                <div>
                  <p className="font-semibold">{style.label}</p>

                  {"name" in resource &&
                    typeof resource.name === "string" &&
                    resource.name && (
                      <p className="text-sm text-gray-700">
                        {resource.name}
                      </p>
                    )}

                  <p className="text-xs text-gray-500">
                    {resource.lat.toFixed(5)},{" "}
                    {resource.lng.toFixed(5)}
                  </p>
                </div>

                {onSelect && (
                  <button
                    type="button"
                    className="w-full rounded-md px-3 py-2 text-sm font-medium text-white"
                    style={{ backgroundColor: style.color }}
                    onClick={() => onSelect(resource)}
                  >
                    View resource details
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

export default ResourceLayer;