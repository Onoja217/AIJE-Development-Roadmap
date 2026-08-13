import { getErrorMessage } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import {
  ArrowLeft,
  Building2,
  Eye,
  EyeOff,
  HeartHandshake,
  Home,
  Lock,
  Mail,
  RadioTower,
  Shield,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const LOGIN_CATEGORIES = [
  {
    id: "resident",
    title: "Resident",
    description: "Personal safety, alerts, family and emergency contacts",
    icon: User,
  },
  {
    id: "household",
    title: "Household",
    description: "Home cameras, sensors, family members and alert rules",
    icon: Home,
  },
  {
    id: "operations",
    title: "Security Operations",
    description: "Live monitoring, cameras, detections and incident response",
    icon: RadioTower,
  },
  {
    id: "community",
    title: "Community & Response",
    description: "Community Watch, responders, reports and local alerts",
    icon: Users,
  },
  {
    id: "organization_admin",
    title: "Organization Admin",
    description: "Members, roles, sites, devices, billing and policies",
    icon: Building2,
  },
  {
    id: "platform_admin",
    title: "Platform Admin",
    description: "Platform operations, moderation, health and security audit",
    icon: ShieldCheck,
  },
] as const;

type LoginCategory = (typeof LOGIN_CATEGORIES)[number]["id"];

export default function Auth() {
  const [category, setCategory] = useState<LoginCategory | null>(null);
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const isLogin = mode === "login";
  const isForgot = mode === "forgot";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) navigate("/", { replace: true });
  }, [authLoading, navigate, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({
          title: "Check your email",
          description: "We sent you a password reset link.",
        });
        setMode("login");
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate("/", { replace: true });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
              requested_login_category: category,
            },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: "Check your email",
          description:
            "We sent you a confirmation link to verify your account.",
        });
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth`,
      });
      if (result.error) {
        toast({
          title: "Error",
          description: String(result.error),
          variant: "destructive",
        });
        return;
      }
      if (result.redirected) return;
      navigate("/");
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grid-overlay flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full space-y-6 ${category ? "max-w-sm" : "max-w-3xl"}`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3 glow-primary">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground">AIJE</h1>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              AI Security Command
            </p>
          </div>
        </div>

        {!category ? (
          <section
            className="space-y-5 rounded-xl border border-border bg-card p-5"
            aria-labelledby="login-category-title"
          >
            <div className="text-center">
              <h2
                id="login-category-title"
                className="text-base font-semibold text-foreground"
              >
                Choose your login category
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Your assigned permissions determine what you can access after
                sign in.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {LOGIN_CATEGORIES.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id)}
                    className="group rounded-lg border border-border bg-secondary/60 p-4 text-left transition-colors hover:border-primary/60 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Icon
                      className="mb-3 h-5 w-5 text-primary"
                      aria-hidden="true"
                    />
                    <span className="block text-sm font-semibold text-foreground">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      {item.description}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => navigate("/incident-report")}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <HeartHandshake
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
              Continue without an account to report an incident
            </button>
          </section>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-xl border border-border bg-card p-5"
          >
            <button
              type="button"
              onClick={() => setCategory(null)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Change login category
            </button>
            <h2 className="text-sm font-semibold text-foreground text-center">
              {isForgot
                ? "Reset Password"
                : isLogin
                  ? "Sign In"
                  : "Create Account"}
            </h2>
            <p className="text-center text-xs text-primary">
              {LOGIN_CATEGORIES.find((item) => item.id === category)?.title}
            </p>

            {!isLogin && !isForgot && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-secondary pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {!isForgot && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-border bg-secondary pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            )}

            {isLogin && !isForgot && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : isForgot
                  ? "Send Reset Link"
                  : isLogin
                    ? "Sign In"
                    : "Create Account"}
            </button>

            {!isForgot && (
              <>
                <div className="relative flex items-center gap-2">
                  <div className="flex-1 border-t border-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 border-t border-border" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  {googleLoading ? "Please wait..." : "Continue with Google"}
                </button>
              </>
            )}

            <p className="text-xs text-center text-muted-foreground">
              {isForgot ? (
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-primary hover:underline"
                >
                  Back to sign in
                </button>
              ) : isLogin ? (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-primary hover:underline"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-primary hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>
        )}
      </motion.div>
    </div>
  );
}
