import { useEffect, useRef, useCallback } from "react";

function playAlarmSound(severity: "danger" | "warning") {
  const ctx = new AudioContext();
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

  const osc = ctx.createOscillator();
  osc.connect(gain);
  osc.type = severity === "danger" ? "sawtooth" : "sine";
  osc.frequency.setValueAtTime(severity === "danger" ? 880 : 660, ctx.currentTime);
  if (severity === "danger") {
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);
  }
  osc.start();
  osc.stop(ctx.currentTime + 0.8);

  if (severity === "danger") {
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    gain2.connect(ctx.destination);
    gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.3);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    osc2.connect(gain2);
    osc2.type = "square";
    osc2.frequency.setValueAtTime(1200, ctx.currentTime + 0.3);
    osc2.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.7);
    osc2.start(ctx.currentTime + 0.3);
    osc2.stop(ctx.currentTime + 0.9);
  }
}

function sendBrowserNotification(title: string, body: string) {
  if (Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: "/placeholder.svg",
      tag: "aegis-alert",
      renotify: true,
    });
  }
}

export function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export function useAlertNotifications() {
  const lastAlertTimeRef = useRef(0);

  const notify = useCallback((message: string, severity: "danger" | "warning") => {
    const now = Date.now();
    // Throttle to one notification per 3 seconds
    if (now - lastAlertTimeRef.current < 3000) return;
    lastAlertTimeRef.current = now;

    playAlarmSound(severity);

    if (severity === "danger") {
      sendBrowserNotification(
        "⚠️ AEGIS Critical Alert",
        message
      );
    }
  }, []);

  return { notify };
}
