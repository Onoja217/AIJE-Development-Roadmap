// components/GoogleResourceMap.tsx

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "../lib/googleMaps";
import type { EmergencyResource } from "../types/resource";

interface UserLocation {
  lat: number;
  lng: number;
}

interface GoogleResourceMapProps {
  resources: EmergencyResource[];
  selectedId?: string;
  userLocation?: UserLocation | null;
  onSelect: (resource: EmergencyResource) => void;
}

export function GoogleResourceMap({
  resources,
  selectedId,
  userLocation,
  onSelect,
}: GoogleResourceMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const resourceMarkers = useRef<
    google.maps.marker.AdvancedMarkerElement[]
  >([]);

  const userMarker = useRef<
    google.maps.marker.AdvancedMarkerElement | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /**
   * Initialize Google Map
   */
  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!mapContainerRef.current) return;

      try {
        const { mapsLibrary } = await loadGoogleMaps();

        if (cancelled) return;

        const center =
          userLocation ??
          (resources.length
            ? {
                lat: resources[0].lat,
                lng: resources[0].lng,
              }
            : {
                lat: 7.1907,
                lng: 8.1296,
              });

        mapRef.current = new mapsLibrary.Map(mapContainerRef.current, {
          center,
          zoom: 13,
          mapId:
            import.meta.env.VITE_GOOGLE_MAP_ID ||
            "DEMO_MAP_ID",
          streetViewControl: false,
          fullscreenControl: true,
          mapTypeControl: false,
          gestureHandling: "greedy",
        });

        setLoading(false);
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError("Unable to load Google Maps.");
          setLoading(false);
        }
      }
    }

    initMap();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Render resource markers
   */
  useEffect(() => {
    async function renderMarkers() {
      if (!mapRef.current) return;

      const { markerLibrary } = await loadGoogleMaps();

      resourceMarkers.current.forEach((marker) => {
        marker.map = null;
      });

      resourceMarkers.current = [];

      const bounds = new google.maps.LatLngBounds();

      resources.forEach((resource) => {
        const pin = new markerLibrary.PinElement({
          glyph: "🏥",
          scale:
            resource.id === selectedId
              ? 1.3
              : 1,
        });

        const marker =
          new markerLibrary.AdvancedMarkerElement({
            map: mapRef.current!,
            position: {
              lat: resource.lat,
              lng: resource.lng,
            },
            title: resource.name,
            content: pin.element,
          });

        marker.addListener("click", () => {
          onSelect(resource);

          mapRef.current?.panTo({
            lat: resource.lat,
            lng: resource.lng,
          });
        });

        resourceMarkers.current.push(marker);

        bounds.extend({
          lat: resource.lat,
          lng: resource.lng,
        });
      });

      if (userLocation) {
        bounds.extend(userLocation);
      }

      if (!bounds.isEmpty()) {
        mapRef.current.fitBounds(bounds, 80);
      }
    }

    renderMarkers();
  }, [resources, selectedId, userLocation, onSelect]);

  /**
   * Render current user location
   */
  useEffect(() => {
    async function renderUserLocation() {
      if (!mapRef.current) return;

      const { markerLibrary } = await loadGoogleMaps();

      if (userMarker.current) {
        userMarker.current.map = null;
      }

      if (!userLocation) return;

      const pin = new markerLibrary.PinElement({
        glyph: "📍",
        scale: 1.2,
      });

      userMarker.current =
        new markerLibrary.AdvancedMarkerElement({
          map: mapRef.current,
          position: userLocation,
          title: "Your Location",
          content: pin.element,
        });
    }

    renderUserLocation();
  }, [userLocation]);

  return (
    <div className="relative h-[450px] w-full overflow-hidden rounded-lg">
      <div
        ref={mapContainerRef}
        className="h-full w-full"
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          Loading Google Map...
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background">
          <div className="text-center">
            <p className="font-semibold text-destructive">
              {error}
            </p>

            <p className="mt-2 text-sm text-muted-foreground">
              Check your API key and Google Maps configuration.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}