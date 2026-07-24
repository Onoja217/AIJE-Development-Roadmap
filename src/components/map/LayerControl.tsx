import type { MapLayer } from "./layerTypes";

interface LayerControlProps {
  layers: MapLayer[];
  onToggle: (layerId: MapLayer["id"]) => void;
}

export function LayerControl({
  layers,
  onToggle,
}: LayerControlProps) {
  return (
    <div className="space-y-2 rounded-lg border bg-background p-4 shadow-sm">
      <h3 className="text-sm font-semibold">
        Map Layers
      </h3>

      <div className="space-y-2">
        {layers.map((layer) => (
          <label
            key={layer.id}
            className={`flex items-center justify-between rounded-md px-2 py-2 ${
              layer.future
                ? "opacity-60"
                : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor: layer.color,
                }}
              />

              <span className="text-sm">
                {layer.label}
              </span>
            </div>

            <input
              type="checkbox"
              checked={layer.visible}
              disabled={layer.future}
              onChange={() =>
                onToggle(layer.id)
              }
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export default LayerControl;