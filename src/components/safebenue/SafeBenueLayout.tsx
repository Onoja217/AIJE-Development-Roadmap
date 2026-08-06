import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Header } from "@/components/dashboard/Header";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Overview", path: "/safebenue" },
  { label: "Dashboard", path: "/safebenue/dashboard" },
  { label: "Reports", path: "/safebenue/reports" },
  { label: "Resources", path: "/safebenue/resources" },
  { label: "Community Watch", path: "/safebenue/community-watch" },
  { label: "Family", path: "/safebenue/family" },
  { label: "Admin", path: "/safebenue/admin" },
];

interface SafeBenueLayoutProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function SafeBenueLayout({ title, description, children }: SafeBenueLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <div className="border-b border-border bg-card/40">
        <nav
          aria-label="SafeBenue sections"
          className="mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-4 py-2 md:px-6"
        >
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={cn(
                  "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 md:px-6">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            SafeBenue · Powered by AIJE
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
            {description}
          </p>
        </header>

        {children}
      </main>
    </div>
  );
}
