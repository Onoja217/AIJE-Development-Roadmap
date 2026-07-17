// lib/incidentUtils.ts
import type { Incident, IncidentFilters, DashboardStats } from "../types/incident";

export function filterIncidents(incidents: Incident[], filters: IncidentFilters): Incident[] {
  return incidents.filter((inc) => {
    if (filters.status && inc.status !== filters.status) return false;
    if (filters.priority && inc.priority !== filters.priority) return false;
    if (filters.category && inc.category !== filters.category) return false;
    if (filters.assignedResponder && inc.assignedResponder !== filters.assignedResponder) return false;

    if (filters.dateFrom && new Date(inc.reportedAt) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(inc.reportedAt) > new Date(filters.dateTo)) return false;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = `${inc.title} ${inc.description} ${inc.location.address ?? ""} ${inc.location.manualEntry ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

export function computeStats(incidents: Incident[]): DashboardStats {
  const today = new Date().toDateString();

  return {
    totalActive: incidents.filter((i) => i.status !== "resolved").length,
    critical: incidents.filter((i) => i.priority === "critical" && i.status !== "resolved").length,
    pendingVerification: incidents.filter((i) => i.status === "pending").length,
    respondingTeams: incidents.filter((i) => i.status === "responding").length,
    resolvedToday: incidents.filter(
      (i) => i.status === "resolved" && new Date(i.reportedAt).toDateString() === today
    ).length,
  };
}

// Sort newest-first for the alert feed.
export function sortByMostRecent(incidents: Incident[]): Incident[] {
  return [...incidents].sort(
    (a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
  );
}
