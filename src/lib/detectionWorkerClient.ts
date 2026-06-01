// Singleton client for the shared person-detection web worker.
// One worker process loads COCO-SSD once and serves all cameras.
import type { Detection } from "@/hooks/usePersonDetection";

let worker: Worker | null = null;
let ready = false;
const readyWaiters: Array<() => void> = [];
let nextReqId = 1;
const pending = new Map<number, (d: Detection[]) => void>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("../workers/personDetection.worker.ts", import.meta.url), {
    type: "module",
  });
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
  };
  return worker;
}

export function waitForWorkerReady(): Promise<void> {
  getWorker();
  if (ready) return Promise.resolve();
  return new Promise((resolve) => readyWaiters.push(resolve));
}

export function detectInWorker(bitmap: ImageBitmap, minScore: number): Promise<Detection[]> {
  const w = getWorker();
  return new Promise((resolve) => {
    const reqId = nextReqId++;
    pending.set(reqId, resolve);
    try {
      w.postMessage({ type: "detect", reqId, bitmap, minScore }, [bitmap]);
    } catch {
      pending.delete(reqId);
      try { bitmap.close(); } catch { /* noop */ }
      resolve([]);
    }
  });
}
