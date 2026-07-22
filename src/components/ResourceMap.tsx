// components/ResourceMap.tsx
import { Card, CardContent } from "@/components/ui/card";
import { GoogleResourceMap } from "./GoogleResourceMap";
import type { EmergencyResource } from "../types/resource";

interface UserLocation {
  lat: number;
  lng: number;
}

interface ResourceMapProps {
  resources: EmergencyResource[];
  selectedId?: string;
  userLocation?: UserLocation | null;
  onSelect: (resource: EmergencyResource) => void;
}

export function ResourceMap({
  resources,
  selectedId,
  userLocation,
  onSelect,
}: ResourceMapProps) {
  if (resources.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          No resources to display.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <GoogleResourceMap
          resources={resources}
          selectedId={selectedId}
          userLocation={userLocation}
          onSelect={onSelect}
        />

        <p className="p-2 text-xs text-muted-foreground">
          Select a marker to view the corresponding emergency
          resource.
        </p>
      </CardContent>
    </Card>
  );
}