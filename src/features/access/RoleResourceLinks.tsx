import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BellRing,
  Building2,
  Camera,
  CircleUserRound,
  ContactRound,
  CreditCard,
  FileWarning,
  LifeBuoy,
  MapPinned,
  RadioTower,
  ScanEye,
  ScanFace,
  Server,
  Settings,
  ShieldCheck,
  Users,
  Webhook,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { Permission } from "./types";
import { useAccess } from "./AccessProvider";

interface ResourceLink {
  title: string;
  path: string;
  icon: LucideIcon;
  anyOf?: Permission[];
  platformOnly?: boolean;
}

const RESOURCE_LINKS: ResourceLink[] = [
  { title: "Report incident", path: "/incident-report", icon: FileWarning },
  { title: "Emergency contacts", path: "/emergency-contacts", icon: ContactRound },
  { title: "Emergency resources", path: "/resources", icon: MapPinned },
  { title: "Notifications", path: "/notifications", icon: Bell },
  { title: "My sites", path: "/deployments", icon: Server },
  { title: "My profile", path: "/profile", icon: CircleUserRound },
  { title: "SafeBenue", path: "/safebenue", icon: LifeBuoy },
  { title: "Operations", path: "/control", icon: Settings, anyOf: ["cameras.manage"] },
  { title: "Cameras", path: "/cameras", icon: Camera, anyOf: ["cameras.view", "cameras.manage"] },
  { title: "Detection", path: "/detection", icon: ScanEye, anyOf: ["cameras.view"] },
  { title: "Sensors", path: "/sensors", icon: RadioTower, anyOf: ["cameras.view", "cameras.manage"] },
  { title: "Faces", path: "/faces", icon: ScanFace, anyOf: ["cameras.manage"] },
  {
    title: "Community operations",
    path: "/community-dashboard",
    icon: Users,
    anyOf: ["alerts.dispatch", "incidents.respond", "reports.verify"],
  },
  { title: "Community alerts", path: "/community-alerts", icon: BellRing, anyOf: ["alerts.dispatch"] },
  { title: "Organization", path: "/organization", icon: Building2, anyOf: ["organization.manage"] },
  { title: "Plans and billing", path: "/pricing", icon: CreditCard, anyOf: ["billing.manage"] },
  { title: "Webhooks", path: "/admin/webhooks", icon: Webhook, platformOnly: true },
  { title: "Platform administration", path: "/platform-admin", icon: ShieldCheck, platformOnly: true },
];

export function RoleResourceLinks() {
  const location = useLocation();
  const { platformAdmin, hasPermission } = useAccess();
  const visibleLinks = RESOURCE_LINKS.filter((resource) => {
    if (resource.path === location.pathname) return false;
    if (resource.platformOnly) return platformAdmin;
    return !resource.anyOf || resource.anyOf.some((permission) => hasPermission(permission));
  });

  return (
    <section aria-labelledby="my-resources-title" className="space-y-3">
      <div>
        <h2 id="my-resources-title" className="text-xl font-semibold">My resources</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Personal tools and role-authorized workspaces available to this account.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {visibleLinks.map((resource) => (
          <Button key={resource.path} asChild variant="outline" size="sm">
            <Link to={resource.path}>
              <resource.icon className="h-4 w-4" aria-hidden="true" />
              {resource.title}
            </Link>
          </Button>
        ))}
      </div>
    </section>
  );
}
