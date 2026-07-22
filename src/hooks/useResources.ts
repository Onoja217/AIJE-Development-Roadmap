// hooks/useResources.ts
//
// Returns mock resource data for now. Swap MOCK_RESOURCES + the fetch simulation
// for a real API/database call once the team has a backend for this — every
// consuming component stays the same since they only depend on EmergencyResource[].

import { useState, useEffect } from "react";
import type { EmergencyResource } from "../types/resource";

const MOCK_RESOURCES: EmergencyResource[] = [
  {
    id: "res-1",
    name: "Otukpo Divisional Police Headquarters",
    category: "police_station",
    address: "Otukpo, Benue State",
    lat: 7.1934,
    lng: 8.1314,
    phone: "080-000-0001",
  },
  {
    id: "res-2",
    name: "Otukpo General Hospital",
    category: "hospital",
    address: "Hospital Road, Otukpo",
    lat: 7.1978,
    lng: 8.1289,
    phone: "080-000-0002",
  },
  {
    id: "res-3",
    name: "Otukpo Fire Service Station",
    category: "fire_service",
    address: "Adoka Road, Otukpo",
    lat: 7.2011,
    lng: 8.1355,
    phone: "080-000-0003",
  },
  {
    id: "res-4",
    name: "Otukpo Community Safe Shelter",
    category: "safe_shelter",
    address: "Central Primary School, Otukpo",
    lat: 7.1889,
    lng: 8.1401,
  },
  {
    id: "res-5",
    name: "Benue State Emergency Management Office — Otukpo LGA",
    category: "lg_emergency_office",
    address: "LGA Secretariat, Otukpo",
    lat: 7.1955,
    lng: 8.1330,
    phone: "080-000-0005",
  },
  {
    id: "res-6",
    name: "Otukpo IDP Camp",
    category: "idp_camp",
    address: "Adoka Road IDP Camp, Otukpo",
    lat: 7.2045,
    lng: 8.1290,
  },
];

export function useResources() {
  const [resources, setResources] = useState<EmergencyResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setResources(MOCK_RESOURCES);
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return { resources, isLoading };
}

// Stretch goal: user's current location, for "nearest resource" sorting.
export function useUserLocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      setStatus("denied");
      return;
    }
    setStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("granted");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return { location, status, requestLocation };
}
