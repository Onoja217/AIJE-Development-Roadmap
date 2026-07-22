// components/EmergencyStatusBoard.tsx
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardStats } from "../types/incident";
import { useLanguage } from "@/hooks/useLanguage";

interface EmergencyStatusBoardProps {
  stats: DashboardStats;
  isLoading: boolean;
}

const STAT_ITEMS: Array<{ key: keyof DashboardStats; label: string; icon: string; tone: string }> = [
  { key: "totalActive", label: "Active Incidents", icon: "📋", tone: "text-foreground" },
  { key: "critical", label: "Critical", icon: "🔴", tone: "text-red-600" },
  { key: "pendingVerification", label: "Pending Verification", icon: "⏳", tone: "text-yellow-600" },
  { key: "respondingTeams", label: "Teams Responding", icon: "🚨", tone: "text-orange-600" },
  { key: "resolvedToday", label: "Resolved Today", icon: "✅", tone: "text-green-600" },
];

export function EmergencyStatusBoard({ stats, isLoading }: EmergencyStatusBoardProps) {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {STAT_ITEMS.map((item) => (
        <Card key={item.key}>
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xl">{item.icon}</span>
            <span className={`text-2xl font-bold ${item.tone}`}>
              {isLoading ? "—" : stats[item.key]}
            </span>
            <span className="text-xs text-muted-foreground">{item.key === "totalActive" ? t("activeIncidents") : item.key === "resolvedToday" ? t("resolved") : item.label}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
