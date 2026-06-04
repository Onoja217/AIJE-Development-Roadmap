import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Deployment = {
  id: string;
  user_id: string;
  name: string;
  location: string | null;
  description: string | null;
  status: string;
  timezone: string | null;
  created_at: string;
};

export function useDeployments() {
  const { user } = useAuth();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setDeployments([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("deployments")
      .select("*")
      .order("created_at", { ascending: false });
    setDeployments((data as Deployment[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = async (input: { name: string; location?: string; description?: string }) => {
    if (!user) throw new Error("Not signed in");
    const { error } = await supabase.from("deployments").insert({ ...input, user_id: user.id });
    if (error) throw error;
    await refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("deployments").delete().eq("id", id);
    if (error) throw error;
    await refresh();
  };

  const update = async (id: string, patch: Partial<Deployment>) => {
    const { error } = await supabase.from("deployments").update(patch).eq("id", id);
    if (error) throw error;
    await refresh();
  };

  return { deployments, loading, refresh, create, remove, update };
}
