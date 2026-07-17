// components/ResourceMap.tsx
import { Card, CardContent } from "@/components/ui/card";
import { ResourceMarkers, computeBounds } from "./ResourceMarkers";
import type { EmergencyResource } from "../types/resource";

interface ResourceMapProps {
  resources: EmergencyResource[];
  onSelect: (resource: EmergencyResource) => void;
}

export function ResourceMap({ resources, onSelect }: ResourceMapProps) {
  if (resources.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          No resources to display.
        </CardContent>
      </Card>
    );
  }

  const bounds = computeBounds(resources);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="relative w-full h-80 bg-muted rounded-md overflow-hidden">
          <ResourceMarkers resources={resources} bounds={bounds} onSelect={onSelect} />
        </div>
        <p className="text-xs text-muted-foreground p-2">
          Placeholder map — swap for react-leaflet/Mapbox once the team agrees on a map library.
        </p>
      </CardContent>
    </Card>
  );
}
