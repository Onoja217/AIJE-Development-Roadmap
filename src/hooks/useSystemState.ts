import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type ArmState = "disarmed" | "armed-home" | "armed-away";

export function useSystemState(user: User | null) {
  const [armState, setArmState] = useState<ArmState>("disarmed");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchState = async () => {
      const { data } = await supabase
        .from("system_state")
        .select("arm_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setArmState(data.arm_status as ArmState);
      }
      setLoading(false);
    };

    fetchState();

    const channel = supabase
      .channel("system_state_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_state", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new && "arm_status" in payload.new) {
            setArmState(payload.new.arm_status as ArmState);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const updateArmState = useCallback(async (newState: ArmState) => {
    if (!user) return;

    const { data: existing } = await supabase
      .from("system_state")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase.from("system_state").update({ arm_status: newState }).eq("user_id", user.id);
    } else {
      await supabase.from("system_state").insert({ user_id: user.id, arm_status: newState });
    }

    setArmState(newState);
  }, [user]);

  return { armState, updateArmState, loading };
}
