import { useEffect, useState } from "react";
import type { EmergencyResource } from "../types/resource";

const MOCK_RESOURCES: EmergencyResource[] = [
  {
    id: "res-1",
    name: "Otukpo Divisional Police Headquarters",
    category: "police_station",
    address: "Police Headquarters Road, Otukpo",
    community: "Otukpo",
    ward: "Otukpo Town Central",
    lga: "Otukpo",
    state: "Benue",
    lat: 7.1934,
    lng: 8.1314,
    phone: "080-000-0001",
    email: "otukpo.police@example.org",
    status: "active",
    verified: true,
    services: [
      "Emergency response",
      "Crime reporting",
      "Community policing",
    ],
    lastUpdated: "2026-07-22T08:30:00Z",
    notes: "Primary divisional police response centre for Otukpo.",
  },
  {
    id: "res-2",
    name: "Otukpo General Hospital",
    category: "hospital",
    address: "Hospital Road, Otukpo",
    community: "Otukpo",
    ward: "Otukpo Town East",
    lga: "Otukpo",
    state: "Benue",
    lat: 7.1978,
    lng: 8.1289,
    phone: "080-000-0002",
    status: "active",
    capacity: 180,
    availableCapacity: 42,
    verified: true,
    services: [
      "Emergency Care",
      "Trauma Care",
      "Maternity",
      "Ambulance Support",
    ],
    lastUpdated: "2026-07-22T08:20:00Z",
  },
  {
    id: "res-3",
    name: "Otukpo Fire Service Station",
    category: "fire_service",
    address: "Adoka Road, Otukpo",
    community: "Otukpo",
    ward: "Otukpo Town South",
    lga: "Otukpo",
    state: "Benue",
    lat: 7.2011,
    lng: 8.1355,
    phone: "080-000-0003",
    status: "active",
    verified: true,
    services: [
      "Fire Response",
      "Rescue Operations",
      "Hazard Assessment",
    ],
    lastUpdated: "2026-07-22T08:10:00Z",
  },
  {
    id: "res-4",
    name: "Otukpo Community Safe Shelter",
    category: "safe_shelter",
    address: "Central Primary School, Otukpo",
    community: "Otukpo",
    ward: "Otukpo Town Central",
    lga: "Otukpo",
    state: "Benue",
    lat: 7.1889,
    lng: 8.1401,
    status: "limited",
    capacity: 350,
    availableCapacity: 96,
    verified: true,
    services: [
      "Temporary Accommodation",
      "Child Protection",
      "Basic First Aid",
    ],
    lastUpdated: "2026-07-22T07:55:00Z",
  },
  {
    id: "res-5",
    name: "Benue Emergency Management Office - Otukpo",
    category: "lg_emergency_office",
    address: "Otukpo LGA Secretariat",
    community: "Otukpo",
    ward: "Otukpo Town Central",
    lga: "Otukpo",
    state: "Benue",
    lat: 7.1955,
    lng: 8.133,
    phone: "080-000-0005",
    status: "active",
    verified: true,
    services: [
      "Emergency Coordination",
      "Relief Mobilisation",
      "Incident Documentation",
    ],
    lastUpdated: "2026-07-22T08:00:00Z",
  },
  {
    id: "res-6",
    name: "Otukpo IDP Camp",
    category: "idp_camp",
    address: "Adoka Road IDP Camp, Otukpo",
    community: "Otukpo",
    ward: "Otukpo Town South",
    lga: "Otukpo",
    state: "Benue",
    lat: 7.2045,
    lng: 8.129,
    status: "limited",
    capacity: 1200,
    availableCapacity: 184,
    verified: true,
    services: [
      "Temporary Shelter",
      "Food Assistance",
      "Water Access",
      "Family Support",
    ],
    lastUpdated: "2026-07-22T07:40:00Z",
  },
  {
    id: "res-7",
    name: "Otukpo Community Vigilante Post",
    category: "vigilante_post",
    address: "Old Market Road, Otukpo",
    community: "Otukpo",
    ward: "Otukpo Town West",
    lga: "Otukpo",
    state: "Benue",
    lat: 7.1906,
    lng: 8.1267,
    phone: "080-000-0007",
    status: "active",
    verified: true,
    services: [
      "Community Patrol",
      "Early Warning Coordination",
      "Local Incident Reporting",
    ],
    lastUpdated: "2026-07-22T08:05:00Z",
  },
  {
    id: "res-8",
    name: "Otukpo Emergency Ambulance Point",
    category: "ambulance",
    address: "Near Otukpo General Hospital",
    community: "Otukpo",
    ward: "Otukpo Town East",
    lga: "Otukpo",
    state: "Benue",
    lat: 7.1984,
    lng: 8.1302,
    phone: "080-000-0008",
    status: "active",
    capacity: 3,
    availableCapacity: 2,
    verified: true,
    services: [
      "Emergency Transport",
      "First Responder Support",
      "Medical Evacuation",
    ],
    lastUpdated: "2026-07-22T08:25:00Z",
  },
  {
    id: "res-9",
    name: "Otukpo Relief Distribution Centre",
    category: "relief_center",
    address: "LGA Warehouse, Otukpo",
    community: "Otukpo",
    ward: "Otukpo Town North",
    lga: "Otukpo",
    state: "Benue",
    lat: 7.1992,
    lng: 8.1381,
    status: "active",
    verified: true,
    services: [
      "Relief Registration",
      "Food Distribution",
      "Emergency Supplies",
    ],
    lastUpdated: "2026-07-22T07:50:00Z",
  },
  {
    id: "res-10",
    name: "Central Otukpo Water Point",
    category: "water_point",
    address: "Central Market Area, Otukpo",
    community: "Otukpo",
    ward: "Otukpo Town Central",
    lga: "Otukpo",
    state: "Benue",
    lat: 7.1927,
    lng: 8.1362,
    status: "limited",
    capacity: 500,
    availableCapacity: 210,
    verified: false,
    services: [
      "Drinking Water",
      "Emergency Water Distribution",
    ],
    lastUpdated: "2026-07-22T07:30:00Z",
  },
];

export function useResources() {
  const [resources] = useState<EmergencyResource[]>(MOCK_RESOURCES);

  return {
    resources,
    loading: false,
    error: null,
  };
}

type UserLocation = {
  lat: number;
  lng: number;
};

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  return {
    location,
    loading,
    error,
    requestLocation,
  };
}