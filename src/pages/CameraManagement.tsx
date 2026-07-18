import { useState } from "react";
import { Link } from "react-router-dom";
import { useCameras } from "@/hooks/useCameras";
import { useCameraHealth } from "@/hooks/useCameraHealth";
import { CameraHealthCard } from "@/components/dashboard/CameraHealthCard";
import { 
  ChevronLeft, Plus, Search, Filter, RefreshCw, 
  Activity, Video, Brain, Signal, Wifi, Settings, X, Info,
  Bell, Database, MessageSquare, MessageCircle, Globe, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function CameraManagement() {
  const { cameras, loading, addCamera, updateCamera, deleteCamera } = useCameras();
  const { healthMap, getHealth } = useCameraHealth(cameras);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [featureFilter, setFeatureFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<any | null>(null);

  // Form Fields State
  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formStreamType, setFormStreamType] = useState("hls");
  const [formCameraType, setFormCameraType] = useState("Bullet");
  const [formResolution, setFormResolution] = useState("1080p");
  const [formAiModule, setFormAiModule] = useState("Disabled");
  const [formEnabled, setFormEnabled] = useState(true);

  // Calculate aggregates for statistics metrics
  const totalCams = cameras.length;
  const onlineCams = cameras.filter(cam => healthMap[cam.id]?.status === "online").length;
  const offlineCams = cameras.filter(cam => {
    const status = healthMap[cam.id]?.status;
    return status === "offline" || status === "reconnecting";
  }).length;
  const recordingCams = cameras.filter(cam => cam.recording_enabled).length;
  const aiActiveCams = cameras.filter(cam => cam.ai_enabled && healthMap[cam.id]?.status === "online").length;

  // Extract unique locations from cameras list to populate location filter options
  const uniqueLocations = Array.from(
    new Set(cameras.map(cam => cam.location || "Default Location").filter(Boolean))
  );

  // Mock Data for Community Services Health
  const communityServices = [
    { name: "AI Detection Engine", icon: Brain, status: "Operational" },
    { name: "Community Alert Service", icon: Bell, status: "Operational" },
    { name: "Offline Synchronization", icon: Database, status: "Operational" },
    { name: "SMS Gateway", icon: MessageSquare, status: "Operational" },
    { name: "WhatsApp Notifications", icon: MessageCircle, status: "Operational" },
  ];

  // Global Network Telemetry Aggregation
  const onlineHealths = Object.values(healthMap).filter(h => h.status === "online");
  const avgLatency = onlineHealths.length > 0 
    ? Math.round(onlineHealths.reduce((sum, h) => sum + h.latency, 0) / onlineHealths.length) 
    : 0;
  const totalBandwidth = onlineHealths.reduce((sum, h) => sum + h.bitrate, 0) / 1000; // in Mbps
  const maxUptime = Math.max(0, ...onlineHealths.map(h => h.uptime));
  const latestHeartbeat = onlineHealths.length > 0 
    ? onlineHealths.reduce((latest, h) => new Date(h.lastHeartbeat) > new Date(latest) ? h.lastHeartbeat : latest, onlineHealths[0].lastHeartbeat)
    : new Date().toISOString();
  
  const globalNetworkStatus = offlineCams > 0 || avgLatency > 200 ? "Degraded" : "Stable";

  // Helper to format uptime into HH:MM:SS
  const formatUptime = (seconds: number) => {
    if (seconds <= 0) return "00:00:00";
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // Search & Filter Match Logic
  const filteredCameras = cameras.filter(cam => {
    const nameMatch = cam.name.toLowerCase().includes(searchQuery.toLowerCase());
    const locMatch = (cam.location || "Default Location").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearch = nameMatch || locMatch;

    const status = healthMap[cam.id]?.status || "offline";
    const matchesStatus = statusFilter === "all" || status === statusFilter;

    const matchesFeature = 
      featureFilter === "all" ||
      (featureFilter === "recording" && cam.recording_enabled) ||
      (featureFilter === "ai" && cam.ai_enabled);

    const matchesLocFilter = 
      locationFilter === "all" || 
      (cam.location || "Default Location") === locationFilter;

    return matchesSearch && matchesStatus && matchesFeature && matchesLocFilter;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setFeatureFilter("all");
    setLocationFilter("all");
  };

  const hasActiveFilters = searchQuery !== "" || statusFilter !== "all" || featureFilter !== "all" || locationFilter !== "all";

  // Actions Handlers
  const handleOpenAddModal = () => {
    setEditingCamera(null);
    setFormName("");
    setFormLocation("");
    setFormUrl("");
    setFormStreamType("hls");
    setFormCameraType("Bullet");
    setFormResolution("1080p");
    setFormAiModule("Disabled");
    setFormEnabled(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (camera: any) => {
    setEditingCamera(camera);
    setFormName(camera.name);
    setFormLocation(camera.location || "");
    setFormUrl(camera.stream_url);
    setFormStreamType(camera.stream_type);
    setFormCameraType(camera.camera_type || "Bullet");
    setFormResolution(camera.resolution || "1080p");
    setFormAiModule(camera.ai_module || "Disabled");
    setFormEnabled(camera.enabled);
    setIsModalOpen(true);
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    await updateCamera(id, { enabled });
    toast.success(`Camera ${enabled ? "activated" : "deactivated"}`);
  };

  const handleDeleteCamera = async (id: string) => {
    if (confirm("Are you sure you want to remove this camera device?")) {
      await deleteCamera(id);
    }
  };

  const handleSaveCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formUrl.trim()) {
      toast.error("Name and Stream URL are required");
      return;
    }

    const payload = {
      name: formName.trim(),
      stream_url: formUrl.trim(),
      stream_type: formStreamType as any,
      enabled: formEnabled,
      location: formLocation.trim() || "Default Location",
      resolution: formResolution,
      camera_type: formCameraType,
      ai_module: formAiModule,
      recording_enabled: editingCamera ? editingCamera.recording_enabled : true,
      ai_enabled: formAiModule !== "Disabled",
      auto_snapshot_interval_sec: editingCamera ? editingCamera.auto_snapshot_interval_sec : null,
      zone_cooldown_sec: editingCamera ? editingCamera.zone_cooldown_sec : null,
      zone_alert_severity: editingCamera ? editingCamera.zone_alert_severity : null,
    };

    if (editingCamera) {
      await updateCamera(editingCamera.id, payload);
      toast.success("Camera configurations updated successfully");
    } else {
      await addCamera(payload);
    }

    setIsModalOpen(false);
    setEditingCamera(null);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Scanline grid overlay for design aesthetics */}
      <div className="absolute inset-0 grid-overlay pointer-events-none z-0" />
      
      {/* Header Bar */}
      <header className="relative z-10 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/control" className="rounded-lg bg-secondary p-2 hover:bg-secondary/80 transition-colors">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Camera Center
            </h1>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Live Stream & Network Telemetry Dashboard
            </p>
          </div>
        </div>
        
        <Button 
          size="sm" 
          onClick={handleOpenAddModal}
          className="bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-mono tracking-wider"
        >
          <Plus className="h-4 w-4 mr-1.5" /> ADD CAMERA
        </Button>
      </header>

      {/* Main Scrollable Content */}
      <main className="relative z-10 p-6 max-w-[1600px] mx-auto space-y-6">
        {/* Device Statistics Row */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Devices */}
          <div className="bg-card/30 border border-border/50 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm">
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Total Devices</p>
              <h3 className="text-2xl font-bold tracking-tight mt-1 font-mono text-foreground">{totalCams}</h3>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2.5">
              <Video className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          {/* Card 2: Online */}
          <div className="bg-card/30 border border-border/50 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm">
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Online</p>
              <h3 className="text-2xl font-bold tracking-tight mt-1 font-mono text-success">{onlineCams}</h3>
            </div>
            <div className="bg-success/10 rounded-lg p-2.5">
              <Wifi className="h-5 w-5 text-success glow-success-sm" />
            </div>
          </div>

          {/* Card 3: Offline */}
          <div className="bg-card/30 border border-border/50 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm">
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Offline / Alert</p>
              <h3 className="text-2xl font-bold tracking-tight mt-1 font-mono text-destructive">{offlineCams}</h3>
            </div>
            <div className="bg-destructive/10 rounded-lg p-2.5">
              <Signal className="h-5 w-5 text-destructive animate-pulse" />
            </div>
          </div>

          {/* Card 4: Recording */}
          <div className="bg-card/30 border border-border/50 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm">
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Recording</p>
              <h3 className="text-2xl font-bold tracking-tight mt-1 font-mono text-warning">{recordingCams}</h3>
            </div>
            <div className="bg-warning/10 rounded-lg p-2.5 relative">
              <Activity className="h-5 w-5 text-warning" />
              {recordingCams > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive animate-ping" />
              )}
            </div>
          </div>

          {/* Card 5: AI Configured */}
          <div className="bg-card/30 border border-border/50 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm">
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">AI Guard Active</p>
              <h3 className="text-2xl font-bold tracking-tight mt-1 font-mono text-primary">{aiActiveCams}</h3>
            </div>
            <div className="bg-primary/10 rounded-lg p-2.5 relative">
              <Brain className="h-5 w-5 text-primary glow-primary-sm" />
              {aiActiveCams > 0 && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              )}
            </div>
          </div>
        </section>

        {/* Community Services Health Panel */}
        <section className="bg-card/30 border border-border/50 rounded-xl p-4 backdrop-blur-sm">
          <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4 border-b border-border/50 pb-2">
            AIJE Core Services Status
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {communityServices.map((service) => {
              const Icon = service.icon;
              return (
                <div key={service.name} className="flex items-center gap-3 bg-secondary/30 border border-border/30 rounded-lg p-3">
                  <div className="bg-success/10 rounded-md p-2">
                    <Icon className="h-4 w-4 text-success" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-foreground truncate">{service.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" />
                      <span className="text-[9px] font-mono text-success uppercase tracking-wider">{service.status}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Global Network Telemetry */}
        <section className="bg-card/30 border border-border/50 rounded-xl p-4 backdrop-blur-sm">
          <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4 border-b border-border/50 pb-2">
            Global Network Telemetry
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Globe className="h-3 w-3" /> Status
              </span>
              <span className={`text-lg font-bold ${globalNetworkStatus === "Stable" ? "text-success" : "text-warning"}`}>
                {globalNetworkStatus === "Stable" ? "Stable 🟢" : "Degraded 🟡"}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Signal className="h-3 w-3" /> Avg Latency
              </span>
              <span className="text-lg font-bold font-mono text-foreground">{avgLatency} ms</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Activity className="h-3 w-3" /> Total Bandwidth
              </span>
              <span className="text-lg font-bold font-mono text-foreground">{totalBandwidth.toFixed(1)} Mbps</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Clock className="h-3 w-3" /> Max Node Uptime
              </span>
              <span className="text-lg font-bold font-mono text-foreground">{formatUptime(maxUptime)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <RefreshCw className="h-3 w-3" /> Last Sync
              </span>
              <span className="text-lg font-bold font-mono text-foreground">
                {new Date(latestHeartbeat).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
        </section>

        {/* Search & Filter Controls Panel */}
        <section className="bg-card/30 border border-border/50 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cameras by name or location..."
              className="pl-9 bg-background/50 border-border/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-background/50 border border-border/50 text-foreground rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-primary/50"
              >
                <option value="all">ALL STATUSES</option>
                <option value="online">ONLINE</option>
                <option value="offline">OFFLINE</option>
                <option value="reconnecting">RECONNECTING</option>
                <option value="disabled">DISABLED</option>
              </select>
            </div>

            {/* Feature Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">Feature:</span>
              <select
                value={featureFilter}
                onChange={(e) => setFeatureFilter(e.target.value)}
                className="bg-background/50 border border-border/50 text-foreground rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-primary/50"
              >
                <option value="all">ALL FEATURES</option>
                <option value="recording">RECORDING ENABLED</option>
                <option value="ai">AI GUARD ON</option>
              </select>
            </div>

            {/* Location Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">Location:</span>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="bg-background/50 border border-border/50 text-foreground rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-primary/50"
              >
                <option value="all">ALL LOCATIONS</option>
                {uniqueLocations.map(loc => (
                  <option key={loc} value={loc}>{loc.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 px-2 text-xs font-mono text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-3 w-3 mr-1" /> CLEAR
              </Button>
            )}
          </div>
        </section>

        {/* Live Grid Area */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-2 font-mono text-xs">
            <RefreshCw className="h-6 w-6 text-primary animate-spin" />
            LOADING CCTV NETWORK DEVICES...
          </div>
        ) : filteredCameras.length === 0 ? (
          <div className="bg-card/20 border border-dashed border-border/40 rounded-xl p-16 text-center text-muted-foreground font-mono text-xs flex flex-col items-center justify-center gap-2">
            <Video className="h-8 w-8 text-muted-foreground/30" />
            <span>NO CCTV DEVICES MATCH ACTIVE CRITERIA</span>
            {hasActiveFilters && (
              <Button variant="link" size="sm" onClick={clearFilters} className="text-primary text-[10px] p-0 h-auto">
                Reset filters
              </Button>
            )}
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCameras.map((camera) => (
              <CameraHealthCard
                key={camera.id}
                camera={camera}
                health={getHealth(camera.id)}
                onEdit={handleOpenEditModal}
                onDelete={handleDeleteCamera}
                onToggle={handleToggleEnabled}
              />
            ))}
          </section>
        )}
      </main>

      {/* Add / Edit Glassmorphic Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className="bg-card/90 border border-border/60 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/40 px-5 py-4 bg-secondary/30">
              <h3 className="font-mono font-bold text-sm tracking-wider text-primary">
                {editingCamera ? "EDIT CAMERA DEVICE" : "ADD NEW CAMERA DEVICE"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground rounded-lg p-1 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCamera} className="p-5 space-y-4 font-mono text-xs">
              {/* Row 1: Name & Location */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground">DEVICE NAME</label>
                  <Input
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Front Gate"
                    className="bg-background/50 border-border/50 h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground">LOCATION / ZONE</label>
                  <Input
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Perimeter A"
                    className="bg-background/50 border-border/50 h-8"
                  />
                </div>
              </div>

              {/* Row 2: Stream URL */}
              <div className="space-y-1.5">
                <label className="text-muted-foreground">STREAMING URL (HLS/MJPEG/MP4)</label>
                <Input
                  required
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="e.g. http://lvh.me:8082/test.mp4"
                  className="bg-background/50 border-border/50 h-8"
                />
              </div>

              {/* Row 3: Stream Type, Cam Type, Resolution */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground">STREAM PROTOCOL</label>
                  <select
                    value={formStreamType}
                    onChange={(e) => setFormStreamType(e.target.value)}
                    className="w-full bg-background/50 border border-border/50 text-foreground rounded-md px-2 py-1.5 h-8 focus:outline-none"
                  >
                    <option value="hls">HLS (.m3u8)</option>
                    <option value="mjpeg">MJPEG</option>
                    <option value="http">HTTP/MP4</option>
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-muted-foreground">HARDWARE TYPE</label>
                  <select
                    value={formCameraType}
                    onChange={(e) => setFormCameraType(e.target.value)}
                    className="w-full bg-background/50 border border-border/50 text-foreground rounded-md px-2 py-1.5 h-8 focus:outline-none"
                  >
                    <option value="Bullet">BULLET</option>
                    <option value="Dome">DOME</option>
                    <option value="PTZ">PTZ (PAN-TILT)</option>
                    <option value="RTSP / IP Camera">RTSP / IP CAMERA</option>
                    <option value="Mobile Node">MOBILE NODE (APP)</option>
                    <option value="Drone Feed">DRONE FEED</option>
                    <option value="IoT Edge Device">IOT EDGE DEVICE</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-muted-foreground">PRIMARY AI MODULE</label>
                  <select
                    value={formAiModule}
                    onChange={(e) => setFormAiModule(e.target.value)}
                    className="w-full bg-background/50 border border-border/50 text-foreground rounded-md px-2 py-1.5 h-8 focus:outline-none"
                  >
                    <option value="Disabled">DISABLED</option>
                    <option value="Basic Motion">BASIC MOTION</option>
                    <option value="People & Vehicles">PEOPLE & VEHICLES (STD)</option>
                    <option value="Face Recognition">FACE RECOGNITION (BETA)</option>
                    <option value="Anomaly Detection">ANOMALY DETECTION (BETA)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-muted-foreground">RESOLUTION</label>
                  <select
                    value={formResolution}
                    onChange={(e) => setFormResolution(e.target.value)}
                    className="w-full bg-background/50 border border-border/50 text-foreground rounded-md px-2 py-1.5 h-8 focus:outline-none"
                  >
                    <option value="1080p">1080P (FHD)</option>
                    <option value="720p">720P (HD)</option>
                    <option value="4K">4K (UHD)</option>
                  </select>
                </div>
              </div>

              {/* Toggle Enabled */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="form-enabled"
                  checked={formEnabled}
                  onChange={(e) => setFormEnabled(e.target.checked)}
                  className="rounded border-border/50 text-primary accent-primary h-4 w-4"
                />
                <label htmlFor="form-enabled" className="text-muted-foreground select-none cursor-pointer">
                  ACTIVATE DEVICE UPON CREATION
                </label>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-3 pt-3 border-t border-border/30">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsModalOpen(false)}
                  className="h-8 text-xs font-mono"
                >
                  CANCEL
                </Button>
                <Button 
                  type="submit" 
                  className="h-8 text-xs font-mono bg-primary text-primary-foreground hover:bg-primary/95"
                >
                  SAVE CONFIG
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
