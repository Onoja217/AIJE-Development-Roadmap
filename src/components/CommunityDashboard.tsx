// components/CommunityDashboard.tsx

import { useMemo, useState } from "react";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  MapPin,
  Radio,
  ShieldCheck,
} from "lucide-react";

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">
            {t("communityDashboard")}
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Monitor incidents, emergency resources and coordinated
            response operations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400">
            <Activity className="h-3.5 w-3.5" />
            System Operational
          </span>

          <span className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            Demo Dataset
          </span>

          <span className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            Updated Just Now
          </span>
        </div>
      </div>

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
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </div>

                  <div>
                    <CardTitle className="text-base">
                      Operations Centre
                    </CardTitle>

                    <p className="mt-1 text-xs text-muted-foreground">
                      No active incident or emergency resource selected.
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <section>
                  <h3 className="mb-3 text-sm font-semibold">
                    Select an operational item
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />

                      <div>
                        <p className="text-sm font-medium">
                          Incident
                        </p>

                        <p className="text-xs text-muted-foreground">
                          Select an incident from the Alert Feed or
                          Live Map.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <MapPin className="h-4 w-4 shrink-0 text-blue-500" />

                      <div>
                        <p className="text-sm font-medium">
                          Emergency Resource
                        </p>

                        <p className="text-xs text-muted-foreground">
                          Select a hospital, police station, shelter
                          or emergency resource.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 text-sm font-semibold">
                    Available Operations
                  </h3>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    {[
                      "Review Incident Timeline",
                      "Monitor Response Progress",
                      "Assign Emergency Responders",
                      "Review Resource Information",
                      "Coordinate Community Alerts",
                    ].map((operation) => (
                      <div
                        key={operation}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                        <span>{operation}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border bg-muted/30 p-4">
                  <h3 className="mb-3 text-sm font-semibold">
                    System Status
                  </h3>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Activity className="h-4 w-4 shrink-0 text-green-500" />
                        Status
                      </span>

                      <span className="font-medium text-green-600 dark:text-green-400">
                        Operational
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Database className="h-4 w-4 shrink-0" />
                        Mode
                      </span>

                      <span className="font-medium">
                        Demo Dataset
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Radio className="h-4 w-4 shrink-0" />
                        Backend
                      </span>

                      <span className="text-right font-medium">
                        Awaiting Live Sync
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    Live synchronisation with SafeBenue and Osiris
                    Intelligence will be enabled during the
                    integration phase.
                  </p>
                </section>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}