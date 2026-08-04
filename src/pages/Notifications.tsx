import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BellRing,
  CheckCheck,
  Loader2,
  Search,
  Trash2,
  Inbox,
} from "lucide-react";

import { Header } from "@/components/dashboard/Header";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  useNotifications,
  type NotificationFilters,
} from "@/hooks/useNotifications";
import {
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_PRIORITY_LABELS,
  type NotificationCategory,
  type NotificationPriority,
} from "@/lib/notificationService";

const priorityStyles: Record<NotificationPriority, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-primary/10 text-primary",
  high: "bg-warning/15 text-warning",
  critical: "bg-destructive/15 text-destructive",
};

function formatWhen(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Notifications() {
  const [category, setCategory] = useState<NotificationCategory | "all">("all");
  const [priority, setPriority] = useState<NotificationPriority | "all">("all");
  const [readState, setReadState] =
    useState<NotificationFilters["readState"]>("all");
  const [search, setSearch] = useState("");

  const filters = useMemo(
    () => ({ category, priority, readState, search }),
    [category, priority, readState, search]
  );

  const {
    items,
    total,
    unreadCount,
    page,
    pageCount,
    loading,
    error,
    setPage,
    markRead,
    markAllRead,
    remove,
  } = useNotifications(filters);

  return (
    <div className="min-h-dvh bg-background pb-20 md:pb-0">
      <Header />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-6">
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <BellRing className="h-4 w-4" aria-hidden="true" />
            <p className="text-sm font-medium uppercase tracking-[0.18em]">
              Notification Center
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Notifications
            </h1>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void markAllRead()}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark all read
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            {unreadCount} unread of {total} matching notifications. In-app
            delivery only — SMS and WhatsApp dispatch is disabled.
          </p>
        </section>

        <section
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          aria-label="Notification filters"
        >
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notifications"
              className="pl-9"
              aria-label="Search notifications"
            />
          </div>

          <Select
            value={category}
            onValueChange={(value) =>
              setCategory(value as NotificationCategory | "all")
            }
          >
            <SelectTrigger aria-label="Filter by type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {(
                Object.keys(NOTIFICATION_CATEGORY_LABELS) as
                  NotificationCategory[]
              ).map((key) => (
                <SelectItem key={key} value={key}>
                  {NOTIFICATION_CATEGORY_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={priority}
            onValueChange={(value) =>
              setPriority(value as NotificationPriority | "all")
            }
          >
            <SelectTrigger aria-label="Filter by priority">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {(
                Object.keys(NOTIFICATION_PRIORITY_LABELS) as
                  NotificationPriority[]
              ).map((key) => (
                <SelectItem key={key} value={key}>
                  {NOTIFICATION_PRIORITY_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={readState}
            onValueChange={(value) =>
              setReadState(value as NotificationFilters["readState"])
            }
          >
            <SelectTrigger aria-label="Filter by read state">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Read &amp; unread</SelectItem>
              <SelectItem value="unread">Unread only</SelectItem>
              <SelectItem value="read">Read only</SelectItem>
            </SelectContent>
          </Select>
        </section>

        {error ? (
          <Card className="border-destructive/40">
            <CardContent className="p-4 text-sm text-destructive">
              Could not load notifications: {error}
            </CardContent>
          </Card>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading notifications…</span>
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium text-foreground">
                No notifications found
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Incident reports, community alerts, AI detections and system
                events will appear here as they happen.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3" aria-label="Notification list">
            {items.map((item) => {
              const unread = item.read_at === null;

              return (
                <li key={item.id}>
                  <Card
                    className={
                      unread ? "border-primary/40 bg-primary/[0.03]" : undefined
                    }
                  >
                    <CardContent className="space-y-3 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          {NOTIFICATION_CATEGORY_LABELS[item.category]}
                        </Badge>

                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityStyles[item.priority]}`}
                        >
                          {NOTIFICATION_PRIORITY_LABELS[item.priority]}
                        </span>

                        {unread ? (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                            Unread
                          </span>
                        ) : null}

                        <span className="ml-auto text-xs text-muted-foreground">
                          {formatWhen(item.created_at)}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <p className="font-semibold leading-6 text-foreground">
                          {item.title}
                        </p>
                        {item.body ? (
                          <p className="text-sm leading-6 text-muted-foreground">
                            {item.body}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {item.link ? (
                          <Button asChild size="sm" variant="secondary">
                            <Link to={item.link}>Open</Link>
                          </Button>
                        ) : null}

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void markRead(item.id, unread)}
                        >
                          {unread ? "Mark read" : "Mark unread"}
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => void remove(item.id)}
                          aria-label={`Delete notification ${item.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        {pageCount > 1 ? (
          <nav
            className="flex items-center justify-between gap-3"
            aria-label="Notification pagination"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>

            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {pageCount}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(pageCount - 1, page + 1))}
              disabled={page >= pageCount - 1}
            >
              Next
            </Button>
          </nav>
        ) : null}
      </main>

      <BottomNav />
    </div>
  );
}
