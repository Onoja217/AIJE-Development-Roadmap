import { useState } from "react";
import { type Camera } from "@/hooks/useCameras";
import { type CameraHealth } from "@/hooks/useCameraHealth";
import { 
  Trash2, Edit, Power, PowerOff, ShieldCheck, 
  Activity, Signal, Clock, Eye, AlertTriangle, ChevronDown, ChevronUp, Brain, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CameraHealthCardProps {
  camera: Camera;
  health: CameraHealth;
  onEdit: (camera: Camera) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}

export function CameraHealthCard({ camera, health, onEdit, onDelete, onToggle }: CameraHealthCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Status Badge configurations
  const statusConfig = {
    online: { label: "ONLINE", dot: "bg-success", text: "text-success", bg: "bg-success/10", border: "border-success/20" },
    offline: { label: "OFFLINE", dot: "bg-destructive animate-pulse", text: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
    reconnecting: { label: "RECONNECTING", dot: "bg-warning animate-ping", text: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
    disabled: { label: "DISABLED", dot: "bg-muted", text: "text-muted-foreground", bg: "bg-muted/10", border: "border-muted/20" },
  };

  const currentStatus = statusConfig[health.status];

  // System Health configs
  const systemHealthConfig = {
    healthy: { label: "Healthy", color: "bg-success text-success-foreground", icon: "🟢" },
    warning: { label: "Warning", color: "bg-warning text-warning-foreground", icon: "🟡" },
    critical: { label: "Critical", color: "bg-destructive text-destructive-foreground", icon: "🔴" },
  };
  const currentSysHealth = systemHealthConfig[health.systemHealth || "healthy"];

  // AI Status Logic
  let aiStatusLabel = "Disabled";
  if (camera.ai_enabled) {
    if (health.status === "online") {
      aiStatusLabel = "Active - Scanning for Anomalies";
    } else {
      aiStatusLabel = "Suspended (Waiting for stream)";
    }
  }

  // Helper to format uptime into HH:MM:SS
  const formatUptime = (seconds: number) => {
    if (seconds <= 0) return "00:00:00";
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  return (
    <div className={cn(
      "bg-card/40 border rounded-xl overflow-hidden backdrop-blur-sm transition-all duration-300",
      health.status === "online" ? "border-border/50 hover:border-primary/30 hover:glow-primary-sm" : "border-border/30 opacity-80"
    )}>
      {/* Video Preview / Overlay Area */}
      <div className="relative aspect-video bg-black/60 flex items-center justify-center overflow-hidden border-b border-border/30">
        {health.status === "online" && camera.stream_url ? (
          <video
            src={camera.stream_url}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
            onError={(e) => {
              // Hide video if load fails and show stream preview mock instead
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : null}
        
        {/* Stream Overlay Scanlines */}
        <div className="absolute inset-0 scanline-overlay pointer-events-none opacity-20" />
        
        {/* Status Pill on Video */}
        <div className="absolute top-3 left-3 z-10">
          <Badge className={cn("font-mono font-bold text-[9px] px-2 py-0.5 border flex items-center gap-1", currentStatus.bg, currentStatus.text, currentStatus.border)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", currentStatus.dot)} />
            {currentStatus.label}
          </Badge>
        </div>

        {/* Feature Badges on Video */}
        <div className="absolute top-3 right-3 flex gap-1.5 z-10">
          {camera.ai_enabled && (
            <Badge className="bg-primary/20 border-primary/30 text-primary text-[9px] font-mono font-semibold px-1.5 py-0.5">AI GUARD</Badge>
          )}
          {camera.recording_enabled && (
            <Badge className="bg-warning/20 border-warning/30 text-warning text-[9px] font-mono font-semibold px-1.5 py-0.5 flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-warning rounded-full animate-ping" />
              REC
            </Badge>
          )}
        </div>

        {/* Dynamic Warning Alert Header */}
        {health.warnings.length > 0 && (
          <div className="absolute bottom-2 inset-x-2 bg-destructive/80 border border-destructive/30 backdrop-blur-md rounded px-2 py-1 flex items-center justify-between text-[10px] text-destructive-foreground font-mono font-bold z-10 animate-pulse">
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {health.warnings[0].replace("_", " ").toUpperCase()} WARNING
            </span>
          </div>
        )}

        {/* Mock Graphic when stream is not running */}
        {health.status !== "online" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/60 p-4 font-mono text-center">
            <Signal className={cn("h-8 w-8 mb-2", health.status === "reconnecting" ? "animate-pulse text-warning" : "text-muted-foreground/40")} />
            <p className="text-[10px] uppercase tracking-wider">{health.status === "disabled" ? "Camera Suspended" : "No Stream Input Signal"}</p>
            <p className="text-[9px] opacity-70 mt-0.5">{camera.location}</p>
          </div>
        )}
      </div>

      {/* Card Info Area */}
      <div className="p-4 space-y-3 relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-foreground text-sm tracking-tight truncate max-w-[140px]">{camera.name}</h4>
              <Badge variant="outline" className={cn("text-[9px] h-4 px-1 py-0 shadow-none font-normal", currentSysHealth.color)}>
                {currentSysHealth.icon} {currentSysHealth.label}
              </Badge>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">
              {camera.location} • {camera.resolution} ({camera.camera_type || "Bullet"})
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Power Toggle */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onToggle(camera.id, !camera.enabled)}
              className={cn("h-7 w-7 rounded-lg", camera.enabled ? "text-success hover:bg-success/10" : "text-muted-foreground hover:bg-secondary")}
              title={camera.enabled ? "Disable Camera" : "Enable Camera"}
            >
              {camera.enabled ? <Power className="h-3.5 w-3.5" /> : <PowerOff className="h-3.5 w-3.5" />}
            </Button>

            {/* Edit Button */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onEdit(camera)}
              className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-secondary"
              title="Edit Config"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>

            {/* Delete Button */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(camera.id)}
              className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10"
              title="Remove Camera"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Summary Telemetry Badges */}
        {health.status === "online" && (
          <div className="grid grid-cols-3 gap-2 bg-secondary/20 rounded-lg p-2 font-mono text-[10px] border border-border/20">
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-muted-foreground">FPS</span>
              <span className="font-semibold text-foreground">{health.fps} FPS</span>
            </div>
            <div className="flex flex-col items-center border-x border-border/30">
              <span className="text-[9px] text-muted-foreground">DELAY</span>
              <span className={cn("font-semibold", health.latency > 150 ? "text-destructive" : "text-foreground")}>
                {health.latency}ms
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-muted-foreground">BANDWIDTH</span>
              <span className="font-semibold text-foreground">{(health.bitrate / 1000).toFixed(1)} Mbps</span>
            </div>
          </div>
        )}

        {/* Expand/Collapse Telemetry Drawer trigger */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full h-7 text-xs font-mono text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 border border-border/20 hover:bg-secondary/40 rounded-lg"
        >
          {expanded ? (
            <>HIDE TELEMETRY <ChevronUp className="h-3.5 w-3.5" /></>
          ) : (
            <>SHOW DIAGNOSTICS <ChevronDown className="h-3.5 w-3.5" /></>
          )}
        </Button>

        {/* Expandable Health Drawer */}
        {expanded && (
          <div className="space-y-2 pt-2 border-t border-border/20 font-mono text-[10px] text-muted-foreground animate-accordion-down">
            <div className="flex justify-between py-0.5 border-b border-border/10">
              <span>Ping (RTT)</span>
              <span className="text-foreground">{health.ping} ms</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-border/10">
              <span>Heartbeat</span>
              <span className="text-foreground">
                {new Date(health.lastHeartbeat).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-border/10">
              <span>Connection Retries</span>
              <span className={cn("text-foreground", health.connectionRetries > 0 && "text-warning")}>
                {health.connectionRetries}
              </span>
            </div>
            <div className="flex justify-between py-0.5">
              <span>Stream Uptime</span>
              <span className="text-foreground flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                {formatUptime(health.uptime)}
              </span>
            </div>

            {/* AI Status Section */}
            <div className="pt-2 mt-2 border-t border-dashed border-border/20">
              <div className="flex items-center gap-1.5 mb-1.5 text-foreground font-semibold">
                <Brain className="h-3.5 w-3.5 text-primary" />
                AI Guard Diagnostics
              </div>
              <div className="flex justify-between py-0.5 border-b border-border/10">
                <span>Monitoring Status</span>
                <span className={cn(
                  "text-right",
                  !camera.ai_enabled ? "text-muted-foreground" : 
                  health.status === "online" ? "text-primary" : "text-warning"
                )}>
                  {aiStatusLabel}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>Last Analysis</span>
                <span className="text-foreground">
                  {camera.ai_enabled && health.status === "online" 
                    ? new Date(health.lastHeartbeat).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : "N/A"}
                </span>
              </div>
            </div>

            {/* Recent Incidents Section */}
            <div className="pt-2 mt-2 border-t border-dashed border-border/20">
              <div className="flex items-center gap-1.5 mb-1.5 text-foreground font-semibold">
                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                Recent Incidents
              </div>
              
              {health.recentIncident ? (
                <div className="bg-warning/10 border border-warning/20 rounded-md p-2 flex justify-between items-center mb-2">
                  <span className="text-warning font-semibold truncate flex-1 pr-2">⚠️ {health.recentIncident.type}</span>
                  <span className="text-muted-foreground text-[9px]">
                    {new Date(health.recentIncident.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ) : (
                <div className="text-muted-foreground/60 italic py-1 text-center mb-2">
                  No recent incidents in the last 24h
                </div>
              )}

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full h-6 text-[9px] font-mono"
                onClick={() => toast("Navigating to Community Incident logs...")}
              >
                VIEW FULL LOGS <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
