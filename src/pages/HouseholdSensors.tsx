import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Battery,
  CircleDot,
  CloudOff,
  DoorOpen,
  Droplets,
  Flame,
  Gauge,
  House,
  RadioTower,
  Shield,
  Siren,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccess } from "@/features/access/AccessProvider";
import { APP_PATHS } from "@/features/navigation/navigationConfig";
import {
  acknowledgeSensorAlert,
  createGatewayEnrollment,
  installDemoSensorPackage,
  queueGatewayCommand,
  setGatewayArmMode,
} from "@/features/household-sensors/sensorApi";
import type {
  ArmMode,
  GatewayEnrollment,
  SensorDevice,
} from "@/features/household-sensors/types";
import { useHouseholdSensors } from "@/features/household-sensors/useHouseholdSensors";

const DEVICE_ICONS = {
  door: DoorOpen,
  motion: CircleDot,
  smoke: Flame,
  gas: Gauge,
  water: Droplets,
  panic: AlertTriangle,
  siren: Siren,
  power: Zap,
} as const;

function DeviceCard({ device }: { device: SensorDevice }) {
  const Icon =
    DEVICE_ICONS[device.device_type as keyof typeof DEVICE_ICONS] ?? RadioTower;
  const unhealthy = ["alert", "tampered", "offline"].includes(device.status);
  return (
    <Card className={unhealthy ? "border-warning/50" : "border-border"}>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="rounded-lg bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{device.name}</h3>
            <Badge variant={unhealthy ? "destructive" : "secondary"}>
              {device.status}
            </Badge>
            {device.is_demo ? <Badge variant="outline">Demo</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{device.zone}</p>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{device.last_value ?? "No reading"}</span>
            <span className="flex items-center gap-1">
              <Battery className="h-3.5 w-3.5" />
              {device.battery_percent ?? "--"}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HouseholdSensors() {
  const { activeOrganization, hasPermission } = useAccess();
  const { data, error, isLoading, refetch } = useHouseholdSensors(
    activeOrganization?.id,
  );
  const [selectedSiteId, setSelectedSiteId] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [enrollment, setEnrollment] = useState<
    (GatewayEnrollment & { siteId: string }) | null
  >(null);
  const siteId = data?.sites.some((item) => item.id === selectedSiteId)
    ? selectedSiteId
    : data?.sites[0]?.id;
  const site = data?.sites.find((item) => item.id === siteId);
  const gateways = useMemo(
    () => data?.gateways.filter((gateway) => gateway.site_id === siteId) ?? [],
    [data?.gateways, siteId],
  );
  const devices = useMemo(
    () => data?.devices.filter((device) => device.site_id === siteId) ?? [],
    [data?.devices, siteId],
  );
  const alerts = useMemo(
    () => data?.alerts.filter((alert) => alert.site_id === siteId) ?? [],
    [data?.alerts, siteId],
  );
  const canManage = hasPermission("sensors.manage");
  const physicalGateway = gateways.find((gateway) => !gateway.is_demo);
  const gateway = physicalGateway ?? gateways[0];
  const commands = useMemo(
    () =>
      data?.commands.filter((command) => command.gateway_id === gateway?.id) ??
      [],
    [data?.commands, gateway?.id],
  );

  async function installDemo() {
    if (!activeOrganization || !siteId) return;
    setSaving(true);
    try {
      await installDemoSensorPackage({
        organizationId: activeOrganization.id,
        siteId,
      });
      toast.success("Demo household sensor package installed");
      await refetch();
    } catch (installError) {
      console.error(installError);
      toast.error("Could not install the demo package");
    } finally {
      setSaving(false);
    }
  }

  async function changeArmMode(mode: ArmMode) {
    if (!gateway) return;
    setSaving(true);
    try {
      if (gateway.is_demo) {
        await setGatewayArmMode(gateway.id, mode);
        toast.success(`Protection set to ${mode}`);
      } else if (activeOrganization) {
        await queueGatewayCommand({
          organizationId: activeOrganization.id,
          siteId: gateway.site_id,
          gatewayId: gateway.id,
          commandType: "set_arm_mode",
          payload: { mode },
        });
        toast.success("Protection change queued for the gateway");
      }
      await refetch();
    } catch (armError) {
      console.error(armError);
      toast.error("Could not change protection mode");
    } finally {
      setSaving(false);
    }
  }

  async function beginHardwareEnrollment() {
    if (!activeOrganization || !siteId) return;
    setSaving(true);
    try {
      const created = await createGatewayEnrollment({
        organizationId: activeOrganization.id,
        siteId,
        gatewayName: `${site?.name ?? "Household"} Gateway`,
      });
      setEnrollment({ ...created, siteId });
      toast.success("One-time gateway claim code created");
    } catch (enrollmentError) {
      console.error(enrollmentError);
      toast.error("Could not create a gateway claim code");
    } finally {
      setSaving(false);
    }
  }

  async function sendTestSiren() {
    if (!activeOrganization || !physicalGateway) return;
    setSaving(true);
    try {
      await queueGatewayCommand({
        organizationId: activeOrganization.id,
        siteId: physicalGateway.site_id,
        gatewayId: physicalGateway.id,
        commandType: "test_siren",
        payload: { duration_seconds: 3 },
      });
      toast.success("Three-second siren test queued");
      await refetch();
    } catch (commandError) {
      console.error(commandError);
      toast.error("Could not queue the siren test");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="border-b border-border bg-card/60 px-4 py-4 backdrop-blur-sm md:px-8">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label="Back to Household Safety"
          >
            <Link to={APP_PATHS.safety}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-bold">Household Sensor Hub</h1>
            <p className="text-xs text-muted-foreground">
              Devices, alarms and gateway health
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        {data && data.sites.length > 1 ? (
          <div className="flex flex-wrap gap-2" aria-label="Protected sites">
            {data.sites.map((item) => (
              <Button
                key={item.id}
                variant={item.id === siteId ? "default" : "outline"}
                onClick={() => setSelectedSiteId(item.id)}
              >
                <House className="mr-2 h-4 w-4" />
                {item.name}
              </Button>
            ))}
          </div>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">
            Loading sensor protection...
          </p>
        ) : null}
        {error ? (
          <Card className="border-destructive/50 p-6">
            <p className="font-semibold text-destructive">
              Sensor data could not be loaded
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              The household sensor database may still need to be deployed.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => void refetch()}
            >
              Try again
            </Button>
          </Card>
        ) : null}

        {!isLoading && !error && !site ? (
          <Card className="p-8 text-center">
            <House className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 text-xl font-semibold">
              Create a protected site first
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Sensors are assigned to a home or property so alarms always
              identify the correct location.
            </p>
            <Button asChild className="mt-5">
              <Link to={APP_PATHS.sites}>Manage sites</Link>
            </Button>
          </Card>
        ) : null}

        {site && canManage ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <RadioTower className="h-5 w-5 text-primary" />
                Connect physical gateway
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate a one-time claim code. It expires after 15 minutes and
                can enroll only one gateway with its own signing key.
              </p>
              {enrollment?.siteId === siteId ? (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    One-time claim code
                  </p>
                  <code className="mt-2 block break-all text-sm font-semibold text-primary">
                    {enrollment.claim_token}
                  </code>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Expires{" "}
                    {new Date(enrollment.expires_at).toLocaleTimeString()}.
                    Treat this code like a temporary password.
                  </p>
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(enrollment.claim_token)
                        .then(() => toast.success("Claim code copied"))
                        .catch(() => toast.error("Could not copy claim code"))
                    }
                  >
                    Copy code
                  </Button>
                </div>
              ) : (
                <Button
                  disabled={saving}
                  onClick={() => void beginHardwareEnrollment()}
                >
                  {saving ? "Creating…" : "Generate claim code"}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : null}

        {site && gateways.length === 0 ? (
          <Card className="border-dashed p-8 text-center">
            <RadioTower className="mx-auto h-9 w-9 text-primary" />
            <h2 className="mt-3 text-xl font-semibold">Connect {site.name}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              Start with a clearly marked demo package to preview door, motion,
              smoke, LPG, water, power, siren and panic-button protection. No
              demo reading is treated as a real emergency.
            </p>
            {canManage ? (
              <Button
                className="mt-5"
                disabled={saving}
                onClick={() => void installDemo()}
              >
                {saving ? "Installing..." : "Install demo package"}
              </Button>
            ) : null}
          </Card>
        ) : null}

        {site && gateway ? (
          <>
            <Card>
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle>{site.name}</CardTitle>
                    {gateway.is_demo ? (
                      <Badge variant="outline">Demo system</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {site.address ?? "Address not provided"}
                  </p>
                </div>
                <Badge
                  variant={
                    gateway.status === "online" ? "secondary" : "destructive"
                  }
                >
                  {gateway.status}
                </Badge>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-secondary/40 p-3">
                    <p className="text-xs text-muted-foreground">Gateway</p>
                    <p className="font-semibold">{gateway.name}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/40 p-3">
                    <p className="text-xs text-muted-foreground">Connection</p>
                    <p className="font-semibold capitalize">
                      {gateway.connection_type}
                    </p>
                  </div>
                  <div className="rounded-lg bg-secondary/40 p-3">
                    <p className="text-xs text-muted-foreground">
                      Backup battery
                    </p>
                    <p className="font-semibold">
                      {gateway.battery_percent ?? "--"}%
                    </p>
                  </div>
                </div>
                <div
                  className="flex flex-wrap gap-2"
                  aria-label="Protection mode"
                >
                  {(["disarmed", "home", "away"] as const).map((mode) => (
                    <Button
                      key={mode}
                      size="sm"
                      disabled={!canManage || saving}
                      variant={
                        gateway.arm_mode === mode ? "default" : "outline"
                      }
                      onClick={() => void changeArmMode(mode)}
                      className="capitalize"
                    >
                      {mode}
                    </Button>
                  ))}
                  {!gateway.is_demo ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      onClick={() => void sendTestSiren()}
                    >
                      <Siren className="mr-2 h-4 w-4" />
                      Test siren
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {!gateway.is_demo ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Gateway commands</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {commands.slice(0, 5).map((command) => (
                    <div
                      key={command.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary/40 p-3 text-sm"
                    >
                      <span className="font-medium capitalize">
                        {command.command_type.replace(/_/g, " ")}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            command.status === "failed"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {command.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(command.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {commands.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No commands have been sent.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            <Tabs defaultValue="devices">
              <TabsList>
                <TabsTrigger value="devices">
                  Devices ({devices.length})
                </TabsTrigger>
                <TabsTrigger value="alerts">
                  Alarms ({alerts.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent
                value="devices"
                className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              >
                {devices.map((device) => (
                  <DeviceCard key={device.id} device={device} />
                ))}
              </TabsContent>
              <TabsContent value="alerts" className="mt-4 space-y-3">
                {alerts.length === 0 ? (
                  <Card className="p-6 text-center text-sm text-muted-foreground">
                    No active alarms.
                  </Card>
                ) : (
                  alerts.map((alert) => (
                    <Card key={alert.id} className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-warning" />
                            <p className="font-semibold">{alert.message}</p>
                            <Badge variant="outline">{alert.severity}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                        {alert.status === "open" && canManage ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void acknowledgeSensorAlert(alert.id)
                                .then(() => refetch())
                                .catch(() =>
                                  toast.error("Could not acknowledge alarm"),
                                )
                            }
                          >
                            Acknowledge
                          </Button>
                        ) : (
                          <Badge variant="secondary">{alert.status}</Badge>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>

            {devices.some((device) => device.status === "offline") ? (
              <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm">
                <CloudOff className="h-5 w-5 text-warning" />
                One or more devices are offline. Check gateway power and
                connectivity.
              </div>
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}
