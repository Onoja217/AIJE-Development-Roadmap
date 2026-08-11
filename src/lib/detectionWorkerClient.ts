// Singleton client for the shared person-detection web worker.
// One worker process loads COCO-SSD once and serves all cameras.
import type { Detection } from "@/hooks/usePersonDetection";

let worker: Worker | null = null;
let ready = false;
let consumers = 0;
const readyWaiters: Array<() => void> = [];
let nextReqId = 1;
const pending = new Map<number, (d: Detection[]) => void>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(
    new URL("../workers/personDetection.worker.ts", import.meta.url),
    {
      type: "module",
    },
  );
  worker.onmessage = (e: MessageEvent) => {
    const msg = e.data;
    if (msg?.type === "ready") {
      ready = true;
      readyWaiters.splice(0).forEach((w) => w());
    } else if (msg?.type === "detect:result") {
      const cb = pending.get(msg.reqId);
      if (cb) {
        pending.delete(msg.reqId);
        cb(msg.detections as Detection[]);
      }
    }
  };
  worker.onerror = () => {
    // Surface worker errors as empty detections rather than crashing the app
    pending.forEach((cb) => cb([]));
    pending.clear();
    readyWaiters.splice(0).forEach((waiter) => waiter());
  };
  return worker;
}

export function acquireDetectionWorker() {
  consumers += 1;
  getWorker();
}

export function releaseDetectionWorker() {
  consumers = Math.max(0, consumers - 1);
  if (consumers > 0 || !worker) return;
  worker.terminate();
  worker = null;
  ready = false;
  pending.forEach((resolve) => resolve([]));
  pending.clear();
  readyWaiters.splice(0).forEach((waiter) => waiter());
}

export function waitForWorkerReady(): Promise<void> {
  getWorker();
  if (ready) return Promise.resolve();
  return new Promise((resolve) => readyWaiters.push(resolve));
}

export function detectInWorker(
  bitmap: ImageBitmap,
  minScore: number,
): Promise<Detection[]> {
  const w = getWorker();
  return new Promise((resolve) => {
    const reqId = nextReqId++;
    pending.set(reqId, resolve);
    const timeoutId = window.setTimeout(() => {
      if (!pending.delete(reqId)) return;
      try {
        bitmap.close();
      } catch {
        // The worker may already own or have closed the bitmap.
      }
      resolve([]);
    }, 15_000);
    pending.set(reqId, (detections) => {
      window.clearTimeout(timeoutId);
      resolve(detections);
    });
    try {
      w.postMessage({ type: "detect", reqId, bitmap, minScore }, [bitmap]);
    } catch {
      pending.delete(reqId);
      try {
        bitmap.close();
      } catch {
        /* noop */
      }
      resolve([]);
    }
  });
}
