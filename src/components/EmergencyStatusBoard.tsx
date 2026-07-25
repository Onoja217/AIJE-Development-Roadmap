// components/EmergencyStatusBoard.tsx
import {
  Activity,
  CheckCircle2,
  Clock3,
  Radio,
  ShieldAlert,
  UsersRound,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/hooks/useLanguage";

import type { DashboardStats } from "../types/incident";

interface EmergencyStatusBoardProps {
  stats: DashboardStats;
  isLoading: boolean;
}

type StatItem = {
  key: keyof DashboardStats;
  label: string;
  icon: typeof Activity;
  iconClass: string;
  iconBackgroundClass: string;
  valueClass: string;
  statusLabel: string;
};

const STAT_ITEMS: StatItem[] = [
  {
    key: "totalActive",
    label: "Active Incidents",
    icon: Activity,
    iconClass: "text-primary",
    iconBackgroundClass: "bg-primary/10",
    valueClass: "text-foreground",
    statusLabel: "Operational",
  },
  {
    key: "critical",
    label: "Critical",
    icon: ShieldAlert,
    iconClass: "text-red-600 dark:text-red-400",
    iconBackgroundClass: "bg-red-500/10",
    valueClass: "text-red-600 dark:text-red-400",
    statusLabel: "Immediate attention",
  },
  {
    key: "pendingVerification",
    label: "Pending Verification",
    icon: Clock3,
    iconClass: "text-amber-600 dark:text-amber-400",
    iconBackgroundClass: "bg-amber-500/10",
    valueClass: "text-amber-600 dark:text-amber-400",
    statusLabel: "Awaiting review",
  },
  {
    key: "respondingTeams",
    label: "Teams Responding",
    icon: UsersRound,
    iconClass: "text-orange-600 dark:text-orange-400",
    iconBackgroundClass: "bg-orange-500/10",
    valueClass: "text-orange-600 dark:text-orange-400",
    statusLabel: "Currently deployed",
  },
  {
    key: "resolvedToday",
    label: "Resolved Today",
    icon: CheckCircle2,
    iconClass: "text-green-600 dark:text-green-400",
    iconBackgroundClass: "bg-green-500/10",
    valueClass: "text-green-600 dark:text-green-400",
    statusLabel: "Closed incidents",
  },
];

export function EmergencyStatusBoard({
  stats,
  isLoading,
}: EmergencyStatusBoardProps) {
  const { t } = useLanguage();

  return (
    <section
      aria-labelledby="emergency-status-heading"
      className="space-y-3"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Radio
              className="h-4 w-4 text-green-500"
              aria-hidden="true"
            />

            <h2
              id="emergency-status-heading"
              className="text-sm font-semibold"
            >
              Emergency Operations Overview
            </h2>
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            Current incident activity and response readiness.
          </p>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Status reflects the current dashboard dataset.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {STAT_ITEMS.map((item) => {
          const Icon = item.icon;

          const label =
            item.key === "totalActive"
              ? t("activeIncidents")
              : item.key === "resolvedToday"
                ? t("resolved")
                : item.label;

          return (
            <Card
              key={item.key}
              tabIndex={0}
              className="h-full transition-all duration-200 hover:border-primary/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <CardContent className="flex h-full min-h-36 flex-col justify-between gap-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`rounded-lg p-2 ${item.iconBackgroundClass}`}
                  >
                    <Icon
                      className={`h-4 w-4 ${item.iconClass}`}
                      aria-hidden="true"
                    />
                  </div>

                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Live
                  </span>
                </div>

                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p
                      className={`text-3xl font-bold tracking-tight ${item.valueClass}`}
                    >
                      {stats[item.key]}
                    </p>
                  )}

                  <p className="mt-1 text-xs font-medium">
                    {label}
                  </p>

                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                    {item.statusLabel}
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