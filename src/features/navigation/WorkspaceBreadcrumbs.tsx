import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { NAVIGATION_SECTIONS } from "./navigationConfig";

export function WorkspaceBreadcrumbs() {
  const { pathname } = useLocation();
  const match = NAVIGATION_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({ section, item })),
  ).filter(({ item }) => pathname === item.path || pathname.startsWith(`${item.path}/`))
    .sort((a, b) => b.item.path.length - a.item.path.length)[0];

  if (!match) return null;
  return (
    <nav aria-label="Breadcrumb" className="border-b border-border bg-background/70 px-4 py-2 md:px-6">
      <ol className="mx-auto flex max-w-[1600px] items-center gap-1 text-xs text-muted-foreground">
        <li><Link to="/" className="hover:text-foreground">AIJE</Link></li>
        {[match.section.domain, match.item.title].map((label, index) => (
          <Fragment key={label}>
            <li aria-hidden="true"><ChevronRight className="h-3 w-3" /></li>
            <li aria-current={index === 1 ? "page" : undefined} className={index === 1 ? "font-medium text-foreground" : ""}>{label}</li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
