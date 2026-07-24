// components/CommunityDashboard.tsx

import { useMemo, useState } from "react";

import { useLanguage } from "@/hooks/useLanguage";
import { useIncidents } from "../hooks/useIncidents";
import { useResources } from "../hooks/useResources";

import {
  computeStats,
  filterIncidents,
  sortByMostRecent,
} from "../lib/incidentUtils";

import { EmergencyStatusBoard } from "./EmergencyStatusBoard";
import { AlertFeed } from "./AlertFeed";
import { AlertFilters } from "./AlertFilters";
import { IncidentTimeline } from "./IncidentTimeline";
import { ResponseTracking } from "./ResponseTracking";
import { UnifiedOperationsMap } from "./UnifiedOperationsMap";
import { ResourceDetails } from "./ResourceDetails";
import { NearbyResources } from "./NearbyResources";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import type {
  Incident,
  IncidentFilters,
} from "../types/incident";

import type { EmergencyResource } from "../types/resource";

export function CommunityDashboard() {
  const { t } = useLanguage();

  const {
    incidents,
    isLoading,
    updateIncidentStatus,
    assignResponder,
  } = useIncidents();

  const {
    resources,
    isLoading: resourcesLoading,
  } = useResources();

  const [filters, setFilters] = useState<IncidentFilters>({});

  const [selectedIncident, setSelectedIncident] =
    useState<Incident | null>(null);

  const [selectedResource, setSelectedResource] =
    useState<EmergencyResource | null>(null);

  const filteredIncidents = useMemo(
    () =>
      sortByMostRecent(
        filterIncidents(incidents, filters)
      ),
    [incidents, filters]
  );

  const stats = useMemo(
    () => computeStats(incidents),
    [incidents]
  );

  // Keep the selected incident synchronized with live updates.
  const selectedLiveIncident = selectedIncident
    ? incidents.find(
        (incident) => incident.id === selectedIncident.id
      ) ?? null
    : null;

  // Keep the selected resource synchronized with live updates.
  const selectedLiveResource = selectedResource
    ? resources.find(
        (resource) => resource.id === selectedResource.id
      ) ?? null
    : null;

  const handleSelectIncident = (incident: Incident) => {
    setSelectedIncident(incident);
    setSelectedResource(null);
  };

  const handleSelectResource = (
    resource: EmergencyResource
  ) => {
    setSelectedResource(resource);
    setSelectedIncident(null);
  };

  const handleCloseResourceDetails = () => {
    setSelectedResource(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <h1 className="text-xl font-bold">
        {t("communityDashboard")}
      </h1>

      <EmergencyStatusBoard
        stats={stats}
        isLoading={isLoading}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* LEFT COLUMN */}
        <div className="space-y-4">
          <Tabs defaultValue="feed">
            <TabsList>
              <TabsTrigger value="feed">
                {t("alertFeed")}
              </TabsTrigger>

              <TabsTrigger value="map">
                {t("liveMap")}
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="feed"
              className="space-y-3"
            >
              <AlertFilters
                filters={filters}
                onChange={setFilters}
              />

              <AlertFeed
                incidents={filteredIncidents}
                selectedId={selectedLiveIncident?.id}
                onSelect={handleSelectIncident}
              />
            </TabsContent>

            <TabsContent value="map">
              {resourcesLoading ? (
                <Card>
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    Loading emergency operations map...
                  </CardContent>
                </Card>
              ) : (
                <UnifiedOperationsMap
                  incidents={filteredIncidents}
                  resources={resources}
                  onSelectIncident={handleSelectIncident}
                  onSelectResource={handleSelectResource}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          <NearbyResources />

          {selectedLiveIncident ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {selectedLiveIncident.title}
                </CardTitle>

                <p className="text-xs text-muted-foreground">
                  {selectedLiveIncident.location.address ??
                    selectedLiveIncident.location.manualEntry ??
                    "Location pending"}
                </p>
              </CardHeader>

              <CardContent className="space-y-5">
                <p className="text-sm">
                  {selectedLiveIncident.description}
                </p>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">
                    Timeline
                  </h3>

                  <IncidentTimeline
                    incident={selectedLiveIncident}
                  />
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">
                    Response
                  </h3>

                  <ResponseTracking
                    incident={selectedLiveIncident}
                    onUpdateStatus={updateIncidentStatus}
                    onAssignResponder={assignResponder}
                  />
                </div>
              </CardContent>
            </Card>
          ) : selectedLiveResource ? (
            <ResourceDetails
              resource={selectedLiveResource}
              onClose={handleCloseResourceDetails}
            />
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                Select an incident from the feed or map, or select an
                emergency resource on the map to view its details.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}