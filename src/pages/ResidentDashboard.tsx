import { Link } from "react-router-dom";
import {
  Bell,
  CircleUserRound,
  ContactRound,
  MapPinned,
  RadioTower,
  Server,
  ShieldCheck,
} from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccess } from "@/features/access/AccessProvider";
import { RoleResourceLinks } from "@/features/access/RoleResourceLinks";
import { MuteProvider } from "@/hooks/useMute";

const safetyActions = [
  {
    title: "Report an incident",
    description: "Send a safety report, including your location and supporting details.",
    path: "/incident-report",
    label: "Create report",
    icon: RadioTower,
  },
  {
    title: "Emergency contacts",
    description: "Maintain the people and services you may need during an emergency.",
    path: "/emergency-contacts",
    label: "Manage contacts",
    icon: ContactRound,
  },
  {
    title: "Nearby resources",
    description: "Find verified emergency resources and services near your location.",
    path: "/resources",
    label: "View resources",
    icon: MapPinned,
  },
  {
    title: "Notifications",
    description: "Review safety updates and messages sent to your account.",
    path: "/notifications",
    label: "Open notifications",
    icon: Bell,
  },
  {
    title: "My sites",
    description: "View and manage the personal sites covered by your subscription.",
    path: "/deployments",
    label: "Manage sites",
    icon: Server,
  },
  {
    title: "My profile",
    description: "Keep your identity and contact information up to date.",
    path: "/profile",
    label: "Open profile",
    icon: CircleUserRound,
  },
] as const;

export default function ResidentDashboard() {
  const { activeOrganization } = useAccess();

  return (
    <MuteProvider>
      <div className="min-h-screen bg-background pb-20 md:pb-8">
        <Header />
        <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
          <section className="rounded-xl border border-border bg-card p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <ShieldCheck className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Resident access
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight">My Safety</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Use your personal safety tools, report incidents, and manage the information
                  connected to {activeOrganization?.name ?? "your workspace"}.
                </p>
              </div>
            </div>
          </section>

          <RoleResourceLinks />

          <section aria-labelledby="safety-actions-title">
            <h2 id="safety-actions-title" className="mb-4 text-xl font-semibold">
              Safety tools
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {safetyActions.map((action) => (
                <Card key={action.path} className="flex h-full flex-col border-border">
                  <CardHeader>
                    <action.icon className="mb-2 h-6 w-6 text-primary" aria-hidden="true" />
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-5">
                    <p className="flex-1 text-sm leading-6 text-muted-foreground">
                      {action.description}
                    </p>
                    <Button asChild variant="outline" className="w-full">
                      <Link to={action.path}>{action.label}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </main>
        <BottomNav />
      </div>
    </MuteProvider>
  );
}
