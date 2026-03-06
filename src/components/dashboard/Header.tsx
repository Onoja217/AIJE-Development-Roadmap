import { Shield, Bell, Settings, Smartphone } from "lucide-react";
import { motion } from "framer-motion";

export function Header() {
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
        <button className="relative rounded-lg bg-secondary p-2 transition-colors hover:bg-secondary/80">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
        </button>
        <button className="rounded-lg bg-secondary p-2 transition-colors hover:bg-secondary/80">
          <Smartphone className="h-4 w-4 text-muted-foreground" />
        </button>
        <button className="rounded-lg bg-secondary p-2 transition-colors hover:bg-secondary/80">
          <Settings className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </motion.header>
  );
}
