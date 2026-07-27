import type {
  SafeBenueIncident,
  SafeBenueResource,
} from "./types";

/*
 * These mappers remain isolated from the dashboard.
 *
 * Once the exact AIJE Incident and EmergencyResource field
 * requirements are confirmed, these functions will return
 * those internal types directly.
 */

export function mapSafeBenueIncident(
  incident: SafeBenueIncident
) {
  return {
    externalId: incident.id,
    title: incident.title,
    description: incident.description,
    category: incident.category,
    severity: incident.severity,
    status: incident.status,
    location: {
      lat: incident.location.latitude,
      lng: incident.location.longitude,
      address: incident.location.address,
      community: incident.location.community,
    },
    source: "safebenue" as const,
    reportedAt: incident.reportedAt,
    updatedAt: incident.updatedAt,
  };
}

export function mapSafeBenueResource(
  resource: SafeBenueResource
) {
  return {
    externalId: resource.id,
    name: resource.name,
    category: resource.category,
    lat: resource.location.latitude,
    lng: resource.location.longitude,
    address: resource.location.address,
    phone: resource.phone,
    availability: resource.availability,
    source: "safebenue" as const,
    updatedAt: resource.updatedAt,
  };
}
