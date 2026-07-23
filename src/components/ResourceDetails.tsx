// components/ResourceDetails.tsx

import type { EmergencyResource } from "../types/resource";
import {
  RESOURCE_CATEGORY_CONFIG,
  RESOURCE_STATUS_CONFIG,
  RESOURCE_VERIFICATION_CONFIG,
} from "../config/resourceConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ResourceDetailsProps {
  resource: EmergencyResource | null;
  onClose: () => void;
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value?: string) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function ResourceDetails({
  resource,
  onClose,
}: ResourceDetailsProps) {
  if (!resource) {
    return null;
  }

  const category = RESOURCE_CATEGORY_CONFIG[resource.category];

  const statusLabel = resource.status
    ? RESOURCE_STATUS_CONFIG[resource.status].label
    : "Unknown";

  const verificationLabel = resource.verificationStatus
    ? RESOURCE_VERIFICATION_CONFIG[resource.verificationStatus].label
    : "Not verified";

  const hasCapacity =
    typeof resource.maximumCapacity === "number" ||
    typeof resource.availableCapacity === "number";

  const capacityText = hasCapacity
    ? `${resource.availableCapacity ?? 0} available${
        typeof resource.maximumCapacity === "number"
          ? ` of ${resource.maximumCapacity}`
          : ""
      }`
    : "Not reported";

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${resource.lat},${resource.lng}`;

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <span aria-hidden="true">{category.icon}</span>
              <span>{resource.name}</span>
            </CardTitle>

            <p className="text-sm text-muted-foreground">
              {category.label}
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close resource details"
          >
            Close
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{statusLabel}</Badge>
          <Badge variant="outline">{verificationLabel}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {resource.description && (
          <section className="space-y-1">
            <h3 className="text-sm font-semibold">Description</h3>
            <p className="text-sm text-muted-foreground">
              {resource.description}
            </p>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold">Location</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {resource.address}
            </p>

            {(resource.community ||
              resource.ward ||
              resource.lga ||
              resource.state) && (
              <p className="mt-1 text-sm text-muted-foreground">
                {[
                  resource.community,
                  resource.ward,
                  resource.lga,
                  resource.state,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold">Capacity</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {capacityText}
              {resource.capacityUnit
                ? ` ${resource.capacityUnit}`
                : ""}
            </p>
          </div>
        </section>

        {resource.services && resource.services.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Services</h3>

            <div className="flex flex-wrap gap-2">
              {resource.services.map((service) => (
                <Badge key={service} variant="outline">
                  {formatLabel(service)}
                </Badge>
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold">Contact</h3>

            <div className="mt-1 space-y-1 text-sm text-muted-foreground">
              {resource.contactPerson && (
                <p>{resource.contactPerson}</p>
              )}

              {resource.phone ? (
                <a
                  href={`tel:${resource.phone}`}
                  className="block hover:underline"
                >
                  {resource.phone}
                </a>
              ) : (
                <p>No phone number available</p>
              )}

              {resource.email && (
                <a
                  href={`mailto:${resource.email}`}
                  className="block hover:underline"
                >
                  {resource.email}
                </a>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">
              Verification
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Last verified: {formatDate(resource.lastVerifiedAt)}
            </p>
          </div>
        </section>

        {resource.operatingHours && (
          <section>
            <h3 className="text-sm font-semibold">
              Operating Hours
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {resource.operatingHours}
            </p>
          </section>
        )}

        {resource.notes && (
          <section>
            <h3 className="text-sm font-semibold">Notes</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {resource.notes}
            </p>
          </section>
        )}

        <div className="flex flex-wrap gap-2">
          {resource.phone && (
            <Button asChild>
              <a href={`tel:${resource.phone}`}>Call Resource</a>
            </Button>
          )}

          <Button asChild variant="outline">
            <a
              href={mapUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open in Maps
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}