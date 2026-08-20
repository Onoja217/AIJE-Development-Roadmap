import type { LatLngBoundsExpression } from "leaflet";
import { LocateFixed, MapPin } from "lucide-react";

import { LeafletMap } from "@/components/map/LeafletMap";
import { Card, CardContent } from "@/components/ui/card";
import type { EmergencyResource } from "@/types/resource";

interface UserLocation {
  lat: number;
  lng: number;
}

interface ResourceMapProps {
  resources: EmergencyResource[];
  userLocation?: UserLocation | null;
  onSelect: (resource: EmergencyResource) => void;
}

function getMapBounds(
  resources: EmergencyResource[],
  userLocation?: UserLocation | null,
): LatLngBoundsExpression | undefined {
  const points = resources
    .filter(
      (resource) =>
        Number.isFinite(resource.lat) && Number.isFinite(resource.lng),
    )
    .map((resource) => [resource.lat, resource.lng] as [number, number]);

  if (userLocation) {
    points.push([userLocation.lat, userLocation.lng]);
  }

  return points.length > 0 ? points : undefined;
}

export function ResourceMap({
  resources,
  userLocation,
  onSelect,
}: ResourceMapProps) {
  const bounds = getMapBounds(resources, userLocation);

  if (!bounds) {
    return (
      <Card>
        <CardContent className="px-6 py-12 text-center">
          <MapPin
            className="mx-auto h-8 w-8 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm font-medium">
            No mapped resources found
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Change the filters or share your location to open the map.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="relative isolate">
          <LeafletMap
            resources={resources}
            userLocation={userLocation}
            bounds={bounds}
            className="h-[28rem] rounded-none border-0"
            onSelectResource={onSelect}
          />

          <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-md border bg-background/90 px-2.5 py-1.5 text-xs shadow-sm backdrop-blur">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live resource map
          </div>

          {userLocation && (
            <div className="pointer-events-none absolute bottom-6 left-3 z-10 flex items-center gap-1.5 rounded-md border bg-background/90 px-2.5 py-1.5 text-xs shadow-sm backdrop-blur">
              <LocateFixed className="h-3.5 w-3.5 text-blue-500" />
              Your location is included
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
