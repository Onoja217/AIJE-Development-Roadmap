import { useEffect, useRef, useState } from "react";
import { detectInWorker, waitForWorkerReady } from "@/lib/detectionWorkerClient";

export interface Detection {
  bbox: [number, number, number, number]; // x, y, w, h in video pixels
  score: number;
  class: string;
}

interface Options {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  fps?: number;
  personOnly?: boolean;
  minScore?: number;
}

/**
 * Runs COCO-SSD person/object detection off the main thread.
 * The actual TensorFlow.js model lives in a shared Web Worker so that
 * multiple cameras don't each reload the model and don't block the UI.
 */
export function usePersonDetection({
  videoRef,
  enabled,
  fps = 6,
  personOnly = true,
  minScore = 0.55,
}: Options) {
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const inFlightRef = useRef(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  // Warm up worker once (kicks off model load if not already loaded)
  useEffect(() => {
    let cancelled = false;
    waitForWorkerReady().then(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!enabled || loading) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setDetections([]);
      return;
    }

    const supportsBitmap = typeof createImageBitmap === "function";

    const tick = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const now = performance.now();
      if (now - lastRef.current < 1000 / fps || inFlightRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      lastRef.current = now;
      inFlightRef.current = true;

      try {
        if (!supportsBitmap) {
          // Fallback: skip if browser lacks createImageBitmap
          inFlightRef.current = false;
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        const bitmap = await createImageBitmap(video);
        const preds = await detectInWorker(bitmap, minScore);
        const filtered = personOnly ? preds.filter((p) => p.class === "person") : preds;
        setDetections(filtered);
      } catch {
        /* swallow per-frame errors */
      } finally {
        inFlightRef.current = false;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, loading, fps, personOnly, minScore, videoRef]);

  return { detections, loading, error };
}
