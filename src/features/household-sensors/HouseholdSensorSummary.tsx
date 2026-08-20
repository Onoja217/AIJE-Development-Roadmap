import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BatteryCharging,
  RadioTower,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_PATHS } from "@/features/navigation/navigationConfig";
import { useHouseholdSensors } from "./useHouseholdSensors";

export function HouseholdSensorSummary({
  organizationId,
}: {
  organizationId: string;
}) {
  const { data, isLoading, error } = useHouseholdSensors(organizationId);
  const devices = data?.devices ?? [];
  const activeAlerts =
    data?.alerts.filter((alert) => alert.status === "open") ?? [];
  const offline = devices.filter(
    (device) => device.status === "offline",
  ).length;
  const emergency = devices.some((device) =>
    ["alert", "tampered"].includes(device.status),
  );
  const state = emergency
    ? "Emergency"
    : activeAlerts.length > 0 || offline > 0
      ? "Attention needed"
      : devices.length > 0
        ? "Protected"
        : "Setup required";

  return (
    <section aria-labelledby="sensor-protection-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="sensor-protection-title" className="text-xl font-semibold">
            Sensor protection
          </h2>
          <p className="text-sm text-muted-foreground">
            Live household devices, gateway health and urgent alarms.
          </p>
        </div>
        <Button asChild>
          <Link to={APP_PATHS.householdSensors}>Open sensor hub</Link>
        </Button>
      </div>

      <Card className={emergency ? "border-destructive/60" : "border-border"}>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2.5">
              {emergency ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-primary" />
              )}
            </div>
            <CardTitle className="text-lg">
              {isLoading ? "Checking protection…" : state}
            </CardTitle>
          </div>
          {data?.devices.some((device) => device.is_demo) ? (
            <Badge variant="outline">Demo data</Badge>
          ) : null}
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">
              Sensor status is temporarily unavailable. Open the hub to retry.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-secondary/40 p-4">
                <RadioTower className="mb-2 h-4 w-4 text-primary" />
                <p className="text-2xl font-bold">{devices.length}</p>
                <p className="text-xs text-muted-foreground">
                  Connected devices
                </p>
              </div>
              <div className="rounded-lg bg-secondary/40 p-4">
                <AlertTriangle className="mb-2 h-4 w-4 text-warning" />
                <p className="text-2xl font-bold">{activeAlerts.length}</p>
                <p className="text-xs text-muted-foreground">Open alarms</p>
              </div>
              <div className="rounded-lg bg-secondary/40 p-4">
                <BatteryCharging className="mb-2 h-4 w-4 text-success" />
                <p className="text-2xl font-bold">{offline}</p>
                <p className="text-xs text-muted-foreground">Offline devices</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
