import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/notificationService";
import type { User } from "@supabase/supabase-js";

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
    link: "/profile",
  });
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);

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

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, loading, signOut };
}
