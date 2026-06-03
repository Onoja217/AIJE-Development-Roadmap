import { useCallback, useRef } from "react";
import { useMute } from "@/hooks/useMute";

function playAlarmSound(severity: "danger" | "warning") {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!Ctx) return;
    const ctx = new Ctx();
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
  } catch (err) {
    console.warn("[AIJE] Audio alarm failed:", err);
  }
}

async function sendBrowserNotification(title: string, body: string) {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) {
      console.warn("[AIJE] Notifications API not available");
      return;
    }
    if (Notification.permission !== "granted") return;

    const options: NotificationOptions = {
      body,
      icon: "/aije-logo.png",
      tag: "aije-alert",
    };

    // Prefer ServiceWorkerRegistration.showNotification — required on Android/Chrome
    // and avoids "Illegal constructor" errors in contexts where the direct
    // Notification() constructor is disallowed.
    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && typeof reg.showNotification === "function") {
          await reg.showNotification(title, options);
          return;
        }
      } catch (err) {
        console.warn("[AIJE] SW notification failed, falling back:", err);
      }
    }

    // Fallback to direct constructor where supported (desktop browsers).
    try {
      new Notification(title, options);
    } catch (err) {
      console.warn("[AIJE] Direct Notification constructor failed:", err);
    }
  } catch (err) {
    console.warn("[AIJE] sendBrowserNotification error:", err);
  }
}

export function requestNotificationPermission() {
  try {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch((err) => {
        console.warn("[AIJE] Notification permission request failed:", err);
      });
    }
  } catch (err) {
    console.warn("[AIJE] requestNotificationPermission error:", err);
  }
}

export function useAlertNotifications() {
  const { muted } = useMute();
  const lastAlertTimeRef = useRef(0);

  const notify = useCallback((message: string, severity: "danger" | "warning") => {
    try {
      const now = Date.now();
      if (now - lastAlertTimeRef.current < 3000) return;
      lastAlertTimeRef.current = now;

      if (!muted) {
        playAlarmSound(severity);
      }

      if (severity === "danger") {
        void sendBrowserNotification("⚠️ AIJE Critical Alert", message);
      }
    } catch (err) {
      console.warn("[AIJE] notify error:", err);
    }
  }, [muted]);

  return { notify };
}
