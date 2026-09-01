export type AlertSeverity = "Low" | "Medium" | "High" | "Critical";
export type AlertStatus = "Open" | "Investigating" | "Resolved";
export type DetectionType =
  | "Person detection"
  | "Motion detection"
  | "Vehicle detection"
  | "Loitering";

export interface AlertFilters {
  camera?: string;
  date?: string;
  severity?: AlertSeverity | "All";
  status?: AlertStatus | "All";
  personDetection?: boolean;
  motionDetection?: boolean;
}

export interface AlertEvent {
  id: string;
  cameraName: string;
  timestamp: string;
  threatScore: number;
  severity: AlertSeverity;
  aiConfidence: number;
  smartRule: string;
  detectionType: DetectionType;
  status: AlertStatus;
  personDetection: boolean;
  motionDetection: boolean;
  snapshotUrl: string;
}

export const seedAlertEvents: AlertEvent[] = [
  {
    id: "ALT-1042",
    cameraName: "Gatehouse",
    timestamp: "2026-09-01T07:14:00.000Z",
    threatScore: 92,
    severity: "High",
    aiConfidence: 96,
    smartRule: "Restricted-zone intrusion",
    detectionType: "Person detection",
    status: "Resolved",
    personDetection: true,
    motionDetection: true,
    snapshotUrl:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "ALT-1044",
    cameraName: "Perimeter North",
    timestamp: "2026-09-01T09:20:00.000Z",
    threatScore: 74,
    severity: "High",
    aiConfidence: 82,
    smartRule: "Loitering near gate",
    detectionType: "Loitering",
    status: "Open",
    personDetection: true,
    motionDetection: true,
    snapshotUrl:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "ALT-1051",
    cameraName: "Loading Bay",
    timestamp: "2026-09-02T18:42:00.000Z",
    threatScore: 68,
    severity: "Medium",
    aiConfidence: 79,
    smartRule: "Unusual nighttime movement",
    detectionType: "Motion detection",
    status: "Resolved",
    personDetection: false,
    motionDetection: true,
    snapshotUrl:
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "ALT-1060",
    cameraName: "Reception",
    timestamp: "2026-09-03T06:18:00.000Z",
    threatScore: 56,
    severity: "Low",
    aiConfidence: 71,
    smartRule: "Visitor check-in anomaly",
    detectionType: "Vehicle detection",
    status: "Resolved",
    personDetection: false,
    motionDetection: true,
    snapshotUrl:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "ALT-1068",
    cameraName: "Gatehouse",
    timestamp: "2026-09-04T22:08:00.000Z",
    threatScore: 86,
    severity: "High",
    aiConfidence: 88,
    smartRule: "After-hours access flag",
    detectionType: "Person detection",
    status: "Open",
    personDetection: true,
    motionDetection: false,
    snapshotUrl:
      "https://images.unsplash.com/photo-1551818255-e6e109075b5a?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "ALT-1072",
    cameraName: "Warehouse",
    timestamp: "2026-09-05T13:35:00.000Z",
    threatScore: 45,
    severity: "Low",
    aiConfidence: 66,
    smartRule: "Routine motion threshold",
    detectionType: "Motion detection",
    status: "Resolved",
    personDetection: false,
    motionDetection: true,
    snapshotUrl:
      "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "ALT-1079",
    cameraName: "Perimeter North",
    timestamp: "2026-09-06T05:54:00.000Z",
    threatScore: 90,
    severity: "Critical",
    aiConfidence: 94,
    smartRule: "Fence breach + tracking",
    detectionType: "Person detection",
    status: "Investigating",
    personDetection: true,
    motionDetection: true,
    snapshotUrl:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "ALT-1086",
    cameraName: "Storage Room",
    timestamp: "2026-09-06T20:13:00.000Z",
    threatScore: 63,
    severity: "Medium",
    aiConfidence: 74,
    smartRule: "Door left ajar",
    detectionType: "Motion detection",
    status: "Open",
    personDetection: false,
    motionDetection: true,
    snapshotUrl:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=80",
  },
];

export function filterAlertEvents(
  events: AlertEvent[],
  filters: AlertFilters,
): AlertEvent[] {
  return events.filter((event) => {
    if (filters.camera && !event.cameraName.toLowerCase().includes(filters.camera.toLowerCase())) {
      return false;
    }

    if (filters.date && !new Date(event.timestamp).toISOString().slice(0, 10).includes(filters.date)) {
      return false;
    }

    if (filters.severity && filters.severity !== "All" && event.severity !== filters.severity) {
      return false;
    }

    if (filters.status && filters.status !== "All" && event.status !== filters.status) {
      return false;
    }

    if (filters.personDetection !== undefined && event.personDetection !== filters.personDetection) {
      return false;
    }

    if (filters.motionDetection !== undefined && event.motionDetection !== filters.motionDetection) {
      return false;
    }

    return true;
  });
}

export function buildAlertAnalytics(events: AlertEvent[]) {
  const alertsPerDay = Object.entries(
    events.reduce<Record<string, number>>((accumulator, event) => {
      const date = new Date(event.timestamp).toISOString().slice(0, 10);
      accumulator[date] = (accumulator[date] ?? 0) + 1;
      return accumulator;
    }, {}),
  )
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const byCamera = Object.entries(
    events.reduce<Record<string, number>>((accumulator, event) => {
      accumulator[event.cameraName] = (accumulator[event.cameraName] ?? 0) + 1;
      return accumulator;
    }, {}),
  )
    .map(([camera, count]) => ({ camera, count }))
    .sort((a, b) => b.count - a.count);

  const threatLevels = Object.entries(
    events.reduce<Record<string, number>>((accumulator, event) => {
      accumulator[event.severity] = (accumulator[event.severity] ?? 0) + 1;
      return accumulator;
    }, {}),
  )
    .map(([level, count]) => ({ level, count }))
    .sort((a, b) => {
      const rank = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      return (rank[b.level as keyof typeof rank] ?? 0) - (rank[a.level as keyof typeof rank] ?? 0);
    });

  const mostActiveHours = Array.from({ length: 24 }, (_, hour) => hour).map((hour) => ({
    hour,
    count: events.filter((event) => new Date(event.timestamp).getUTCHours() === hour).length,
  }));

  return {
    alertsPerDay,
    byCamera,
    threatLevels,
    mostActiveHours,
  };
}
