import { useEffect, useRef, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { useSmartRules, isOddHour } from "./useSmartRules";
import { useOfflineQueue } from "./useOfflineQueue";
import { supabase } from "@/integrations/supabase/client";

interface UseSmartMotionEngineOpts {
  user: User | null;
  effectiveMotion: number;        // 0-100 from useMotionDetection
  cameraName: string;
  enabled: boolean;
  /** When set (>= 0), overrides effectiveMotion — used by the Motion Simulator. */
  simulatedMotionLevel?: number | null;
  onAlert?: (msg: string, severity: "danger" | "warning") => void;
}

const NORMAL_THRESHOLD = 8;       // motion below this is "normal"
const EVENT_THRESHOLD = 18;       // counts as a discrete motion event
const EVENT_DEBOUNCE_MS = 1500;   // gap between counted events
const ALERT_COOLDOWN_MS = 30000;  // per-rule cooldown

export function useSmartMotionEngine({
  user,
  effectiveMotion,
  cameraName,
  enabled,
  simulatedMotionLevel,
  onAlert,
}: UseSmartMotionEngineOpts) {
  const effectiveMotion =
    simulatedMotionLevel != null && simulatedMotionLevel >= 0
      ? simulatedMotionLevel
      : effectiveMotion;
  const { config, update } = useSmartRules(user);
  const { queueAlert, online } = useOfflineQueue(user);

  const eventsRef = useRef<number[]>([]);          // timestamps of recent events
  const lastEventRef = useRef(0);
  const lastAlertRef = useRef<Record<string, number>>({});
  const baselineBufferRef = useRef<{ hour: number; level: number }[]>([]);

  const fireAlert = useCallback(
    async (ruleKey: string, message: string, severity: "danger" | "warning") => {
      const now = Date.now();
      if (now - (lastAlertRef.current[ruleKey] ?? 0) < ALERT_COOLDOWN_MS) return;
      lastAlertRef.current[ruleKey] = now;
      onAlert?.(message, severity);
      await queueAlert({
        sensor_type: "motion",
        severity: severity === "danger" ? "critical" : "warning",
        message,
        value: effectiveMotion,
      });
    },
    [onAlert, queueAlert, effectiveMotion]
  );

  // Process motion-level updates
  useEffect(() => {
    if (!enabled || !user) return;
    const now = Date.now();
    const hour = new Date().getHours();

    // Update baseline buffer (always, even if ignored)
    baselineBufferRef.current.push({ hour, level: effectiveMotion });
    if (baselineBufferRef.current.length > 200) baselineBufferRef.current.shift();

    // Ignore "normal" baseline motion
    if (config.ignore_normal_movement && effectiveMotion < NORMAL_THRESHOLD) return;

    // Discrete event detection
    const isEvent =
      effectiveMotion >= EVENT_THRESHOLD && now - lastEventRef.current > EVENT_DEBOUNCE_MS;
    if (isEvent) {
      lastEventRef.current = now;
      eventsRef.current.push(now);
      // trim to window
      const windowMs = config.repeated_motion_window_sec * 1000;
      eventsRef.current = eventsRef.current.filter((t) => now - t <= windowMs);

      // RULE 1: Odd hours
      if (config.odd_hours_enabled && isOddHour(hour, config.odd_hours_start, config.odd_hours_end)) {
        fireAlert(
          "odd_hours",
          `${cameraName}: motion detected during quiet hours (${String(hour).padStart(2, "0")}:00)`,
          "danger"
        );
      }

      // RULE 2: Repeated motion
      if (
        config.repeated_motion_enabled &&
        eventsRef.current.length >= config.repeated_motion_count
      ) {
        fireAlert(
          "repeated",
          `${cameraName}: ${eventsRef.current.length} motion events in ${Math.round(
            config.repeated_motion_window_sec / 60
          )} min`,
          "warning"
        );
      }

      // RULE 3: Unknown pattern (deviation from baseline)
      if (config.unknown_pattern_enabled) {
        const baseline = config.baseline[String(hour)];
        if (baseline !== undefined && baseline > 0) {
          // higher sensitivity = smaller deviation triggers
          const tolerance = (110 - config.unknown_pattern_sensitivity) / 100; // 0.1..1.0
          const deviation = (effectiveMotion - baseline) / Math.max(baseline, 1);
          if (deviation > tolerance && effectiveMotion > baseline + 10) {
            fireAlert(
              "unknown",
              `${cameraName}: unusual activity (${Math.round(effectiveMotion)}% vs typical ${Math.round(
                baseline
              )}%)`,
              "warning"
            );
          }
        }
      }
    }
  }, [effectiveMotion, enabled, user, config, cameraName, fireAlert]);

  // Periodically learn baseline (rolling avg per hour) every 60s
  useEffect(() => {
    if (!enabled || !user) return;
    const id = setInterval(async () => {
      const buf = baselineBufferRef.current;
      if (buf.length < 10) return;
      const byHour: Record<string, number[]> = {};
      buf.forEach(({ hour, level }) => {
        const k = String(hour);
        (byHour[k] ||= []).push(level);
      });
      const next = { ...config.baseline };
      let changed = false;
      Object.entries(byHour).forEach(([h, vals]) => {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        const prev = next[h] ?? avg;
        const blended = prev * 0.85 + avg * 0.15; // EMA
        if (Math.abs(blended - prev) > 0.5) changed = true;
        next[h] = blended;
      });
      baselineBufferRef.current = [];
      if (changed && online) {
        await supabase
          .from("smart_rule_configs")
          .update({ baseline: next })
          .eq("user_id", user.id);
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [enabled, user, config.baseline, online]);

  return { config, update, online };
}
