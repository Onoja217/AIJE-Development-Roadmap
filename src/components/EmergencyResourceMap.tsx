// components/EmergencyResourceMap.tsx
import { useMemo, useState } from "react";
import { useResources, useUserLocation } from "../hooks/useResources";
import { filterResources, sortByDistance } from "../lib/resourceUtils";
import { ResourceFilters } from "./ResourceFilters";
import { ResourceList } from "./ResourceList";
import { ResourceMap } from "./ResourceMap";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
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

  const [filters, setFilters] =
    useState<ResourceFiltersType>({});

  const [selected, setSelected] =
    useState<EmergencyResource | null>(null);

  const filteredResources = useMemo(
    () => filterResources(resources, filters),
    [resources, filters]
  );

  const displayedResources = useMemo(() => {
    if (!location) {
      return filteredResources;
    }

    return sortByDistance(
      filteredResources,
      location.lat,
      location.lng
    );
  }, [filteredResources, location]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
              ? "Getting location…"
              : "📍 Show nearest to me"}
        </Button>
      </div>

      <ResourceFilters
        filters={filters}
        onChange={setFilters}
      />

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
            <p className="p-4 text-sm text-muted-foreground">
              Loading resources…
            </p>
          ) : (
            <ResourceList
              resources={displayedResources}
              selectedId={selected?.id}
              onSelect={setSelected}
            />
          )}
        </TabsContent>

        <TabsContent value="map">
          <ResourceMap
            resources={displayedResources}
            selectedId={selected?.id}
            userLocation={location}
            onSelect={setSelected}
          />
        </TabsContent>
      </Tabs>

      {locationStatus === "denied" && (
        <p className="text-xs text-muted-foreground">
          Location access was denied — showing all resources
          unsorted. You can still search and filter manually.
        </p>
      )}
    </div>
  );
}