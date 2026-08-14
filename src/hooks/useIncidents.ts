import { useCallback, useEffect, useMemo, useState } from "react";

import { useCommunityIntegration } from "@/contexts/CommunityIntegrationContext";

import type { EnrichedIncident } from "@/types/enrichedIncident";
import type { IncidentStatus, TimelineEvent } from "@/types/incident";
import {
  canTransitionIncident,
  createStatusTimelineEvent,
} from "@/lib/incidentLifecycle";

interface IncidentOverride {
  status?: IncidentStatus;
  assignedResponder?: string;
  responseNotes?: string;
  timeline: TimelineEvent[];
}

interface UseIncidentsResult {
  incidents: EnrichedIncident[];
  isLoading: boolean;

  updateIncidentStatus: (
    id: string,
    status: IncidentStatus,
    note?: string,
  ) => void;

  assignResponder: (id: string, responder: string) => void;
}

export function useIncidents(): UseIncidentsResult {
  const { snapshot, isLoading } = useCommunityIntegration();

  /**
   * Temporary UI overrides.
   * These remain until SafeBenue mutation endpoints
   * become available.
   */
  const [overrides, setOverrides] = useState<Record<string, IncidentOverride>>(
    {},
  );

  /**
   * Incidents are already enriched by the
   * Intelligence Engine.
   */
  const synchronizedIncidents = useMemo<EnrichedIncident[]>(() => {
    return snapshot?.intelligence.enrichedIncidents ?? [];
  }, [snapshot]);

  /**
   * Remove overrides for incidents that no
   * longer exist.
   */
  useEffect(() => {
    const ids = new Set(synchronizedIncidents.map((incident) => incident.id));

    setOverrides((current) => {
      const filtered = Object.fromEntries(
        Object.entries(current).filter(([id]) => ids.has(id)),
      );

      return Object.keys(filtered).length === Object.keys(current).length
        ? current
        : filtered;
    });
  }, [synchronizedIncidents]);

  const incidents = useMemo<EnrichedIncident[]>(() => {
    return synchronizedIncidents.map((incident) => {
      const override = overrides[incident.id];

      if (!override) {
        return incident;
      }

      return {
        ...incident,

        status: override.status ?? incident.status,

        assignedResponder:
          override.assignedResponder ?? incident.assignedResponder,

        responseNotes: override.responseNotes ?? incident.responseNotes,

        timeline: [...incident.timeline, ...override.timeline],
      };
    });
  }, [synchronizedIncidents, overrides]);

  const updateIncidentStatus = useCallback(
    (id: string, status: IncidentStatus, note?: string) => {
      setOverrides((current) => {
        const existing = current[id];
        const sourceIncident = incidents.find((incident) => incident.id === id);
        const currentStatus = existing?.status ?? sourceIncident?.status;

        if (!currentStatus || !canTransitionIncident(currentStatus, status)) {
          return current;
        }

        const timelineEvent = createStatusTimelineEvent({ status, note });

        return {
          ...current,

          [id]: {
            status,

            assignedResponder: existing?.assignedResponder,

            responseNotes: note ?? existing?.responseNotes,

            timeline: [...(existing?.timeline ?? []), timelineEvent],
          },
        };
      });

      /**
       * TODO
       * Replace with SafeBenue mutation API.
       */
    },
    [incidents],
  );

  const assignResponder = useCallback((id: string, responder: string) => {
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

          responseNotes: existing?.responseNotes,

          timeline: [...(existing?.timeline ?? []), timelineEvent],
        },
      };
    });

    /**
     * TODO
     * Replace with SafeBenue mutation API.
     */
  }, []);

  return {
    incidents,
    isLoading,
    updateIncidentStatus,
    assignResponder,
  };
}
