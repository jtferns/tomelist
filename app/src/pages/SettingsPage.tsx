import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAllEvents, isEventEnded } from "@/lib/events";
import { useAppStore } from "@/store/useAppStore";

export function SettingsPage() {
  const theme = useAppStore((s) => s.settings.theme.mode);
  const setMode = useAppStore((s) => s.setMode);
  const now = new Date();
  return (
    <div data-testid="settings-page" className="flex flex-col gap-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Theme</h2>
        <div className="flex gap-2">
          {(["dark", "light"] as const).map((t) => (
            <Button key={t} variant={theme === t ? "default" : "outline"} onClick={() => setMode(t)}>
              {t}
            </Button>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Events</h2>
        <ul className="flex flex-col gap-1">
          {getAllEvents().map((e) => (
            <li key={e.id} className="flex items-center gap-2">
              <Link to="/$eventId/overview" params={{ eventId: e.id }} className="text-primary underline-offset-2 hover:underline">
                {e.name}
              </Link>
              {isEventEnded(e, now) ? <Badge variant="outline">Ended</Badge> : null}
            </li>
          ))}
        </ul>
      </section>
      <p className="text-xs text-muted-foreground">Tomelist v2.0.0-dev</p>
    </div>
  );
}
