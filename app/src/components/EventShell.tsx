import { Link, Outlet, useParams } from "@tanstack/react-router";
import { ListChecks, Home, Settings, ShoppingBag } from "lucide-react";

const tabs = [
  { to: "overview", label: "Overview", Icon: Home },
  { to: "objectives", label: "Objectives", Icon: ListChecks },
  { to: "exchanges", label: "Exchanges", Icon: ShoppingBag },
  { to: "settings", label: "Settings", Icon: Settings },
] as const;

export function EventShell() {
  const { eventId } = useParams({ from: "/$eventId" });
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <main className="flex-1 p-4 pb-20 sm:pb-4 sm:pt-16">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 border-t border-border bg-card sm:bottom-auto sm:top-0 sm:border-b sm:border-t-0">
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
