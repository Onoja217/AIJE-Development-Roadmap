import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/access/AccessProvider";
import {
  APP_PATHS,
  NAVIGATION_SECTIONS,
  canOpenNavigationItem,
} from "@/features/navigation/navigationConfig";

const MOBILE_PATHS = new Set<string>([
  APP_PATHS.safety,
  APP_PATHS.operations,
  APP_PATHS.intelligence,
  APP_PATHS.community,
  APP_PATHS.organization,
  APP_PATHS.platform,
  APP_PATHS.profile,
]);

export function BottomNav() {
  const location = useLocation();
  const { platformAdmin, hasPermission } = useAccess();
  const items = NAVIGATION_SECTIONS.flatMap((section) => section.items).filter(
    (item) =>
      MOBILE_PATHS.has(item.path) &&
      canOpenNavigationItem(item, platformAdmin, hasPermission),
  );

  return (
    <nav aria-label="Primary mobile navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-md md:hidden">
      <div className="flex h-14 items-center gap-1 overflow-x-auto px-2">
        {items.map((item) => {
          const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
          return (
            <Link key={item.path} to={item.path} aria-current={active ? "page" : undefined} className={cn("flex min-w-16 shrink-0 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 transition-colors", active ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
              <item.icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_6px_hsl(var(--primary))]")} aria-hidden="true" />
              <span className="max-w-20 truncate text-[10px] font-medium">{item.title.replace(" administration", "")}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
