import { Link, Outlet, useParams } from "@tanstack/react-router";
import { CalendarCheck, ListChecks, Home, Settings, ShoppingBag } from "lucide-react";
import { useEffect } from "react";
import { ProgressHud } from "@/components/ProgressHud";
import { Diamond } from "@/components/ui/diamond";
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
    <div className="mx-auto flex min-h-dvh max-w-[960px] flex-col">
      <div className="sm:pt-14">
        <ProgressHud />
      </div>
      <main className="flex-1 p-4 pb-20 sm:pb-4">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar (<sm) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--frame-border)] bg-card/95 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-[960px] justify-around">
          {tabs.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={`/$eventId/${to}`}
              params={{ eventId }}
              className="flex min-h-14 min-w-14 flex-col items-center justify-center gap-0.5 px-3 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 [&.active]:text-gold"
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Desktop header (>=sm) */}
      <nav className="fixed inset-x-0 top-0 z-20 hidden border-b border-[var(--frame-border)] bg-card/95 backdrop-blur sm:block">
        <div className="mx-auto flex h-14 max-w-[960px] items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Diamond size={18} />
            <span className="font-display text-[17px] font-bold tracking-[.08em]">TOMELIST</span>
          </div>
          <div className="flex items-center">
            {tabs.map(({ to, label }) => (
              <Link
                key={to}
                to={`/$eventId/${to}`}
                params={{ eventId }}
                className="rounded-[4px] px-3 py-2 text-[13.5px] font-medium text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 [&.active]:bg-primary/15 [&.active]:font-bold [&.active]:text-foreground [&.active]:shadow-[inset_0_-2px_0_var(--color-primary)]"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
