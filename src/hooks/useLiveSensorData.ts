import { useState, useEffect, useCallback } from "react";

interface SensorData {
  vibration: { value: string; status: "online" | "warning" | "alert"; detail: string };
  motion: { value: string; status: "online" | "warning" | "alert"; detail: string };
  movement: { value: string; status: "online" | "warning" | "alert"; detail: string };
  cameras: { value: string; status: "online" | "warning" | "alert"; detail: string };
  environment: { value: string; status: "online" | "warning" | "alert"; detail: string };
  access: { value: string; status: "online" | "warning" | "alert"; detail: string };
}

const vibrationValues = ["2.1 Hz", "3.4 Hz", "4.2 Hz", "5.8 Hz", "1.7 Hz", "6.3 Hz", "3.9 Hz", "7.1 Hz"];
const vibrationDetails = ["Normal range", "Slight tremor", "Anomaly detected", "Spike detected", "Baseline stable", "Pattern irregular"];
const motionCounts = ["0 events", "1 event", "2 events", "3 events", "5 events", "7 events"];
const motionDetails = ["All clear", "East wing activity", "North corridor", "Rear entry", "Multiple zones"];
const temperatures = ["19°C", "20°C", "21°C", "22°C", "23°C", "24°C", "25°C"];
const humidities = ["Humidity 38%", "Humidity 42%", "Humidity 45%", "Humidity 51%", "Humidity 55%"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function statusFromVibration(v: string): "online" | "warning" | "alert" {
  const num = parseFloat(v);
  if (num > 5) return "alert";
  if (num > 3.5) return "warning";
  return "online";
}

function statusFromMotion(v: string): "online" | "warning" | "alert" {
  const num = parseInt(v);
  if (num >= 5) return "alert";
  if (num >= 2) return "warning";
  return "online";
}

export function useLiveSensorData(intervalMs = 2500): SensorData {
  const generate = useCallback((): SensorData => {
    const vib = pick(vibrationValues);
    const mot = pick(motionCounts);
    const cameraOnline = 22 + Math.floor(Math.random() * 3);
    return {
      vibration: { value: vib, status: statusFromVibration(vib), detail: pick(vibrationDetails) },
      motion: { value: mot, status: statusFromMotion(mot), detail: pick(motionDetails) },
      movement: { value: Math.random() > 0.15 ? "Normal" : "Detected", status: Math.random() > 0.15 ? "online" : "alert", detail: Math.random() > 0.15 ? "No intrusion" : "Perimeter breach" },
      cameras: { value: `${cameraOnline}/24`, status: cameraOnline === 24 ? "online" : "warning", detail: cameraOnline === 24 ? "All feeds active" : `${24 - cameraOnline} offline` },
      environment: { value: pick(temperatures), status: "online", detail: pick(humidities) },
      access: { value: Math.random() > 0.1 ? "Locked" : "Breached", status: Math.random() > 0.1 ? "online" : "alert", detail: Math.random() > 0.1 ? "All entry points" : "Zone D compromised" },
    };
  }, []);

  const [data, setData] = useState<SensorData>(generate);

  useEffect(() => {
    const id = setInterval(() => setData(generate()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, generate]);

  return data;
}

export function useLiveVibrationData(intervalMs = 1500) {
  const generate = useCallback(() => {
    const points: number[] = [];
    const anomalyStart = 30 + Math.floor(Math.random() * 15);
    const anomalyLen = 5 + Math.floor(Math.random() * 8);
    for (let i = 0; i < 60; i++) {
      let val = Math.sin(i * 0.3 + Math.random() * 0.5) * 15 + 30;
      if (i > anomalyStart && i < anomalyStart + anomalyLen) val += Math.random() * 40 + 20;
      else val += Math.random() * 8;
      points.push(val);
    }
    return { points, anomalyStart, anomalyLen, hasAnomaly: Math.random() > 0.3 };
  }, []);

  const [data, setData] = useState(generate);

  useEffect(() => {
    const id = setInterval(() => setData(generate()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, generate]);

  return data;
}
