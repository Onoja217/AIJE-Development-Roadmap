import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface SensorConfig {
  sensor_key: string;
  enabled: boolean;
  sensitivity: number;
  warning_threshold: number;
  critical_threshold: number;
}

const DEFAULT_SENSORS = ["vibration", "motion", "movement", "cameras", "environment", "access"];

export function useSensorConfigs(user: User | null) {
  const [configs, setConfigs] = useState<SensorConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchConfigs = async () => {
      const { data } = await supabase
        .from("sensor_configs")
        .select("sensor_key, enabled, sensitivity, warning_threshold, critical_threshold")
        .eq("user_id", user.id);

      if (data && data.length > 0) {
        setConfigs(data);
      } else {
        // Initialize defaults
        const defaults: SensorConfig[] = DEFAULT_SENSORS.map((key) => ({
          sensor_key: key, enabled: true, sensitivity: 70, warning_threshold: 60, critical_threshold: 85,
        }));
        setConfigs(defaults);
        // Insert defaults into DB
        await supabase.from("sensor_configs").insert(
          defaults.map((c) => ({ user_id: user.id, ...c }))
        );
      }
      setLoading(false);
    };

    fetchConfigs();

    const channel = supabase
      .channel("sensor_configs_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sensor_configs", filter: `user_id=eq.${user.id}` },
        () => { fetchConfigs(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const updateConfig = useCallback(async (sensorKey: string, updates: Partial<SensorConfig>) => {
    if (!user) return;
    await supabase
      .from("sensor_configs")
      .update(updates)
      .eq("user_id", user.id)
      .eq("sensor_key", sensorKey);

    setConfigs((prev) =>
      prev.map((c) => (c.sensor_key === sensorKey ? { ...c, ...updates } : c))
    );
  }, [user]);

  return { configs, updateConfig, loading };
}
