// components/CommunityDashboard.tsx

import { useMemo, useState } from "react";

import { useIncidents } from "../hooks/useIncidents";
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
import { CommunityMap } from "./CommunityMap";
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

import type { Incident, IncidentFilters } from "../types/incident";
import { useLanguage } from "@/hooks/useLanguage";

export function CommunityDashboard() {
  const { t } = useLanguage();

  const {
    incidents,
    isLoading,
    updateIncidentStatus,
    assignResponder,
  } = useIncidents();

  const [filters, setFilters] = useState<IncidentFilters>({});
  const [selected, setSelected] = useState<Incident | null>(null);

  const filtered = useMemo(
    () => sortByMostRecent(filterIncidents(incidents, filters)),
    [incidents, filters]
  );

  const stats = useMemo(
    () => computeStats(incidents),
    [incidents]
  );

  const selectedLive = selected
    ? incidents.find((incident) => incident.id === selected.id) ?? null
    : null;

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

            <TabsContent value="feed" className="space-y-3">
              <AlertFilters
                filters={filters}
                onChange={setFilters}
              />

              <AlertFeed
                incidents={filtered}
                selectedId={selectedLive?.id}
                onSelect={setSelected}
              />
            </TabsContent>

            <TabsContent value="map">
              <CommunityMap
                incidents={filtered}
                onSelect={setSelected}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">

          {/* Emergency Resources */}
          <NearbyResources />

          {/* Incident Details */}
          <Card>
            {selectedLive ? (
              <>
                <CardHeader>
                  <CardTitle className="text-base">
                    {selectedLive.title}
                  </CardTitle>

                  <p className="text-xs text-muted-foreground">
                    {selectedLive.location.address ??
                      selectedLive.location.manualEntry ??
                      "Location pending"}
                  </p>
                </CardHeader>

                <CardContent className="space-y-5">

                  <p className="text-sm">
                    {selectedLive.description}
                  </p>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold">
                      Timeline
                    </h3>

                    <IncidentTimeline
                      incident={selectedLive}
                    />
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold">
                      Response
                    </h3>

                    <ResponseTracking
                      incident={selectedLive}
                      onUpdateStatus={updateIncidentStatus}
                      onAssignResponder={assignResponder}
                    />
                  </div>

                </CardContent>
              </>
            ) : (
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                Select an incident from the feed or map to view
                details and manage the response.
              </CardContent>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
}