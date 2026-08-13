import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  NAVIGATION_SECTIONS,
  canOpenNavigationItem,
} from "@/features/navigation/navigationConfig";
import { useAccess } from "./AccessProvider";

export function RoleResourceLinks() {
  const location = useLocation();
  const { platformAdmin, hasPermission } = useAccess();
  const visibleSections = NAVIGATION_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        item.path !== location.pathname &&
        canOpenNavigationItem(item, platformAdmin, hasPermission),
    ),
  })).filter((section) => section.items.length > 0);

  return (
    <nav aria-labelledby="workspace-navigation-title" className="space-y-4">
      <div>
        <h2 id="workspace-navigation-title" className="text-xl font-semibold">
          Available workspaces
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tools are grouped by responsibility and limited to your active role.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleSections.map((section) => (
          <section key={section.domain} className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.domain}
            </h3>
            <div className="flex flex-wrap gap-2">
              {section.items.map((item) => (
                <Button key={item.path} asChild variant="outline" size="sm">
                  <Link to={item.path}>
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    {item.title}
                  </Link>
                </Button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </nav>
  );
}
