import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useCommunityIntegration } from "@/contexts/CommunityIntegrationContext";
import { mapSafeBenueIncident } from "@/integrations/safebenue/mapper";

import type {
  Incident,
  IncidentStatus,
  TimelineEvent,
} from "@/types/incident";

interface IncidentOverride {
  status?: IncidentStatus;
  assignedResponder?: string;
  responseNotes?: string;
  timeline: TimelineEvent[];
}

interface UseIncidentsResult {
  incidents: Incident[];
  isLoading: boolean;
  updateIncidentStatus: (
    id: string,
    status: IncidentStatus,
    note?: string
  ) => void;
  assignResponder: (
    id: string,
    responder: string
  ) => void;
}

function getTimelineLabel(
  status: IncidentStatus
): TimelineEvent["label"] {
  switch (status) {
    case "pending":
      return "report_received";

    case "verified":
      return "verification_completed";

    case "responding":
      return "response_started";

    case "resolved":
      return "incident_resolved";

    default:
      return "verification_completed";
  }
}

export function useIncidents(): UseIncidentsResult {
  const {
    snapshot,
    isLoading,
  } = useCommunityIntegration();

  /*
   * Local overrides preserve dashboard changes while SafeBenue
   * mutation endpoints are not yet connected.
   */
  const [overrides, setOverrides] = useState<
    Record<string, IncidentOverride>
  >({});

  const synchronizedIncidents = useMemo<Incident[]>(() => {
    if (!snapshot) {
      return [];
    }

    return snapshot.safeBenue.incidents.map(
      mapSafeBenueIncident
    );
  }, [snapshot]);

  /*
   * Remove overrides belonging to incidents that no longer exist
   * in the synchronized SafeBenue response.
   */
  useEffect(() => {
    const synchronizedIds = new Set(
      synchronizedIncidents.map((incident) => incident.id)
    );

    setOverrides((current) => {
      const entries = Object.entries(current);
      const remainingEntries = entries.filter(
        ([incidentId]) => synchronizedIds.has(incidentId)
      );

      if (remainingEntries.length === entries.length) {
        return current;
      }

      return Object.fromEntries(remainingEntries);
    });
  }, [synchronizedIncidents]);

  const incidents = useMemo<Incident[]>(() => {
    return synchronizedIncidents.map((incident) => {
      const override = overrides[incident.id];

      if (!override) {
        return incident;
      }

      return {
        ...incident,
        status: override.status ?? incident.status,
        assignedResponder:
          override.assignedResponder ??
          incident.assignedResponder,
        responseNotes:
          override.responseNotes ??
          incident.responseNotes,
        timeline: [
          ...incident.timeline,
          ...override.timeline,
        ],
      };
    });
  }, [synchronizedIncidents, overrides]);

  const updateIncidentStatus = useCallback(
    (
      id: string,
      status: IncidentStatus,
      note?: string
    ) => {
      const timelineEvent: TimelineEvent = {
        id: crypto.randomUUID(),
        label: getTimelineLabel(status),
        timestamp: new Date().toISOString(),
        note,
      };

      setOverrides((current) => {
        const existing = current[id];

        return {
          ...current,
          [id]: {
            status,
            assignedResponder:
              existing?.assignedResponder,
            responseNotes:
              note ?? existing?.responseNotes,
            timeline: [
              ...(existing?.timeline ?? []),
              timelineEvent,
            ],
          },
        };
      });

      /*
       * TODO:
       * Send this update to the SafeBenue mutation API.
       */
    },
    []
  );

  const assignResponder = useCallback(
    (id: string, responder: string) => {
      const timelineEvent: TimelineEvent = {
        id: crypto.randomUUID(),
        label: "team_notified",
        timestamp: new Date().toISOString(),
        note: `Assigned to ${responder}`,
      };

      setOverrides((current) => {
        const existing = current[id];

        return {
          ...current,
          [id]: {
            status: existing?.status,
            assignedResponder: responder,
            responseNotes:
              existing?.responseNotes,
            timeline: [
              ...(existing?.timeline ?? []),
              timelineEvent,
            ],
          },
        };
      });

      /*
       * TODO:
       * Send responder assignment to SafeBenue.
       */
    },
    []
  );

  return {
    incidents,
    isLoading,
    updateIncidentStatus,
    assignResponder,
  };
}