// hooks/useIncidents.ts
//
// This hook is the ONLY place that should know where incident data comes from.
// Right now it returns mock data so the dashboard is fully clickable/demoable
// without waiting on the backend, AI detection, or reporting sync to be wired up.
//
// To go live later: replace `MOCK_INCIDENTS` + the interval below with a real
// fetch/websocket subscription. Every component that consumes this hook stays
// unchanged.

import { useState, useEffect, useCallback } from "react";
import type { Incident, IncidentStatus } from "../types/incident";

const MOCK_INCIDENTS: Incident[] = [
  {
    id: "inc-1",
    title: "Armed men sighted near Ochekwu village",
    category: "attack",
    description: "Group of armed men reported entering the village from the eastern road.",
    location: { lat: 7.3369, lng: 8.1348, address: "Ochekwu, Benue State" },
    reportedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    priority: "critical",
    status: "responding",
    assignedResponder: "Vigilante Team Alpha",
    timeline: [
      { id: "t1", label: "report_received", timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString() },
      { id: "t2", label: "verification_completed", timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
      { id: "t3", label: "team_notified", timestamp: new Date(Date.now() - 9 * 60 * 1000).toISOString() },
      { id: "t4", label: "response_started", timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString() },
    ],
  },
  {
    id: "inc-2",
    title: "Bush fire spreading near farmland",
    category: "fire",
    description: "Fire reported spreading toward farmland on the outskirts of town.",
    location: { lat: 7.3121, lng: 8.1502, address: "Otukpo outskirts" },
    reportedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    priority: "high",
    status: "verified",
    timeline: [
      { id: "t1", label: "report_received", timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString() },
      { id: "t2", label: "verification_completed", timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString() },
    ],
  },
  {
    id: "inc-3",
    title: "Missing person — elderly woman",
    category: "missing_person",
    description: "70-year-old woman last seen near the market square this morning.",
    location: { manualEntry: "Near Otukpo main market" },
    reportedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    priority: "medium",
    status: "pending",
    timeline: [
      { id: "t1", label: "report_received", timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
    ],
  },
  {
    id: "inc-4",
    title: "Flooded road blocking access",
    category: "flood",
    description: "Main access road flooded, impassable for vehicles.",
    location: { address: "Otukpo-Makurdi road" },
    reportedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    priority: "low",
    status: "resolved",
    assignedResponder: "Public Works Team",
    responseNotes: "Road cleared and reopened.",
    timeline: [
      { id: "t1", label: "report_received", timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString() },
      { id: "t2", label: "verification_completed", timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() },
      { id: "t3", label: "team_notified", timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
      { id: "t4", label: "response_started", timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString() },
      { id: "t5", label: "incident_resolved", timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString() },
    ],
  },
];

interface UseIncidentsResult {
  incidents: Incident[];
  isLoading: boolean;
  updateIncidentStatus: (id: string, status: IncidentStatus, note?: string) => void;
  assignResponder: (id: string, responder: string) => void;
}

export function useIncidents(): UseIncidentsResult {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulates an initial fetch. Replace with a real API call / websocket
    // subscription here — keep the same setIncidents(...) shape.
    const timer = setTimeout(() => {
      setIncidents(MOCK_INCIDENTS);
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const updateIncidentStatus = useCallback((id: string, status: IncidentStatus, note?: string) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === id
          ? {
              ...inc,
              status,
              responseNotes: note ?? inc.responseNotes,
              timeline: [
                ...inc.timeline,
                {
                  id: crypto.randomUUID(),
                  label:
                    status === "resolved"
                      ? "incident_resolved"
                      : status === "responding"
                      ? "response_started"
                      : "verification_completed",
                  timestamp: new Date().toISOString(),
                  note,
                },
              ],
            }
          : inc
      )
    );
    // TODO: persist this change to the backend once the API is available.
  }, []);

  const assignResponder = useCallback((id: string, responder: string) => {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, assignedResponder: responder } : inc))
    );
    // TODO: persist this change to the backend once the API is available.
  }, []);

  return { incidents, isLoading, updateIncidentStatus, assignResponder };
}
