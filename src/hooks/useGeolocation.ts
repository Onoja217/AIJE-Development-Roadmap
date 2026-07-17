// hooks/useGeolocation.ts
import { useState, useCallback } from "react";
import type { ReportLocation } from "../types/report";

type GeoStatus = "idle" | "requesting" | "granted" | "denied" | "unavailable";

interface UseGeolocationResult {
  status: GeoStatus;
  location: ReportLocation;
  requestLocation: () => void;
  setManualLocation: (text: string) => void;
}

async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return undefined;
    const data = await res.json();
    return data?.display_name as string | undefined;
  } catch {
    return undefined;
  }
}

export function useGeolocation(): UseGeolocationResult {
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [location, setLocation] = useState<ReportLocation>({});

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }

    setStatus("requesting");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setStatus("granted");
        setLocation({ lat: latitude, lng: longitude });

        const address = await reverseGeocode(latitude, longitude);
        if (address) {
          setLocation((prev) => ({ ...prev, address }));
        }
      },
      () => {
        setStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const setManualLocation = useCallback((text: string) => {
    setLocation((prev) => ({ ...prev, manualEntry: text }));
  }, []);

  return { status, location, requestLocation, setManualLocation };
}
