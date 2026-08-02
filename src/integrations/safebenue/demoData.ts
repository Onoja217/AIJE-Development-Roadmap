import type { SafeBenuePayload } from "./types";

const now = Date.now();
const iso = (minutesAgo: number) =>
  new Date(now - minutesAgo * 60_000).toISOString();

/** Demo dataset used when VITE_COMMUNITY_SYNC_MODE=demo. */
export const safeBenueDemoPayload: SafeBenuePayload = {
  incidents: [
    {
      id: "sb-demo-1",
      title: "Armed men sighted near farmland",
      description:
        "Community watch reports three armed men moving toward the eastern farm settlements.",
      category: "security",
      status: "verified",
      severity: "critical",
      location: {
        latitude: 7.7322,
        longitude: 8.5391,
        address: "Ochekwu farm road",
        community: "Ochekwu",
        localGovernment: "Otukpo",
      },
      reportedAt: iso(18),
      updatedAt: iso(6),
      source: "watch_group",
    },
    {
      id: "sb-demo-2",
      title: "Flooding blocking access road",
      description:
        "Heavy rainfall has cut off the main access road; two households displaced.",
      category: "flood",
      status: "responding",
      severity: "high",
      location: {
        latitude: 7.6801,
        longitude: 8.6112,
        address: "Wadata bridge approach",
        community: "Wadata",
        localGovernment: "Makurdi",
      },
      reportedAt: iso(95),
      updatedAt: iso(24),
      source: "citizen",
    },
    {
      id: "sb-demo-3",
      title: "Medical emergency — elderly resident",
      description: "Suspected stroke; ambulance dispatch requested.",
      category: "medical",
      status: "reported",
      severity: "medium",
      location: {
        latitude: 7.7455,
        longitude: 8.5202,
        community: "Adoka",
        localGovernment: "Otukpo",
      },
      reportedAt: iso(9),
      updatedAt: iso(9),
      source: "citizen",
    },
  ],
  resources: [
    {
      id: "sb-res-1",
      name: "Otukpo General Hospital",
      category: "hospital",
      location: {
        latitude: 7.1918,
        longitude: 8.1339,
        community: "Otukpo",
      },
      phone: "+2348030000001",
      availability: "available",
      updatedAt: iso(40),
    },
    {
      id: "sb-res-2",
      name: "Divisional Police HQ",
      category: "police",
      location: {
        latitude: 7.7305,
        longitude: 8.5354,
        community: "Ochekwu",
      },
      phone: "+2348030000002",
      availability: "limited",
      updatedAt: iso(15),
    },
    {
      id: "sb-res-3",
      name: "Makurdi Fire Service",
      category: "fire_service",
      location: {
        latitude: 7.7322,
        longitude: 8.5391,
        community: "Makurdi",
      },
      phone: "+2348030000003",
      availability: "available",
      updatedAt: iso(70),
    },
  ],
  missingPersons: [
    {
      id: "sb-mp-1",
      fullName: "Ene Ochoga",
      age: 14,
      description: "Last seen wearing a blue school uniform.",
      lastSeenLocation: {
        latitude: 7.7381,
        longitude: 8.5427,
        community: "Ochekwu",
      },
      lastSeenAt: iso(300),
      status: "missing",
      reportedAt: iso(240),
    },
  ],
};
