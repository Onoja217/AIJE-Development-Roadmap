import { Shield, Activity, Smartphone, UserCircle, ScanEye, ScanFace, Server, LifeBuoy } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Shield, label: "Dashboard", path: "/" },
  { icon: LifeBuoy, label: "SafeBenue", path: "/safebenue" },
  { icon: ScanEye, label: "Detection", path: "/detection" },
  { icon: ScanFace, label: "Faces", path: "/faces" },
  { icon: Activity, label: "Sensors", path: "/sensors" },
  { icon: Smartphone, label: "Control", path: "/control" },
  { icon: Server, label: "Sites", path: "/deployments" },
  { icon: UserCircle, label: "Profile", path: "/profile" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur-md md:hidden">
      <div className="flex h-14 items-center justify-around gap-0.5 overflow-x-auto px-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              className={cn(
                "flex shrink-0 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_6px_hsl(var(--primary))]")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
