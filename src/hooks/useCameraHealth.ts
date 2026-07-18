import { useState, useEffect, useRef } from "react";
import { type Camera } from "./useCameras";

export type CameraStatus = "online" | "offline" | "reconnecting" | "disabled";
export type CameraWarning = "high_latency" | "frozen_stream" | "fps_drop" | "connection_lost";

export interface CameraHealth {
  cameraId: string;
  status: CameraStatus;
  fps: number;
  latency: number; // in ms
  bitrate: number; // in kbps
  ping: number;    // in ms
  uptime: number;   // in seconds
  lastHeartbeat: string;
  connectionRetries: number;
  warnings: CameraWarning[];
  systemHealth: "healthy" | "warning" | "critical";
  recentIncident?: { type: string; time: string };
}

const createInitialHealth = (cameraId: string, enabled: boolean): CameraHealth => {
  if (!enabled) {
    return {
      cameraId,
      status: "disabled",
      fps: 0,
      latency: 0,
      bitrate: 0,
      ping: 0,
      uptime: 0,
      lastHeartbeat: new Date().toISOString(),
      connectionRetries: 0,
      warnings: [],
      systemHealth: "critical",
    };
  }
  
  // Nominal start values
  return {
    cameraId,
    status: "online",
    fps: 30,
    latency: 45,
    bitrate: 2200,
    ping: 12,
    uptime: 120, // simulate some prior uptime
    lastHeartbeat: new Date().toISOString(),
    connectionRetries: 0,
    warnings: [],
    systemHealth: "healthy",
  };
};

const updateSimulatedHealth = (prev: CameraHealth, enabled: boolean): CameraHealth => {
  if (!enabled) {
    return {
      ...prev,
      status: "disabled",
      fps: 0,
      latency: 0,
      bitrate: 0,
      ping: 0,
      uptime: 0,
      warnings: [],
    };
  }

  // Restore if it was disabled
  if (prev.status === "disabled") {
    return createInitialHealth(prev.cameraId, true);
  }

  let status = prev.status;
  let connectionRetries = prev.connectionRetries;
  let uptime = prev.uptime + 3; // ticks are ~3s
  let lastHeartbeat = prev.lastHeartbeat;

  const rand = Math.random();

  // Status transition simulation
  if (status === "online") {
    if (rand < 0.02) {
      status = "reconnecting";
    } else if (rand < 0.03) {
      status = "offline";
    }
  } else if (status === "reconnecting") {
    if (rand < 0.4) {
      status = "online";
      connectionRetries = 0;
    } else if (rand < 0.5) {
      status = "offline";
      connectionRetries += 1;
    } else {
      connectionRetries += 1;
    }
  } else if (status === "offline") {
    if (rand < 0.4) {
      status = "reconnecting";
    }
  }

  // Telemetry updates
  let fps = 0;
  let latency = 0;
  let bitrate = 0;
  let ping = 0;

  if (status === "online") {
    lastHeartbeat = new Date().toISOString();
    
    // Normal drift
    fps = Math.max(10, Math.min(30, Math.round(prev.fps + (Math.random() * 4 - 2))));
    latency = Math.max(15, Math.round(prev.latency + (Math.random() * 16 - 8)));
    bitrate = Math.max(800, Math.round(prev.bitrate + (Math.random() * 400 - 200)));
    ping = Math.max(4, Math.round(prev.ping + (Math.random() * 4 - 2)));

    // Occasional spikes to trigger warnings
    const spikeRand = Math.random();
    if (spikeRand < 0.05) {
      latency += 180;
    }
    if (spikeRand > 0.96) {
      fps = Math.round(fps / 4);
    }
  } else if (status === "reconnecting") {
    ping = Math.max(90, Math.round(prev.ping + (Math.random() * 40 - 20)));
  }

  if (status === "offline") {
    uptime = 0;
  }

  // Warn check
  const warnings: CameraWarning[] = [];
  if (status === "offline") {
    warnings.push("connection_lost");
  } else if (status === "online") {
    if (latency > 150) warnings.push("high_latency");
    if (fps < 12) warnings.push("fps_drop");
    if (fps === 0) warnings.push("frozen_stream");
  }

  let systemHealth: "healthy" | "warning" | "critical" = "healthy";
  if (status === "offline" || status === "disabled" || latency > 1000) {
    systemHealth = "critical";
  } else if (status === "reconnecting" || latency > 500 || connectionRetries > 0) {
    systemHealth = "warning";
  }

  // Incident mock logic
  let recentIncident = prev.recentIncident;
  if (enabled && status === "online") {
    // 1% chance per tick to generate an incident if none exists, or 0.5% chance to update it
    if (!recentIncident && Math.random() < 0.01) {
      const types = ["Motion Detected", "Zone Breach", "Person Detected", "Vehicle Detected"];
      recentIncident = {
        type: types[Math.floor(Math.random() * types.length)],
        time: new Date(Date.now() - Math.random() * 600000).toISOString(), // sometime in last 10 mins
      };
    } else if (recentIncident && Math.random() < 0.005) {
      recentIncident = undefined; // clear it occasionally
    }
  }

  return {
    cameraId: prev.cameraId,
    status,
    fps,
    latency,
    bitrate,
    ping,
    uptime,
    lastHeartbeat,
    connectionRetries,
    warnings,
    systemHealth,
    recentIncident,
  };
};

export function useCameraHealth(cameras: Camera[]) {
  const [healthMap, setHealthMap] = useState<Record<string, CameraHealth>>({});
  const healthRef = useRef<Record<string, CameraHealth>>({});

  useEffect(() => {
    // Populate any new cameras
    const nextMap = { ...healthRef.current };
    let changed = false;

    cameras.forEach((cam) => {
      if (!nextMap[cam.id]) {
        nextMap[cam.id] = createInitialHealth(cam.id, cam.enabled);
        changed = true;
      } else if ((cam.enabled && nextMap[cam.id].status === "disabled") || (!cam.enabled && nextMap[cam.id].status !== "disabled")) {
        // Toggle health status when camera enabled changes
        nextMap[cam.id] = createInitialHealth(cam.id, cam.enabled);
        changed = true;
      }
    });

    // Cleanup deleted cameras
    const cameraIds = new Set(cameras.map((c) => c.id));
    Object.keys(nextMap).forEach((id) => {
      if (!cameraIds.has(id)) {
        delete nextMap[id];
        changed = true;
      }
    });

    if (changed) {
      healthRef.current = nextMap;
      setHealthMap(nextMap);
    }
  }, [cameras]);

  useEffect(() => {
    const timer = setInterval(() => {
      const currentMap = { ...healthRef.current };
      let changed = false;

      cameras.forEach((cam) => {
        const prev = currentMap[cam.id];
        if (prev) {
          currentMap[cam.id] = updateSimulatedHealth(prev, cam.enabled);
          changed = true;
        }
      });

      if (changed) {
        healthRef.current = currentMap;
        setHealthMap(currentMap);
      }
    }, 3000); // refresh simulated status every 3 seconds

    return () => clearInterval(timer);
  }, [cameras]);

  const getHealth = (cameraId: string): CameraHealth => {
    return healthMap[cameraId] || {
      cameraId,
      status: "offline",
      fps: 0,
      latency: 0,
      bitrate: 0,
      ping: 0,
      uptime: 0,
      lastHeartbeat: new Date().toISOString(),
      connectionRetries: 0,
      warnings: ["connection_lost"],
      systemHealth: "critical",
    };
  };

  return { healthMap, getHealth };
}
