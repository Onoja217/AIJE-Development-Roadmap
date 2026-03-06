import { Header } from "@/components/dashboard/Header";
import { SensorCard } from "@/components/dashboard/SensorCard";
import { ThreatLevel } from "@/components/dashboard/ThreatLevel";
import { AlertFeed } from "@/components/dashboard/AlertFeed";
import { ZoneMap } from "@/components/dashboard/ZoneMap";
import { VibrationChart } from "@/components/dashboard/VibrationChart";
import { SystemStatus } from "@/components/dashboard/SystemStatus";
import { Vibrate, Move, Footprints, Camera, ThermometerSun, Lock } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background grid-overlay">
      <Header />
      <main className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
        {/* Sensor Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <SensorCard icon={Vibrate} label="Vibration" value="4.2 Hz" status="alert" detail="Anomaly detected" />
          <SensorCard icon={Move} label="Motion" value="3 events" status="warning" detail="East wing activity" />
          <SensorCard icon={Footprints} label="Movement" value="Normal" status="online" detail="No intrusion" />
          <SensorCard icon={Camera} label="Cameras" value="24/24" status="online" detail="All feeds active" />
          <SensorCard icon={ThermometerSun} label="Environment" value="22°C" status="online" detail="Humidity 45%" />
          <SensorCard icon={Lock} label="Access" value="Locked" status="online" detail="All entry points" />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column */}
          <div className="lg:col-span-3 space-y-4">
            <ThreatLevel level="elevated" confidence={87} lastScan="12s ago" />
            <SystemStatus />
          </div>

          {/* Center Column */}
          <div className="lg:col-span-5 space-y-4">
            <ZoneMap />
            <VibrationChart />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4">
            <AlertFeed />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
