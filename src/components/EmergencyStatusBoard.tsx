// components/EmergencyStatusBoard.tsx

import {
  Activity,
  AlertTriangle,
  Flame,
  Radar,
  ShieldCheck,
  TrendingUp,
  Target,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/hooks/useLanguage";

import type { DashboardIntelligenceStats } from "../types/dashboardIntelligence";

interface EmergencyStatusBoardProps {
  stats: DashboardIntelligenceStats;
  isLoading: boolean;
}

type StatItem = {
  key: keyof DashboardIntelligenceStats;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  iconBackgroundClass: string;
  valueClass: string;
  description: string;
};

const STAT_ITEMS: StatItem[] = [
  {
    key: "totalActive",
    label: "Active Incidents",
    icon: Activity,
    iconClass: "text-blue-600 dark:text-blue-400",
    iconBackgroundClass: "bg-blue-500/10",
    valueClass: "text-blue-600 dark:text-blue-400",
    description: "Live monitored incidents",
  },
  {
    key: "criticalThreats",
    label: "Critical Threats",
    icon: AlertTriangle,
    iconClass: "text-red-600 dark:text-red-400",
    iconBackgroundClass: "bg-red-500/10",
    valueClass: "text-red-600 dark:text-red-400",
    description: "Immediate intervention required",
  },
  {
    key: "activeHotspots",
    label: "Active Hotspots",
    icon: Flame,
    iconClass: "text-orange-600 dark:text-orange-400",
    iconBackgroundClass: "bg-orange-500/10",
    valueClass: "text-orange-600 dark:text-orange-400",
    description: "High-risk locations",
  },
  {
    key: "averageConfidence",
    label: "AI Confidence",
    icon: Target,
    iconClass: "text-green-600 dark:text-green-400",
    iconBackgroundClass: "bg-green-500/10",
    valueClass: "text-green-600 dark:text-green-400",
    description: "Average intelligence confidence (%)",
  },
  {
    key: "highEscalation",
    label: "High Escalation",
    icon: TrendingUp,
    iconClass: "text-purple-600 dark:text-purple-400",
    iconBackgroundClass: "bg-purple-500/10",
    valueClass: "text-purple-600 dark:text-purple-400",
    description: "Likely to worsen soon",
  },
  {
    key: "awaitingResponse",
    label: "Awaiting Response",
    icon: ShieldCheck,
    iconClass: "text-amber-600 dark:text-amber-400",
    iconBackgroundClass: "bg-amber-500/10",
    valueClass: "text-amber-600 dark:text-amber-400",
    description: "Response not yet deployed",
  },
  {
    key: "highestThreatScore",
    label: "Highest Threat",
    icon: Radar,
    iconClass: "text-pink-600 dark:text-pink-400",
    iconBackgroundClass: "bg-pink-500/10",
    valueClass: "text-pink-600 dark:text-pink-400",
    description: "Highest AI threat score",
  },
];

export function EmergencyStatusBoard({
  stats,
  isLoading,
}: EmergencyStatusBoardProps) {
  const { t } = useLanguage();

  return (
    <section
      aria-labelledby="command-centre-heading"
      className="space-y-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Radar className="h-4 w-4 text-primary" />

            <h2
              id="command-centre-heading"
              className="text-sm font-semibold"
            >
              AIJE Command Centre
            </h2>
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            AI-powered operational intelligence from SafeBenue and
            Osiris.
          </p>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Intelligence updates automatically after each sync.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-7">
        {STAT_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <Card
              key={item.key}
              className="transition-all duration-200 hover:border-primary/30 hover:shadow-sm"
            >
              <CardContent className="flex h-full min-h-[150px] flex-col justify-between p-4">
                <div className="flex items-start justify-between">
                  <div
                    className={`rounded-lg p-2 ${item.iconBackgroundClass}`}
                  >
                    <Icon
                      className={`h-5 w-5 ${item.iconClass}`}
                    />
                  </div>

                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    AI
                  </span>
                </div>

                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p
                      className={`text-3xl font-bold ${item.valueClass}`}
                    >
                      {stats[item.key]}
                      {item.key === "averageConfidence"
                        ? "%"
                        : ""}
                    </p>
                  )}

                  <p className="mt-2 text-xs font-semibold">
                    {item.key === "totalActive"
                      ? t("activeIncidents")
                      : item.label}
                  </p>

                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}