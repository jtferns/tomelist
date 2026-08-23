import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { FramedCard } from "@/components/ui/framed-card";
import { SectionKicker } from "@/components/ui/section-header";
import { getAllEvents, isEventEnded } from "@/lib/events";
import { useAppStore } from "@/store/useAppStore";
import type { ThemeSettings } from "@tomelist/schema";

const palettes = [
  { id: "maelstrom", label: "Maelstrom", hoverClass: "hover:border-[oklch(0.63_0.19_25)]" },
  { id: "adder", label: "Twin Adder", hoverClass: "hover:border-[oklch(0.65_0.15_130)]" },
  { id: "flames", label: "Immortal Flames", hoverClass: "hover:border-[oklch(0.7_0.15_60)]" },
] as const;

const modes = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
] as const;

const ornaments: { id: ThemeSettings["ornament"]; label: string }[] = [
  { id: "full", label: "Full" },
  { id: "reduced", label: "Reduced" },
  { id: "minimal", label: "Minimal" },
];

const densities: { id: ThemeSettings["density"]; label: string }[] = [
  { id: "comfy", label: "Comfy" },
  { id: "compact", label: "Compact" },
];

export function SettingsPage() {
  const theme = useAppStore((s) => s.settings.theme);
  const setPalette = useAppStore((s) => s.setPalette);
  const setMode = useAppStore((s) => s.setMode);
  const setOrnament = useAppStore((s) => s.setOrnament);
  const setDensity = useAppStore((s) => s.setDensity);
  const now = new Date();
  return (
    <div data-testid="settings-page" className="flex flex-col gap-6">
      <FramedCard corners className="flex flex-col gap-6 p-4">
        <section className="flex flex-col gap-2">
          <SectionKicker as="h2">Grand Company</SectionKicker>
          <div className="flex flex-wrap gap-2">
            {palettes.map((p) => {
              const active = theme.palette === p.id;
              return (
                <Button
                  key={p.id}
                  variant={active ? "action" : "outline"}
                  aria-pressed={active}
                  className={active ? undefined : p.hoverClass}
                  onClick={() => setPalette(p.id)}
                >
                  {p.label}
                </Button>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <SectionKicker as="h2">Mode</SectionKicker>
          <div className="flex gap-2">
            {modes.map((m) => {
              const active = theme.mode === m.id;
              return (
                <Button
                  key={m.id}
                  variant={active ? "action" : "outline"}
                  aria-pressed={active}
                  onClick={() => setMode(m.id)}
                >
                  {m.label}
                </Button>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <SectionKicker as="h2">Ornament</SectionKicker>
          <div className="flex flex-wrap gap-2">
            {ornaments.map((o) => (
              <Chip key={o.id} active={theme.ornament === o.id} onClick={() => setOrnament(o.id)}>
                {o.label}
              </Chip>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <SectionKicker as="h2">Density</SectionKicker>
          <div className="flex gap-2">
            {densities.map((d) => (
              <Chip key={d.id} active={theme.density === d.id} onClick={() => setDensity(d.id)}>
                {d.label}
              </Chip>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <SectionKicker as="h2">Events</SectionKicker>
          <ul className="flex flex-col gap-1">
            {getAllEvents().map((e) => (
              <li key={e.id} className="flex items-center gap-2">
                <Link
                  to="/$eventId/overview"
                  params={{ eventId: e.id }}
                  className="text-gold underline-offset-2 hover:text-gold-soft hover:underline"
                >
                  {e.name}
                </Link>
                {isEventEnded(e, now) ? <Badge variant="gold-outline">Ended</Badge> : null}
              </li>
            ))}
          </ul>
        </section>

        <p className="text-xs text-muted-foreground">Tomelist v2.0.0-dev</p>
      </FramedCard>
    </div>
  );
}
