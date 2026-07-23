// components/EmergencyResourceMap.tsx

import { useState, useMemo } from "react";
import { useResources, useUserLocation } from "../hooks/useResources";
import { filterResources, sortByDistance } from "../lib/resourceUtils";
import { ResourceFilters } from "./ResourceFilters";
import { ResourceList } from "./ResourceList";
import { ResourceMap } from "./ResourceMap";
import { ResourceStats } from "./ResourceStats";
import { Button } from "@/components/ui/button";
import { ResourceDetails } from "./ResourceDetails";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import type {
  EmergencyResource,
  ResourceFilters as ResourceFiltersType,
} from "../types/resource";

export function EmergencyResourceMap() {
  const { resources, isLoading } = useResources();
  const {
    location,
    status: locationStatus,
    requestLocation,
  } = useUserLocation();

  const [filters, setFilters] = useState<ResourceFiltersType>({});
  const [selected, setSelected] =
    useState<EmergencyResource | null>(null);

  const filtered = useMemo(
    () => filterResources(resources, filters),
    [resources, filters]
  );

  // Sort by distance when the user shares their location.
  const displayed = useMemo(() => {
    if (location) {
      return sortByDistance(filtered, location.lat, location.lng);
    }

    return filtered;
  }, [filtered, location]);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">
          Emergency Resource Map
        </h1>

        <Button
          variant="outline"
          size="sm"
          onClick={requestLocation}
          disabled={locationStatus === "requesting"}
        >
          {locationStatus === "granted"
            ? "📍 Sorted by distance"
            : locationStatus === "requesting"
            ? "Getting location..."
            : "📍 Show nearest to me"}
        </Button>
      </div>

      {/* Statistics Dashboard */}
      <ResourceStats resources={resources} />

      {/* Filters */}
      <ResourceFilters
        filters={filters}
        onChange={setFilters}
      />

      {/* Tabs */}
      <Tabs defaultValue="list">

        <TabsList>
          <TabsTrigger value="list">
            List
          </TabsTrigger>

          <TabsTrigger value="map">
            Map
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-4">
              Loading resources...
            </p>
          ) : (
            <ResourceList
              resources={displayed}
              selectedId={selected?.id}
              onSelect={setSelected}
            />
          )}
        </TabsContent>

        <TabsContent value="map">
          <ResourceMap
            resources={displayed}
            onSelect={setSelected}
          />
        </TabsContent>

      </Tabs>
      <ResourceDetails
  resource={selected}
  onClose={() => setSelected(null)}
/>

      {locationStatus === "denied" && (
        <p className="text-xs text-muted-foreground">
          Location access was denied — showing all resources
          unsorted. You can still search and filter manually.
        </p>
      )}

    </div>
  );
}