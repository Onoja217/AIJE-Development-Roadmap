import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Building2,
  Hospital,
  Loader2,
  MapPin,
  Navigation,
  Radio,
  RefreshCw,
  Shield,
  TentTree,
} from "lucide-react";

import { useResources, useUserLocation } from "@/hooks/useResources";
import { sortByDistance } from "@/lib/resourceUtils";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type {
  EmergencyResource,
  ResourceCategory,
} from "@/types/resource";

const categoryIcons: Partial<Record<ResourceCategory, typeof Hospital>> = {
  hospital: Hospital,
  clinic: Hospital,
  police_station: Shield,
  safe_shelter: TentTree,
  idp_camp: TentTree,
  community_hall: Building2,
  lg_emergency_office: Building2,
  command_centre: Building2,
};

function getDistanceLabel(distance: number) {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m away`;
  }

  return `${distance.toFixed(1)} km away`;
}

export function NearbyResources() {
  const { resources, isLoading } = useResources();

  const {
    location,
    status: locationStatus,
    requestLocation,
  } = useUserLocation();

  const nearbyResources = useMemo(() => {
    const eligibleResources = resources.filter(
      (resource) =>
        resource.status === "active" &&
        resource.verificationStatus === "verified"
    );

    if (!location) {
      return [];
    }

    return sortByDistance(
      eligibleResources,
      location.lat,
      location.lng
    ).slice(0, 5);
  }, [resources, location]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">
            Nearby Emergency Resources
          </CardTitle>

          <p className="mt-1 text-xs text-muted-foreground">
            Closest verified emergency facilities available for response.
          </p>
        </div>

        <Button
          asChild
          size="sm"
          variant="outline"
        >
          <Link to="/resources">View All</Link>
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />

            <p className="text-sm text-muted-foreground">
              Loading emergency resources...
            </p>
          </div>
        ) : !location ? (
          <div className="space-y-4 py-6 text-center">
            <Navigation className="mx-auto h-6 w-6 text-muted-foreground" />

            <div>
              <p className="text-sm font-semibold">
                Location Required
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Enable location access to locate the nearest emergency
                resources around your current position.
              </p>
            </div>

            {locationStatus === "denied" && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Location permission was denied. Please enable it in
                your browser settings and try again.
              </p>
            )}

            <Button
              size="sm"
              onClick={requestLocation}
              disabled={locationStatus === "requesting"}
            >
              {locationStatus === "requesting" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <Navigation className="mr-2 h-4 w-4" />
                  Use My Location
                </>
              )}
            </Button>
          </div>
        ) : nearbyResources.length === 0 ? (
          <div className="space-y-3 py-8 text-center">
            <MapPin className="mx-auto h-6 w-6 text-muted-foreground" />

            <div>
              <p className="text-sm font-medium">
                No Nearby Resources
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                No verified emergency facilities are currently
                available within your operational area.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={requestLocation}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Location
            </Button>
          </div>
        ) : (
          <>
            {nearbyResources.map((resource) => {
              const Icon =
                categoryIcons[resource.category] ?? MapPin;

              return (
                <div
                  key={resource.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {resource.name}
                    </p>

                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Navigation className="h-3 w-3" />
                      {getDistanceLabel(resource.distanceKm)}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-medium text-green-600 dark:text-green-400">
                        Active
                      </span>

                      {resource.availableCapacity !== undefined && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {resource.availableCapacity} available
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                  >
                    <Link to="/resources">
                      Open
                    </Link>
                  </Button>
                </div>
              );
            })}

            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="h-3.5 w-3.5 text-green-500" />
                  Resource Network
                </span>

                <span className="font-medium">
                  Operational
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Radio className="h-3.5 w-3.5" />
                  Data Source
                </span>

                <span className="font-medium">
                  Demo Dataset
                </span>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Live synchronisation with the community response network
                will be enabled during the integration phase.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}