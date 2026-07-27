import {
  useCallback,
  useMemo,
  useState,
} from "react";

import { useCommunityIntegration } from "@/contexts/CommunityIntegrationContext";
import { mapSafeBenueResource } from "@/integrations/safebenue/mapper";

import type { EmergencyResource } from "@/types/resource";

interface UseResourcesResult {
  resources: EmergencyResource[];
  isLoading: boolean;
}

export function useResources(): UseResourcesResult {
  const {
    snapshot,
    isLoading,
  } = useCommunityIntegration();

  const resources = useMemo<EmergencyResource[]>(() => {
    if (!snapshot) {
      return [];
    }

    return snapshot.safeBenue.resources.map(
      mapSafeBenueResource
    );
  }, [snapshot]);

  return {
    resources,
    isLoading,
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