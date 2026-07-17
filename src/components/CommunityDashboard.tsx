// components/CommunityDashboard.tsx
import { useState, useMemo } from "react";
import { useIncidents } from "../hooks/useIncidents";
import { filterIncidents, computeStats, sortByMostRecent } from "../lib/incidentUtils";
import { EmergencyStatusBoard } from "./EmergencyStatusBoard";
import { AlertFeed } from "./AlertFeed";
import { AlertFilters } from "./AlertFilters";
import { IncidentTimeline } from "./IncidentTimeline";
import { ResponseTracking } from "./ResponseTracking";
import { CommunityMap } from "./CommunityMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Incident, IncidentFilters } from "../types/incident";

export function CommunityDashboard() {
  const { incidents, isLoading, updateIncidentStatus, assignResponder } = useIncidents();
  const [filters, setFilters] = useState<IncidentFilters>({});
  const [selected, setSelected] = useState<Incident | null>(null);

  const filtered = useMemo(
    () => sortByMostRecent(filterIncidents(incidents, filters)),
    [incidents, filters]
  );
  const stats = useMemo(() => computeStats(incidents), [incidents]);

  // Keep the selected incident's details in sync as its status changes.
  const selectedLive = selected ? incidents.find((i) => i.id === selected.id) ?? null : null;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">Community Emergency Dashboard</h1>

      <EmergencyStatusBoard stats={stats} isLoading={isLoading} />

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          <Tabs defaultValue="feed">
            <TabsList>
              <TabsTrigger value="feed">Alert Feed</TabsTrigger>
              <TabsTrigger value="map">Live Map</TabsTrigger>
            </TabsList>

            <TabsContent value="feed" className="space-y-3">
              <AlertFilters filters={filters} onChange={setFilters} />
              <AlertFeed incidents={filtered} selectedId={selectedLive?.id} onSelect={setSelected} />
            </TabsContent>

            <TabsContent value="map">
              <CommunityMap incidents={filtered} onSelect={setSelected} />
            </TabsContent>
          </Tabs>
        </div>

        <div>
          {selectedLive ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{selectedLive.title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {selectedLive.location.address ?? selectedLive.location.manualEntry ?? "Location pending"}
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm">{selectedLive.description}</p>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Timeline</h3>
                  <IncidentTimeline incident={selectedLive} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Response</h3>
                  <ResponseTracking
                    incident={selectedLive}
                    onUpdateStatus={updateIncidentStatus}
                    onAssignResponder={assignResponder}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground text-center">
                Select an incident from the feed or map to view details and manage the response.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
