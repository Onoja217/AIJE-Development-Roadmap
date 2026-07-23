// hooks/useResources.ts

import { useEffect, useState } from "react";
import { ResourceService } from "../services/resources";
import type { EmergencyResource } from "../types/resource";

export function useResources() {
  const [resources, setResources] = useState<EmergencyResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadResources() {
      try {
        setIsLoading(true);

        const data = await ResourceService.getResources();

        if (mounted) {
          setResources(data);
        }
      } catch (error) {
        console.error("Failed to load emergency resources:", error);

        if (mounted) {
          setResources([]);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadResources();

    return () => {
      mounted = false;
    };
  }, []);

  return { resources, isLoading };
}

// Gets the user's current location for nearest-resource sorting.
export function useUserLocation() {
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [status, setStatus] = useState<
    "idle" | "requesting" | "granted" | "denied"
  >("idle");

  function requestLocation() {
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
      () => {
        setStatus("denied");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }

  return {
    location,
    status,
    requestLocation,
  };
}