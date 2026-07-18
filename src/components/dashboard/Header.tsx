import { Bell, Settings, Smartphone, Volume2, VolumeX, LogOut, UserCircle, Sun, Moon, ScanEye, Video } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import aijeLogo from "@/assets/aije-logo.png";
import { useMute } from "@/hooks/useMute";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useState, useEffect } from "react";

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function Header() {
  const { muted, toggleMute } = useMute();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const now = useClock();

  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-6 py-4"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-1 glow-primary overflow-hidden">
          <img src={aijeLogo} alt="AIJE logo" className="h-8 w-8 object-contain" width={32} height={32} />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">AIJE</h1>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">The eyes have seen</p>
        </div>
        <div className="hidden sm:flex flex-col items-end mr-2">
          <span className="font-mono text-sm font-semibold text-primary tabular-nums">{time}</span>
          <span className="text-xs text-muted-foreground">{date}</span>
        </div>
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
        <Link to="/control" className="rounded-lg bg-secondary p-2 transition-colors hover:bg-secondary/80" title="Control Panel">
          <Smartphone className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link to="/detection" className="rounded-lg bg-secondary p-2 transition-colors hover:bg-secondary/80" title="Detection Manager">
          <ScanEye className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link to="/cameras" className="rounded-lg bg-secondary p-2 transition-colors hover:bg-secondary/80" title="Camera Management">
          <Video className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link to="/sensors" className="rounded-lg bg-secondary p-2 transition-colors hover:bg-secondary/80" title="Sensor Settings">
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
