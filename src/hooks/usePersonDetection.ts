import { useEffect, useRef, useState } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

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

export function usePersonDetection({
  videoRef,
  enabled,
  fps = 6,
  personOnly = true,
  minScore = 0.55,
}: Options) {
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    cocoSsd
      .load({ base: "lite_mobilenet_v2" })
      .then((m) => {
        if (cancelled) return;
        modelRef.current = m;
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || "Failed to load model");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!enabled || loading || !modelRef.current) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setDetections([]);
      return;
    }

    const tick = async () => {
      const video = videoRef.current;
      const model = modelRef.current;
      if (!video || !model || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const now = performance.now();
      if (now - lastRef.current < 1000 / fps) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      lastRef.current = now;

      try {
        const preds = await model.detect(video, 20);
        const filtered: Detection[] = preds
          .filter((p) => p.score >= minScore && (!personOnly || p.class === "person"))
          .map((p) => ({
            bbox: p.bbox as [number, number, number, number],
            score: p.score,
            class: p.class,
          }));
        setDetections(filtered);
      } catch {
        /* swallow */
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
