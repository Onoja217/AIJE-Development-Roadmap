// hooks/useGeolocation.ts
import { useState, useCallback, useRef } from "react";
import type { ReportLocation } from "../types/report";

type GeoStatus = "idle" | "requesting" | "granted" | "denied" | "unavailable";

interface UseGeolocationResult {
  status: GeoStatus;
  location: ReportLocation;
  requestLocation: () => void;
  setManualLocation: (text: string) => void;
}

async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string | undefined> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { Accept: "application/json" } },
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
  const requestIdRef = useRef(0);

  const requestLocation = useCallback(() => {
    const requestId = ++requestIdRef.current;
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }

    setStatus("requesting");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (requestId !== requestIdRef.current) return;
        const { latitude, longitude, accuracy } = position.coords;
        setStatus("granted");
        setLocation({
          lat: latitude,
          lng: longitude,
          accuracyMetres: accuracy,
        });

        const address = await reverseGeocode(latitude, longitude);
        if (address && requestId === requestIdRef.current) {
          setLocation((prev) => ({ ...prev, address }));
        }
      },
      () => {
        if (requestId === requestIdRef.current) setStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }, []);

  const setManualLocation = useCallback((text: string) => {
    setLocation((prev) => ({ ...prev, manualEntry: text }));
  }, []);

  return { status, location, requestLocation, setManualLocation };
}
