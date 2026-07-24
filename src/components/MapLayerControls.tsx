import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import { DEFAULT_LAYERS } from "./map/layerConfig";
import type { LayerId } from "./map/layerTypes";

export type LayerState = Record<LayerId, boolean>;

interface MapLayerControlsProps {
  layers: LayerState;
  onChange: (layers: LayerState) => void;
  counts: Partial<Record<LayerId, number>>;
}

export function MapLayerControls({
  layers,
  onChange,
  counts,
}: MapLayerControlsProps) {
  const toggleLayer = (layerId: LayerId) => {
    onChange({
      ...layers,
      [layerId]: !layers[layerId],
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map Layers</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {DEFAULT_LAYERS.map((layer) => (
          <div
            key={layer.id}
            className={`flex items-center justify-between ${
              layer.future ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <Checkbox
                checked={layers[layer.id]}
                disabled={layer.future}
                onCheckedChange={() => toggleLayer(layer.id)}
              />

              <span
                className="h-3 w-3 rounded-full rounded"
                style={{
                  backgroundColor: layer.color,
                }}
              />

              <Label className="cursor-pointer">
                {layer.label}
              </Label>
            </div>

            <span className="text-xs text-muted-foreground">
              {counts[layer.id] ?? 0}
            </span>
          </div>
        ))}

        <Separator />

        <div className="text-xs text-muted-foreground">
          Toggle operational layers to focus on the information most relevant
          to the current incident response.
        </div>
      </CardContent>
    </Card>
  );
}

export default MapLayerControls;