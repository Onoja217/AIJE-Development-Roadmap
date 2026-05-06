import { useEffect, useRef, useState } from "react";

export interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
}

const DEFAULT: Zone = { x: 0.2, y: 0.2, w: 0.6, h: 0.6 };

const key = (cam: string) => `aegis.restricted-zone.${cam}`;

export function loadZone(cameraName: string): Zone {
  try {
    const raw = localStorage.getItem(key(cameraName));
    if (raw) return JSON.parse(raw);
  } catch {
    /* noop */
  }
  return DEFAULT;
}

export function saveZone(cameraName: string, zone: Zone) {
  localStorage.setItem(key(cameraName), JSON.stringify(zone));
}

interface Props {
  cameraName: string;
  editing: boolean;
  zone: Zone;
  onChange: (z: Zone) => void;
}

export function RestrictedZoneEditor({ cameraName, editing, zone, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<null | { mode: "move" | "resize"; sx: number; sy: number; orig: Zone }>(null);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dx = (e.clientX - drag.sx) / rect.width;
      const dy = (e.clientY - drag.sy) / rect.height;
      let next: Zone;
      if (drag.mode === "move") {
        next = {
          x: Math.min(1 - drag.orig.w, Math.max(0, drag.orig.x + dx)),
          y: Math.min(1 - drag.orig.h, Math.max(0, drag.orig.y + dy)),
          w: drag.orig.w,
          h: drag.orig.h,
        };
      } else {
        next = {
          x: drag.orig.x,
          y: drag.orig.y,
          w: Math.max(0.05, Math.min(1 - drag.orig.x, drag.orig.w + dx)),
          h: Math.max(0.05, Math.min(1 - drag.orig.y, drag.orig.h + dy)),
        };
      }
      onChange(next);
    };
    const onUp = () => {
      saveZone(cameraName, zone);
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, onChange, cameraName, zone]);

  return (
    <div ref={ref} className="absolute inset-0 z-10 pointer-events-none">
      <div
        className={`absolute border-2 border-dashed transition-colors ${
          editing
            ? "border-primary bg-primary/10 pointer-events-auto cursor-move"
            : "border-warning/70 bg-warning/5"
        }`}
        style={{
          left: `${zone.x * 100}%`,
          top: `${zone.y * 100}%`,
          width: `${zone.w * 100}%`,
          height: `${zone.h * 100}%`,
        }}
        onPointerDown={(e) => {
          if (!editing) return;
          e.preventDefault();
          setDrag({ mode: "move", sx: e.clientX, sy: e.clientY, orig: zone });
        }}
      >
        <span className="absolute top-1 left-1 text-[9px] font-mono px-1 rounded bg-warning/80 text-warning-foreground">
          RESTRICTED ZONE
        </span>
        {editing && (
          <div
            className="absolute -bottom-1.5 -right-1.5 h-4 w-4 rounded-sm bg-primary border-2 border-background cursor-se-resize pointer-events-auto"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDrag({ mode: "resize", sx: e.clientX, sy: e.clientY, orig: zone });
            }}
          />
        )}
      </div>
    </div>
  );
}
