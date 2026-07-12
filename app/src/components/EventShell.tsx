import { Link, Outlet, useParams } from "@tanstack/react-router";
import { CalendarCheck, ListChecks, Home, Settings, ShoppingBag } from "lucide-react";
import { useEffect } from "react";
import { ProgressHud } from "@/components/ProgressHud";
import { getEvent } from "@/lib/events";
import { setFavicon } from "@/lib/favicon";

const tabs = [
  { to: "overview", label: "Overview", Icon: Home },
  { to: "objectives", label: "Objectives", Icon: ListChecks },
  { to: "planner", label: "Planner", Icon: CalendarCheck },
  { to: "exchanges", label: "Exchanges", Icon: ShoppingBag },
  { to: "settings", label: "Settings", Icon: Settings },
] as const;

export function EventShell() {
  const { eventId } = useParams({ from: "/$eventId" });
  const event = getEvent(eventId);
  useEffect(() => {
    if (event?.tomestone.icon) setFavicon(event.tomestone.icon);
  }, [event]);
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <div className="sm:pt-14">
        <ProgressHud />
      </div>
      <main className="flex-1 p-4 pb-20 sm:pb-4">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card sm:bottom-auto sm:top-0 sm:border-b sm:border-t-0">
        <div className="mx-auto flex max-w-3xl justify-around">
          {tabs.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={`/$eventId/${to}`}
              params={{ eventId }}
              className="flex min-h-14 min-w-14 flex-col items-center justify-center gap-0.5 px-3 text-xs text-muted-foreground transition-colors hover:text-foreground [&.active]:text-primary"
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
