import type {
  SafeBenueIncident,
  SafeBenueIncidentStatus,
  SafeBenueResource,
} from "./types";

import type {
  Incident,
  IncidentStatus,
  TimelineEvent,
} from "@/types/incident";

import type {
  EmergencyResource,
  ResourceCategory,
  ResourceStatus,
  ResourceService,
} from "@/types/resource";

/**
 * Converts a SafeBenue incident status into the status contract
 * used by the AIJE Community Dashboard.
 */
function mapIncidentStatus(
  status: SafeBenueIncidentStatus
): IncidentStatus {
  switch (status) {
    case "reported":
      return "pending";

    case "verified":
      return "verified";

    case "responding":
      return "responding";

    case "resolved":
      return "resolved";

    default:
      return "pending";
  }
}

/**
 * Builds a timeline based on the current state received from SafeBenue.
 *
 * SafeBenue currently provides the latest incident status rather than
 * a complete status-history array. These entries therefore represent
 * the minimum timeline AIJE can safely derive from that status.
 */
function buildIncidentTimeline(
  incident: SafeBenueIncident
): TimelineEvent[] {
  const timeline: TimelineEvent[] = [
    {
      id: `${incident.id}-report-received`,
      label: "report_received",
      timestamp: incident.reportedAt,
    },
  ];

  if (
    incident.status === "verified" ||
    incident.status === "responding" ||
    incident.status === "resolved"
  ) {
    timeline.push({
      id: `${incident.id}-verification-completed`,
      label: "verification_completed",
      timestamp: incident.updatedAt,
    });
  }

  if (
    incident.status === "responding" ||
    incident.status === "resolved"
  ) {
    timeline.push({
      id: `${incident.id}-response-started`,
      label: "response_started",
      timestamp: incident.updatedAt,
    });
  }

  if (incident.status === "resolved") {
    timeline.push({
      id: `${incident.id}-incident-resolved`,
      label: "incident_resolved",
      timestamp: incident.updatedAt,
    });
  }

  return timeline;
}

/**
 * Converts a SafeBenue incident into AIJE's internal Incident contract.
 *
 * The rest of AIJE should consume this internal type rather than reading
 * SafeBenue payload fields directly.
 */
export function mapSafeBenueIncident(
  incident: SafeBenueIncident
): Incident {
  return {
    id: `safebenue-${incident.id}`,
    title: incident.title,
    category: incident.category,
    description: incident.description,

    location: {
      lat: incident.location.latitude,
      lng: incident.location.longitude,
      address: incident.location.address,
      manualEntry:
        incident.location.community ??
        incident.location.localGovernment,
    },

    reportedAt: incident.reportedAt,
    priority: incident.severity,
    status: mapIncidentStatus(incident.status),
    timeline: buildIncidentTimeline(incident),

    assignedResponder: undefined,
    responseNotes: undefined,
    imageUrls: [],
  };
}

/**
 * Maps SafeBenue resource categories to AIJE's resource taxonomy.
 */
function mapResourceCategory(
  category: SafeBenueResource["category"]
): ResourceCategory {
  switch (category) {
    case "hospital":
      return "hospital";

    case "police":
      return "police_station";

    case "fire_service":
      return "fire_service";

    case "shelter":
      return "safe_shelter";

    case "warehouse":
      return "relief_warehouse";

    case "ngo":
      return "community_hall";

    case "community_leader":
      return "watch_group_base";

    default:
      return "command_centre";
  }
}

/**
 * Converts SafeBenue availability values into AIJE operational statuses.
 */
function mapResourceStatus(
  availability: SafeBenueResource["availability"]
): ResourceStatus {
  switch (availability) {
    case "available":
      return "active";

    case "limited":
      return "busy";

    case "unavailable":
      return "temporarily_unavailable";

    default:
      return "temporarily_unavailable";
  }
}

/**
 * Generates service capabilities from each external resource category.
 */
function mapResourceServices(
  category: SafeBenueResource["category"]
): ResourceService[] {
  switch (category) {
    case "hospital":
      return [
        "emergency_medical_care",
        "general_medical_care",
        "medicine",
      ];

    case "police":
      return ["security"];

    case "fire_service":
      return ["fire_response", "search_and_rescue"];

    case "shelter":
      return [
        "shelter",
        "water",
        "sanitation",
        "psychosocial_support",
      ];

    case "warehouse":
      return ["food", "water", "medicine"];

    case "ngo":
      return [
        "food",
        "water",
        "shelter",
        "psychosocial_support",
      ];

    case "community_leader":
      return ["security", "search_and_rescue"];

    default:
      return [];
  }
}

/**
 * Converts a SafeBenue resource into AIJE's EmergencyResource contract.
 */
export function mapSafeBenueResource(
  resource: SafeBenueResource
): EmergencyResource {
  return {
    id: `safebenue-${resource.id}`,

    name: resource.name,
    category: mapResourceCategory(resource.category),

    description: `Emergency resource synchronised from SafeBenue.`,
    notes: `SafeBenue availability: ${resource.availability}`,

    address:
      resource.location.address ??
      resource.location.community ??
      resource.location.localGovernment ??
      "Location not specified",

    community: resource.location.community,
    lga: resource.location.localGovernment,
    state: "Benue",
    country: "Nigeria",

    lat: resource.location.latitude,
    lng: resource.location.longitude,

    status: mapResourceStatus(resource.availability),
    verificationStatus: "verified",
    visibility: "public",
    isPublic: true,

    services: mapResourceServices(resource.category),

    phone: resource.phone,

    createdBy: "safebenue-integration",
    updatedBy: "safebenue-integration",
    verifiedBy: "safebenue-integration",

    lastVerifiedAt: resource.updatedAt,
    updatedAt: resource.updatedAt,
  };
}