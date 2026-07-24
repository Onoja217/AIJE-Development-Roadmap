import { useEffect } from "react";
import type { LatLngBoundsExpression, PointTuple } from "leaflet";
import { useMap } from "react-leaflet";

const DEFAULT_PADDING: PointTuple = [32, 32];

interface FitBoundsProps {
  bounds?: LatLngBoundsExpression;
  padding?: PointTuple;
  maxZoom?: number;
}

export function FitBounds({
  bounds,
  padding = DEFAULT_PADDING,
  maxZoom = 14,
}: FitBoundsProps) {
  const map = useMap();

  useEffect(() => {
    if (!bounds) {
      return;
    }

    map.fitBounds(bounds, {
      padding,
      maxZoom,
    });
  }, [bounds, map, maxZoom, padding]);

  return null;
}

export default FitBounds;