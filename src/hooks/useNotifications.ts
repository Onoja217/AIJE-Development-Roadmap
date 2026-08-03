import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type {
  AppNotification,
  NotificationCategory,
  NotificationPriority,
} from "@/lib/notificationService";

export interface NotificationFilters {
  category: NotificationCategory | "all";
  priority: NotificationPriority | "all";
  readState: "all" | "unread" | "read";
  search: string;
}

export const DEFAULT_NOTIFICATION_FILTERS: NotificationFilters = {
  category: "all",
  priority: "all",
  readState: "all",
  search: "",
};

const PAGE_SIZE = 10;

export function useNotifications(filters?: Partial<NotificationFilters>) {
  const { user } = useAuth();

  const activeFilters = useMemo<NotificationFilters>(
    () => ({ ...DEFAULT_NOTIFICATION_FILTERS, ...filters }),
    [filters]
  );

  const [items, setItems] = useState<AppNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { category, priority, readState, search } = activeFilters;

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setTotal(0);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (category !== "all") query = query.eq("category", category);
    if (priority !== "all") query = query.eq("priority", priority);
    if (readState === "unread") query = query.is("read_at", null);
    if (readState === "read") query = query.not("read_at", "is", null);

    const term = search.trim();
    if (term) {
      const escaped = term.replace(/[%,]/g, " ");
      query = query.or(`title.ilike.%${escaped}%,body.ilike.%${escaped}%`);
    }

    const from = page * PAGE_SIZE;
    const { data, count, error: queryError } = await query.range(
      from,
      from + PAGE_SIZE - 1
    );

    if (queryError) {
      setError(queryError.message);
      setItems([]);
      setTotal(0);
    } else {
      setItems((data ?? []) as unknown as AppNotification[]);
      setTotal(count ?? 0);
    }

    const { count: unread } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);

    setUnreadCount(unread ?? 0);
    setLoading(false);
  }, [user, category, priority, readState, search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reset pagination whenever filters change.
  useEffect(() => {
    setPage(0);
  }, [category, priority, readState, search]);

  // Live updates.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void load();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, load]);

  const markRead = useCallback(
    async (id: string, read = true) => {
      if (!user) return;
      await supabase
        .from("notifications")
        .update({ read_at: read ? new Date().toISOString() : null })
        .eq("id", id)
        .eq("user_id", user.id);
      void load();
    },
    [user, load]
  );

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    void load();
  }, [user, load]);

  const remove = useCallback(
    async (id: string) => {
      if (!user) return;
      await supabase
        .from("notifications")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      void load();
    },
    [user, load]
  );

  return {
    items,
    total,
    unreadCount,
    page,
    pageSize: PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    loading,
    error,
    setPage,
    refresh: load,
    markRead,
    markAllRead,
    remove,
  };
}

/** Lightweight unread counter for header badges. */
export function useUnreadNotificationCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!user) {
      setCount(0);
      return;
    }
    const { count: unread } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);
    setCount(unread ?? 0);
  }, [user]);

  useEffect(() => {
    void load();
    if (!user) return;

    const channel = supabase
      .channel(`notifications-badge-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => void load()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, load]);

  return count;
}
