import { useEffect, useRef, useState } from "react";
import { detectInWorker, waitForWorkerReady } from "@/lib/detectionWorkerClient";

export interface Detection {
  bbox: [number, number, number, number]; // x, y, w, h in video pixels
  score: number;
  /** Temporally smoothed confidence across the track's lifetime (0-1). */
  avgScore?: number;
  class: string;
  trackId?: number;
  seenCount?: number;
  /** True once the track has been seen on `confirmFrames` consecutive frames. */
  confirmed?: boolean;
}

interface Track {
  id: number;
  bbox: [number, number, number, number];
  class: string;
  unseenFrames: number;
  seenCount: number;
  avgScore: number;
}

interface Options {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  fps?: number;
  personOnly?: boolean;
  minScore?: number;
  /**
   * When false the hook keeps its rAF loop alive but skips the expensive
   * TensorFlow.js inference, preserving the last known detections on screen.
   * Use this to gate AI processing behind motion detection so the model
   * only runs when something is actually moving in the frame.
   * Defaults to true (always process).
   */
  shouldProcess?: boolean;
  /** Consecutive frames a track must be seen before it counts as confirmed. */
  confirmFrames?: number;
  /** Bounding-box smoothing factor (0 = no smoothing, 0.6 = heavy). */
  smoothing?: number;
  /** Target inference width in px; frames are resized before inference. */
  inferenceWidth?: number;
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
  minScore = 0.80,
  shouldProcess = true,
  confirmFrames = 3,
  smoothing = 0.4,
  inferenceWidth = 640,
}: Options) {
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const inFlightRef = useRef(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  // Keep shouldProcess in a ref so the rAF tick always reads the latest
  // value without needing to restart the loop on every toggle.
  const shouldProcessRef = useRef(shouldProcess);
  shouldProcessRef.current = shouldProcess;

  // Track identities across frames
  const tracksRef = useRef<Track[]>([]);
  const nextTrackIdRef = useRef(1);

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

      // Motion-gate: skip the expensive AI inference when there is no
      // motion, but keep the loop alive and retain previous detections.
      if (!shouldProcessRef.current) {
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
        // Normalise the frame to a consistent, higher inference resolution so
        // small/low-res streams still produce confident detections.
        const targetW = Math.max(video.videoWidth, inferenceWidth);
        const scale = targetW / video.videoWidth;
        const bitmap = await createImageBitmap(video, {
          resizeWidth: Math.round(video.videoWidth * scale),
          resizeHeight: Math.round(video.videoHeight * scale),
          resizeQuality: "high",
        });
        const raw = await detectInWorker(bitmap, minScore);
        const preds = raw.map((p) => ({
          ...p,
          bbox: [
            p.bbox[0] / scale,
            p.bbox[1] / scale,
            p.bbox[2] / scale,
            p.bbox[3] / scale,
          ] as [number, number, number, number],
        }));
        const filtered = personOnly ? preds.filter((p) => p.class === "person") : preds;

        // Perform IoU tracking on new detections
        const currentTracks = tracksRef.current;
        const matchedDetections: Detection[] = [];
        const matchedTrackIndexes = new Set<number>();

        for (const det of filtered) {
          let bestIoU = 0;
          let bestTrackIdx = -1;

          for (let i = 0; i < currentTracks.length; i++) {
            if (matchedTrackIndexes.has(i)) continue;
            if (currentTracks[i].class !== det.class) continue;

            const iou = getIntersectionOverUnion(det.bbox, currentTracks[i].bbox);
            if (iou > bestIoU && iou >= 0.3) {
              bestIoU = iou;
              bestTrackIdx = i;
            }
          }

          if (bestTrackIdx !== -1) {
            // Found existing track match
            matchedTrackIndexes.add(bestTrackIdx);
            const track = currentTracks[bestTrackIdx];
            // Smooth the box so labels/zones don't jitter frame to frame.
            track.bbox = track.bbox.map(
              (prev, idx) => prev * smoothing + det.bbox[idx] * (1 - smoothing),
            ) as [number, number, number, number];
            track.unseenFrames = 0;
            track.seenCount += 1;
            track.avgScore = track.avgScore * 0.7 + det.score * 0.3;

            matchedDetections.push({
              ...det,
              bbox: track.bbox,
              trackId: track.id,
              seenCount: track.seenCount,
              avgScore: track.avgScore,
              confirmed: track.seenCount >= confirmFrames,
            });
          } else {
            // Create a new track
            const newId = nextTrackIdRef.current++;
            currentTracks.push({
              id: newId,
              bbox: det.bbox,
              class: det.class,
              unseenFrames: 0,
              seenCount: 1,
              avgScore: det.score,
            });

            matchedDetections.push({
              ...det,
              trackId: newId,
              seenCount: 1,
              avgScore: det.score,
              confirmed: confirmFrames <= 1,
            });
          }
        }

        // Increment unseen counter for tracks that weren't matched in this frame
        for (let i = 0; i < currentTracks.length; i++) {
          if (!matchedTrackIndexes.has(i)) {
            currentTracks[i].unseenFrames += 1;
          }
        }

        // Remove tracks that haven't been seen for more than 5 consecutive frames
        tracksRef.current = currentTracks.filter((t) => t.unseenFrames <= 5);

        setDetections(matchedDetections);
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
  }, [
    enabled,
    loading,
    fps,
    personOnly,
    minScore,
    videoRef,
    confirmFrames,
    smoothing,
    inferenceWidth,
  ]);

  return { detections, loading, error };
}

function getIntersectionOverUnion(
  box1: [number, number, number, number],
  box2: [number, number, number, number]
): number {
  const [x1, y1, w1, h1] = box1;
  const [x2, y2, w2, h2] = box2;

  const minX = Math.max(x1, x2);
  const minY = Math.max(y1, y2);
  const maxX = Math.min(x1 + w1, x2 + w2);
  const maxY = Math.min(y1 + h1, y2 + h2);

  if (maxX <= minX || maxY <= minY) return 0;

  const intersectionArea = (maxX - minX) * (maxY - minY);
  const box1Area = w1 * h1;
  const box2Area = w2 * h2;
  const unionArea = box1Area + box2Area - intersectionArea;

  return unionArea > 0 ? intersectionArea / unionArea : 0;
}
