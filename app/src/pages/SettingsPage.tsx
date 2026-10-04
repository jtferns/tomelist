import { Link, useParams } from "@tanstack/react-router";
import { ProgressBackup } from "@/components/ProgressBackup";
import { Badge } from "@/components/ui/badge";
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

const cityPalettes = [
  { id: "ishgard", label: "Ishgard", hoverClass: "hover:border-[oklch(0.74_0.09_240)]" },
  { id: "crystarium", label: "The Crystarium", hoverClass: "hover:border-[oklch(0.74_0.13_295)]" },
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
  const { eventId } = useParams({ from: "/$eventId" });
  const theme = useAppStore((s) => s.settings.theme);
  const setPalette = useAppStore((s) => s.setPalette);
  const setMode = useAppStore((s) => s.setMode);
  const setOrnament = useAppStore((s) => s.setOrnament);
  const setDensity = useAppStore((s) => s.setDensity);
  const now = new Date();
  return (
    <div data-testid="settings-page" className="flex flex-col gap-6">
      <FramedCard corners className="flex flex-col gap-6 p-4">
        {[
          { title: "Grand Company", options: palettes },
          { title: "City", options: cityPalettes },
        ].map(({ title, options }) => (
          <section key={title} className="flex flex-col gap-2">
            <SectionKicker as="h2">{title}</SectionKicker>
            <div className="flex flex-wrap gap-2">
              {options.map((p) => {
                const active = theme.palette === p.id;
                return (
                  <Chip
                    key={p.id}
                    active={active}
                    className={active ? undefined : p.hoverClass}
                    onClick={() => setPalette(p.id)}
                  >
                    {p.label}
                  </Chip>
                );
              })}
            </div>
          </section>
        ))}

        <section className="flex flex-col gap-2">
          <SectionKicker as="h2">Mode</SectionKicker>
          <div className="flex gap-2">
            {modes.map((m) => {
              const active = theme.mode === m.id;
              return (
                <Chip key={m.id} active={active} onClick={() => setMode(m.id)}>
                  {m.label}
                </Chip>
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
                  className="rounded-sm text-gold underline-offset-2 outline-none hover:text-gold-soft hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {e.name}
                </Link>
                {isEventEnded(e, now) ? <Badge variant="gold-outline">Ended</Badge> : null}
              </li>
            ))}
          </ul>
        </section>

        <ProgressBackup eventId={eventId} />

        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <p>Tomelist v2.0.0-dev</p>
          <p data-testid="ai-disclosure">
            v1 (2021) was built by hand by{" "}
            <a
              href="https://github.com/jtferns"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold underline underline-offset-2 outline-none hover:text-gold-soft focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              jtferns
            </a>
            . v2 was rebuilt with Claude, an AI coding assistant. Claude wrote most of the code and drafted the event
            data from the wiki; jtferns directed the design, decisions and review.
          </p>
          <p>
            FINAL FANTASY XIV © SQUARE ENIX CO., LTD. Item icons come from the game via XIVAPI. Tomelist is a fan
            project and is not affiliated with Square Enix.
          </p>
        </div>
      </FramedCard>
    </div>
  );
}
