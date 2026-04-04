import { Shield, Bell, Settings, Smartphone, Volume2, VolumeX, LogOut, UserCircle, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useMute } from "@/hooks/useMute";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

export function Header() {
  const { muted, toggleMute } = useMute();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-6 py-4"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2 glow-primary">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">AEGIS</h1>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">AI Security Command</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="rounded-lg bg-secondary p-2 transition-colors hover:bg-secondary/80"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-warning" />
          ) : (
            <Moon className="h-4 w-4 text-primary" />
          )}
        </button>
        <button
          onClick={toggleMute}
          className={`rounded-lg p-2 transition-colors ${muted ? "bg-destructive/10 hover:bg-destructive/20" : "bg-secondary hover:bg-secondary/80"}`}
          title={muted ? "Unmute alerts" : "Mute alerts"}
        >
          {muted ? (
            <VolumeX className="h-4 w-4 text-destructive" />
          ) : (
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <button className="relative rounded-lg bg-secondary p-2 transition-colors hover:bg-secondary/80">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
        </button>
        <Link to="/control" className="rounded-lg bg-secondary p-2 transition-colors hover:bg-secondary/80">
          <Smartphone className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link to="/sensors" className="rounded-lg bg-secondary p-2 transition-colors hover:bg-secondary/80">
          <Settings className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link to="/profile" className="rounded-lg bg-secondary p-2 transition-colors hover:bg-secondary/80" title="Profile">
          <UserCircle className="h-4 w-4 text-muted-foreground" />
        </Link>
        <button onClick={signOut} className="rounded-lg bg-secondary p-2 transition-colors hover:bg-destructive/10" title="Sign out">
          <LogOut className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </motion.header>
  );
}
