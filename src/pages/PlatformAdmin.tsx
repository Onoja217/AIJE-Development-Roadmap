import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BellRing,
  Building2,
  CreditCard,
  FileCheck2,
  HeartPulse,
  Network,
  ShieldAlert,
  Users,
  Webhook,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/dashboard/Header";
import { RoleResourceLinks } from "@/features/access/RoleResourceLinks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_PATHS } from "@/features/navigation/navigationConfig";

interface AdminArea {
  title: string;
  description: string;
  path: string;
  icon: LucideIcon;
}

const ADMIN_AREAS: AdminArea[] = [
  {
    title: "Organizations",
    description:
      "Create and administer tenant organizations and operational sites.",
    path: APP_PATHS.organization,
    icon: Building2,
  },
  {
    title: "Memberships",
    description:
      "Review organization membership, invitations and scoped assignments.",
    path: APP_PATHS.organization,
    icon: Users,
  },
  {
    title: "Users and roles",
    description:
      "Manage database-backed roles without exposing authentication secrets.",
    path: APP_PATHS.organization,
    icon: ShieldAlert,
  },
  {
    title: "Incident moderation",
    description:
      "Review incident activity and coordinate protected response workflows.",
    path: APP_PATHS.community,
    icon: FileCheck2,
  },
  {
    title: "Plans and subscriptions",
    description:
      "Review the platform plan catalogue and subscription operations.",
    path: APP_PATHS.billing,
    icon: CreditCard,
  },
  {
    title: "System health",
    description:
      "Inspect operational status, synchronization and active system modules.",
    path: APP_PATHS.operations,
    icon: HeartPulse,
  },
  {
    title: "Integration health",
    description:
      "Review connected services and operational integration status.",
    path: APP_PATHS.operations,
    icon: Network,
  },
  {
    title: "Webhooks",
    description:
      "Monitor deliveries, retries, dead-letter events and alert thresholds.",
    path: APP_PATHS.webhooks,
    icon: Webhook,
  },
  {
    title: "Audit logs",
    description: "Review immutable administrative and tenant access activity.",
    path: APP_PATHS.organization,
    icon: Activity,
  },
  {
    title: "Security events",
    description:
      "Review administrative notifications and suspicious platform activity.",
    path: APP_PATHS.notifications,
    icon: BellRing,
  },
];

export default function PlatformAdmin() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-[1600px] space-y-8 px-4 py-6 md:px-6">
        <RoleResourceLinks />
        <section className="space-y-3">
          <Badge variant="outline" className="border-primary/40 text-primary">
            Cross-organization access
          </Badge>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Platform Administration
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
              Govern AIJE organizations, access, operations, integrations and
              administrative security from one protected workspace.
            </p>
          </div>
        </section>

        <section
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          aria-label="Platform administration areas"
        >
          {ADMIN_AREAS.map((area) => {
            const Icon = area.icon;
            return (
              <Card key={area.title} className="flex h-full flex-col bg-card">
                <CardHeader>
                  <div className="mb-2 w-fit rounded-lg bg-primary/10 p-2 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">{area.title}</CardTitle>
                  <CardDescription className="leading-6">
                    {area.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <Button asChild className="w-full">
                    <Link to={area.path}>Open {area.title}</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>
      </main>
    </div>
  );
}
