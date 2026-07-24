import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export interface LayerState {
  incidents: boolean;
  hospitals: boolean;
  police: boolean;
  fire: boolean;
  shelters: boolean;
  warehouses: boolean;
}

interface MapLayerControlsProps {
  layers: LayerState;
  onChange: (layers: LayerState) => void;

  counts: {
    incidents: number;
    hospitals: number;
    police: number;
    fire: number;
    shelters: number;
    warehouses: number;
  };
}

const layerLabels: Record<keyof LayerState, string> = {
  incidents: "Incidents",
  hospitals: "Hospitals",
  police: "Police Stations",
  fire: "Fire Stations",
  shelters: "Shelters",
  warehouses: "Warehouses",
};

export function MapLayerControls({
  layers,
  onChange,
  counts,
}: MapLayerControlsProps) {
  const toggleLayer = (layer: keyof LayerState) => {
    onChange({
      ...layers,
      [layer]: !layers[layer],
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map Layers</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {(Object.keys(layerLabels) as (keyof LayerState)[]).map((layer) => (
          <div
            key={layer}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Checkbox
                checked={layers[layer]}
                onCheckedChange={() => toggleLayer(layer)}
              />

              <Label className="cursor-pointer">
                {layerLabels[layer]}
              </Label>
            </div>

            <span className="text-xs text-muted-foreground">
              {counts[layer]}
            </span>
          </div>
        ))}

        <Separator />

        <div className="text-xs text-muted-foreground">
          Toggle layers to focus on the information most relevant to the current response.
        </div>
      </CardContent>
    </Card>
  );
}