import {
  useCallback,
  useMemo,
  useState,
} from "react";

import { useCommunityIntegration } from "@/contexts/CommunityIntegrationContext";
import { mapSafeBenueResource } from "@/integrations/safebenue/mapper";
import { mapOsirisHotspotToResource } from "@/integrations/osiris/mapper";
import { VERIFIED_IDOMA_RESOURCES } from "@/data/verifiedIdomaResources";

import type { EmergencyResource } from "@/types/resource";

interface UseResourcesResult {
  resources: EmergencyResource[];
  isLoading: boolean;
  source: "safebenue" | "osiris" | "none";
}

export function useResources(): UseResourcesResult {
  const {
    snapshot,
    isLoading,
  } = useCommunityIntegration();

  const { resources, source } = useMemo<
    Pick<UseResourcesResult, "resources" | "source">
  >(() => {
    if (!snapshot) {
      return { resources: VERIFIED_IDOMA_RESOURCES, source: "none" };
    }

    if (snapshot.safeBenue.resources.length > 0) {
      return {
        resources: [
          ...VERIFIED_IDOMA_RESOURCES,
          ...snapshot.safeBenue.resources.map(mapSafeBenueResource),
        ],
        source: "safebenue",
      };
    }

    if (snapshot.osiris.hotspots.length > 0) {
      return {
        resources: [
          ...VERIFIED_IDOMA_RESOURCES,
          ...snapshot.osiris.hotspots.map(mapOsirisHotspotToResource),
        ],
        source: "osiris",
      };
    }

    return { resources: VERIFIED_IDOMA_RESOURCES, source: "none" };
  }, [snapshot]);

  return {
    resources,
    isLoading,
    source,
  };
}

type UserLocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied";

interface UserLocation {
  lat: number;
  lng: number;
}

export function useUserLocation() {
  const [location, setLocation] =
    useState<UserLocation | null>(null);

  const [status, setStatus] =
    useState<UserLocationStatus>("idle");

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("denied");
      return;
    }

    setStatus("requesting");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });

        setStatus("granted");
      },
      (error) => {
        console.error(
          "Unable to retrieve user location:",
          error
        );

        setStatus("denied");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  return {
    location,
    status,
    requestLocation,
  };
}
