import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface SmartRuleConfig {
  ignore_normal_movement: boolean;
  odd_hours_enabled: boolean;
  odd_hours_start: number;
  odd_hours_end: number;
  repeated_motion_enabled: boolean;
  repeated_motion_count: number;
  repeated_motion_window_sec: number;
  unknown_pattern_enabled: boolean;
  unknown_pattern_sensitivity: number;
  baseline: Record<string, number>;
}

const DEFAULTS: SmartRuleConfig = {
  ignore_normal_movement: true,
  odd_hours_enabled: true,
  odd_hours_start: 23,
  odd_hours_end: 6,
  repeated_motion_enabled: true,
  repeated_motion_count: 3,
  repeated_motion_window_sec: 300,
  unknown_pattern_enabled: true,
  unknown_pattern_sensitivity: 70,
  baseline: {},
};

export function useSmartRules(user: User | null) {
  const [config, setConfig] = useState<SmartRuleConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("smart_rule_configs")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (data) {
        setConfig({
          ignore_normal_movement: data.ignore_normal_movement,
          odd_hours_enabled: data.odd_hours_enabled,
          odd_hours_start: data.odd_hours_start,
          odd_hours_end: data.odd_hours_end,
          repeated_motion_enabled: data.repeated_motion_enabled,
          repeated_motion_count: data.repeated_motion_count,
          repeated_motion_window_sec: data.repeated_motion_window_sec,
          unknown_pattern_enabled: data.unknown_pattern_enabled,
          unknown_pattern_sensitivity: data.unknown_pattern_sensitivity,
          baseline: (data.baseline as Record<string, number>) || {},
        });
      } else {
        await supabase.from("smart_rule_configs").insert({ user_id: user.id, ...DEFAULTS });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const update = useCallback(
    async (patch: Partial<SmartRuleConfig>) => {
      if (!user) return;
      setConfig((prev) => ({ ...prev, ...patch }));
      await supabase.from("smart_rule_configs").update(patch).eq("user_id", user.id);
    },
    [user]
  );

  return { config, update, loading };
}

export function isOddHour(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  // wraps midnight, e.g. 23 -> 6
  return hour >= start || hour < end;
}
