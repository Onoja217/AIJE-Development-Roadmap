import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Plan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_ngn_kobo: number;
  billing_interval: string;
  max_cameras: number;
  max_deployments: number;
  retention_days: number;
  features: string[];
  is_custom: boolean;
  sort_order: number;
};

export type Subscription = {
  id: string;
  user_id: string;
  plan_id: string | null;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase
      .from("plans")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => {
        setPlans((data as any[])?.map((p) => ({ ...p, features: p.features ?? [] })) ?? []);
        setLoading(false);
      });
  }, []);
  return { plans, loading };
}

export function useSubscription() {
  const { user } = useAuth();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setSub(null);
      setPlan(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("subscriptions")
      .select("*, plans(*)")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setSub(data as any);
      setPlan(((data as any).plans ?? null) as Plan | null);
    } else {
      setSub(null);
      setPlan(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isActive =
    sub?.status === "active" &&
    (!sub.current_period_end || new Date(sub.current_period_end) > new Date());

  return { sub, plan, loading, refresh, isActive };
}
