import { Header } from "@/components/dashboard/Header";
import { SensorCard } from "@/components/dashboard/SensorCard";
import { ThreatLevel } from "@/components/dashboard/ThreatLevel";
import { AlertFeed } from "@/components/dashboard/AlertFeed";
import { ZoneMap } from "@/components/dashboard/ZoneMap";
import { VibrationChart } from "@/components/dashboard/VibrationChart";
import { SystemStatus } from "@/components/dashboard/SystemStatus";
import { Vibrate, Move, Footprints, Camera, ThermometerSun, Lock } from "lucide-react";
import { useLiveSensorData } from "@/hooks/useLiveSensorData";

const Index = () => {
  const sensors = useLiveSensorData(2500);

  return (
    <div className="min-h-screen bg-background grid-overlay">
      <Header />
      <main className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <SensorCard icon={Vibrate} label="Vibration" {...sensors.vibration} />
          <SensorCard icon={Move} label="Motion" {...sensors.motion} />
          <SensorCard icon={Footprints} label="Movement" {...sensors.movement} />
          <SensorCard icon={Camera} label="Cameras" {...sensors.cameras} />
          <SensorCard icon={ThermometerSun} label="Environment" {...sensors.environment} />
          <SensorCard icon={Lock} label="Access" {...sensors.access} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-3 space-y-4">
            <ThreatLevel level="elevated" confidence={87} lastScan="12s ago" />
            <SystemStatus />
          </div>
          <div className="lg:col-span-5 space-y-4">
            <ZoneMap />
            <VibrationChart />
          </div>
          <div className="lg:col-span-4">
            <AlertFeed />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
