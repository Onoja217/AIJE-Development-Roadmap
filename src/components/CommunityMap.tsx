// components/CommunityMap.tsx
//
// COORDINATION NEEDED WITH JIREY (Emergency Resource Mapping module):
// This component only plots incident locations. Police stations, hospitals,
// shelters, and fire service markers are his module's responsibility. Two
// reasonable ways to combine them:
//   1. Jirey exports a <ResourceMarkers /> component and we compose them on
//      one shared map instance, OR
//   2. Each module renders its own map and we tab/toggle between them.
// Don't build a second full resource layer here until that's settled —
// this file intentionally only handles incidents to avoid duplicate work.
//
// Uses simple lat/lng plotting on a static-styled container for now. If the
// team standardizes on a map library (e.g. react-leaflet, Mapbox GL), swap
// the render internals here — the props/contract can stay the same.

import { Card, CardContent } from "@/components/ui/card";
import { PRIORITY_CONFIG } from "../config/dashboardConfig";
import type { Incident } from "../types/incident";

interface CommunityMapProps {
  incidents: Incident[];
  onSelect: (incident: Incident) => void;
}

export function CommunityMap({ incidents, onSelect }: CommunityMapProps) {
  const located = incidents.filter((i) => i.location.lat !== undefined && i.location.lng !== undefined);

  if (located.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          No incidents with GPS coordinates to display on the map yet.
        </CardContent>
      </Card>
    );
  }

  // Simple bounding-box normalization so markers plot inside the panel
  // without a real map library. Replace with react-leaflet/Mapbox once
  // the team picks a mapping approach with Jirey.
  const lats = located.map((i) => i.location.lat!);
  const lngs = located.map((i) => i.location.lng!);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="relative w-full h-72 bg-muted rounded-md overflow-hidden">
          {located.map((inc) => {
            const top = 90 - ((inc.location.lat! - minLat) / latRange) * 80;
            const left = 10 + ((inc.location.lng! - minLng) / lngRange) * 80;
            return (
              <button
                key={inc.id}
                onClick={() => onSelect(inc)}
                title={inc.title}
                className={`absolute w-3 h-3 rounded-full border-2 border-white shadow ${PRIORITY_CONFIG[inc.priority].color}`}
                style={{ top: `${top}%`, left: `${left}%` }}
              />
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground p-2">
          Placeholder map — swap for a real map library once agreed with the team.
        </p>
      </CardContent>
    </Card>
  );
}
