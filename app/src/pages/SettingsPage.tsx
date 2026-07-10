import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAllEvents, isEventEnded } from "@/lib/events";
import { useAppStore } from "@/store/useAppStore";

const palettes = [
  { id: "maelstrom", label: "Maelstrom" },
  { id: "adder", label: "Twin Adder" },
  { id: "flames", label: "Immortal Flames" },
] as const;

export function SettingsPage() {
  const theme = useAppStore((s) => s.settings.theme);
  const setPalette = useAppStore((s) => s.setPalette);
  const setMode = useAppStore((s) => s.setMode);
  const now = new Date();
  return (
    <div data-testid="settings-page" className="flex flex-col gap-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Grand Company</h2>
        <div className="flex flex-wrap gap-2">
          {palettes.map((p) => (
            <Button key={p.id} variant={theme.palette === p.id ? "default" : "outline"} onClick={() => setPalette(p.id)}>
              {p.label}
            </Button>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Mode</h2>
        <div className="flex gap-2">
          {(["dark", "light"] as const).map((m) => (
            <Button key={m} variant={theme.mode === m ? "default" : "outline"} onClick={() => setMode(m)}>
              {m}
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
