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
    color: "#dc2626",
    label: "Hospital",
  },
  clinic: {
    color: "#e11d48",
    label: "Clinic",
  },
  police_station: {
    color: "#4f46e5",
    label: "Police Station",
  },
  military_base: {
    color: "#334155",
    label: "Military Base",
  },
  civil_defence: {
    color: "#4338ca",
    label: "Civil Defence",
  },
  fire_service: {
    color: "#ea580c",
    label: "Fire Service",
  },
  ambulance_service: {
    color: "#ef4444",
    label: "Ambulance",
  },
  safe_shelter: {
    color: "#16a34a",
    label: "Safe Shelter",
  },
  idp_camp: {
    color: "#ca8a04",
    label: "IDP Camp",
  },
  food_distribution: {
    color: "#d97706",
    label: "Food Centre",
  },
  water_point: {
    color: "#0891b2",
    label: "Water Point",
  },
  relief_warehouse: {
    color: "#57534e",
    label: "Relief Warehouse",
  },
  community_hall: {
    color: "#0d9488",
    label: "Community Hall",
  },
  lg_emergency_office: {
    color: "#9333ea",
    label: "LG Emergency Office",
  },
  blood_bank: {
    color: "#b91c1c",
    label: "Blood Bank",
  },
  pharmacy: {
    color: "#059669",
    label: "Pharmacy",
  },
  rescue_station: {
    color: "#0284c7",
    label: "Rescue Station",
  },
  evacuation_point: {
    color: "#4d7c0f",
    label: "Evacuation Point",
  },
  watch_group_base: {
    color: "#3f3f46",
    label: "Watch Group Base",
  },
  command_centre: {
    color: "#7e22ce",
    label: "Command Centre",
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
