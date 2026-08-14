import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/notificationService";
import type { User } from "@supabase/supabase-js";
import { APP_PATHS } from "@/features/navigation/navigationConfig";

/** One sign-in notification per browser session, per user. */
function notifySignInOnce(user: User) {
  const key = `aije-signin-notified:${user.id}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    return;
  }

  void createNotification({
    category: "auth",
    priority: "low",
    title: "New sign-in to AIJE",
    body: `Signed in as ${user.email ?? user.id} on ${new Date().toLocaleString()}.`,
    link: APP_PATHS.profile,
  });
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const settle = (nextUser: User | null) => {
      if (!active) return;
      setUser(nextUser);
      setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      settle(session?.user ?? null);

      if (event === "SIGNED_IN" && session?.user) {
        notifySignInOnce(session.user);
      }
      if (event === "SIGNED_OUT") {
        try {
          Object.keys(sessionStorage)
            .filter((key) => key.startsWith("aije-signin-notified:"))
            .forEach((key) => sessionStorage.removeItem(key));
        } catch {
          /* ignore */
        }
      }
    });

    const timeout = window.setTimeout(() => {
      console.error("[auth] Session initialization timed out.");
      settle(null);
    }, 10_000);

    void supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error("[auth] Session initialization failed", {
            message: error.message,
          });
        }
        settle(session?.user ?? null);
      })
      .catch((error: unknown) => {
        console.error("[auth] Session initialization failed", error);
        settle(null);
      })
      .finally(() => window.clearTimeout(timeout));

    return () => {
      active = false;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, loading, signOut };
}
