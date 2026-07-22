// src/lib/googleMaps.ts

import {
  importLibrary,
  setOptions,
} from "@googlemaps/js-api-loader";

let configured = false;

function configureGoogleMaps(): void {
  if (configured) {
    return;
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error(
      "VITE_GOOGLE_MAPS_API_KEY is missing from your .env file."
    );
  }

  setOptions({
    key: apiKey,
    v: "weekly",
    language: "en",
    region: "NG",
  });

  configured = true;
}

export async function loadGoogleMaps(): Promise<{
  mapsLibrary: google.maps.MapsLibrary;
  markerLibrary: google.maps.MarkerLibrary;
}> {
  configureGoogleMaps();

  const [mapsLibrary, markerLibrary] = await Promise.all([
    importLibrary("maps") as Promise<google.maps.MapsLibrary>,
    importLibrary("marker") as Promise<google.maps.MarkerLibrary>,
  ]);

  return {
    mapsLibrary,
    markerLibrary,
  };
}