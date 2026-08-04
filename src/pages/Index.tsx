import { Header } from "@/components/dashboard/Header";
import { SensorCard } from "@/components/dashboard/SensorCard";
import { MuteProvider } from "@/hooks/useMute";
import { ThreatLevel } from "@/components/dashboard/ThreatLevel";
import { AlertFeed } from "@/components/dashboard/AlertFeed";
import { CommunityAlertFeed } from "@/components/dashboard/CommunityAlertFeed";
import { ZoneMap } from "@/components/dashboard/ZoneMap";
import { VibrationChart } from "@/components/dashboard/VibrationChart";
import { SystemStatus } from "@/components/dashboard/SystemStatus";
import { Vibrate, Move, Footprints, Camera, ThermometerSun, Lock } from "lucide-react";
import { useLiveSensorData, computeThreatAssessment } from "@/hooks/useLiveSensorData";
import { requestNotificationPermission } from "@/hooks/useAlertNotifications";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { useMemo, useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const sensors = useLiveSensorData(2500);
  const threat = useMemo(() => computeThreatAssessment(sensors), [sensors]);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: containerRef });
  const isMobile = useIsMobile();

  // Disable parallax on mobile — nested transforms + scan-line overlay
  // cause GPU compositing corruption on some Android Chrome builds.
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", isMobile ? "0%" : "30%"]);
  const sensorY = useTransform(scrollYProgress, [0, 0.3], [0, isMobile ? 0 : -15]);
  const midY = useTransform(scrollYProgress, [0.2, 0.6], [0, isMobile ? 0 : -10]);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return (
    <MuteProvider>
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Parallax background layer (static on mobile) */}
      <motion.div
        style={{ y: bgY }}
        className="absolute inset-0 grid-overlay pointer-events-none"
      />
      {/* Scan-line only on larger viewports — known to cause compositing artifacts on mobile */}
      {!isMobile && <div className="absolute inset-0 scan-line pointer-events-none" />}

      {/* Scrollable content */}
      <div ref={containerRef} className="relative z-10 h-dvh overflow-y-auto">
        <Header />
        <main className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
          <h1 className="sr-only">AIJE security command dashboard</h1>
          <motion.div
            style={{ y: sensorY }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
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
            className="grid grid-cols-1 lg:grid-cols-12 gap-4"
          >
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="lg:col-span-3 space-y-4"
            >
              <ThreatLevel level={threat.level} confidence={threat.confidence} lastScan={threat.lastScan} />
              <SystemStatus />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
              className="lg:col-span-5 space-y-4"
            >
              <ZoneMap />
              <VibrationChart />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
              className="lg:col-span-4 space-y-4"
            >
              <AlertFeed sensors={sensors} />
              <CommunityAlertFeed />
            </motion.div>
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
