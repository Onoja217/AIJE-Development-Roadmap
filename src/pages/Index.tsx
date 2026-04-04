import { Header } from "@/components/dashboard/Header";
import { SensorCard } from "@/components/dashboard/SensorCard";
import { MuteProvider } from "@/hooks/useMute";
import { ThreatLevel } from "@/components/dashboard/ThreatLevel";
import { AlertFeed } from "@/components/dashboard/AlertFeed";
import { ZoneMap } from "@/components/dashboard/ZoneMap";
import { VibrationChart } from "@/components/dashboard/VibrationChart";
import { SystemStatus } from "@/components/dashboard/SystemStatus";
import { Vibrate, Move, Footprints, Camera, ThermometerSun, Lock } from "lucide-react";
import { useLiveSensorData, computeThreatAssessment } from "@/hooks/useLiveSensorData";
import { requestNotificationPermission } from "@/hooks/useAlertNotifications";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { useMemo, useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const Index = () => {
  const sensors = useLiveSensorData(2500);
  const threat = useMemo(() => computeThreatAssessment(sensors), [sensors]);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: containerRef });

  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const sensorY = useTransform(scrollYProgress, [0, 0.3], [0, -15]);
  const midY = useTransform(scrollYProgress, [0.2, 0.6], [0, -10]);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return (
    <MuteProvider>
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Parallax background layer */}
      <motion.div
        style={{ y: bgY }}
        className="absolute inset-0 grid-overlay pointer-events-none will-change-transform"
      />
      <div className="absolute inset-0 scan-line pointer-events-none" />

      {/* Scrollable content */}
      <div ref={containerRef} className="relative z-10 h-screen overflow-y-auto">
        <Header />
        <main className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
          <motion.div
            style={{ y: sensorY }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 will-change-transform"
          >
            <SensorCard icon={Vibrate} label="Vibration" {...sensors.vibration} />
            <SensorCard icon={Move} label="Motion" {...sensors.motion} />
            <SensorCard icon={Footprints} label="Movement" {...sensors.movement} />
            <SensorCard icon={Camera} label="Cameras" {...sensors.cameras} />
            <SensorCard icon={ThermometerSun} label="Environment" {...sensors.environment} />
            <SensorCard icon={Lock} label="Access" {...sensors.access} />
          </motion.div>

          <motion.div
            style={{ y: midY }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-4 will-change-transform"
          >
            <div className="lg:col-span-3 space-y-4">
              <ThreatLevel level={threat.level} confidence={threat.confidence} lastScan={threat.lastScan} />
              <SystemStatus />
            </div>
            <div className="lg:col-span-5 space-y-4">
              <ZoneMap />
              <VibrationChart />
            </div>
            <div className="lg:col-span-4">
              <AlertFeed sensors={sensors} />
            </div>
          </motion.div>
          <div className="h-16 md:hidden" />
        </main>
        <BottomNav />
      </div>
    </div>
    </MuteProvider>
  );
};

export default Index;
