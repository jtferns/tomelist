import { Link, useParams } from "@tanstack/react-router";
import { EventSwitcher } from "@/components/EventSwitcher";
import { FramedCard } from "@/components/ui/framed-card";
import { getEvent } from "@/lib/events";
import { getWishlistTotal } from "@/lib/wishlist";
import { useAppStore } from "@/store/useAppStore";

export function ProgressHud() {
  const { eventId } = useParams({ from: "/$eventId" });
  const event = getEvent(eventId);
  const tomestones = useAppStore((s) => s.events[eventId]?.tomestones ?? 0);
  const wishlist = useAppStore((s) => s.events[eventId]?.wishlist);
  if (!event) return null;
  const total = getWishlistTotal(event, wishlist);
  const pct = total > 0 ? Math.min(100, (tomestones / total) * 100) : 0;
  return (
    <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-2 backdrop-blur sm:top-14">
      <FramedCard corners className="mx-auto max-w-[960px]">
        <div className="flex flex-wrap items-center gap-3 px-[var(--hud-pad-x)] py-[var(--hud-pad-y)]">
          <EventSwitcher eventId={eventId} />
          <div className="h-2 min-w-8 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              data-testid="hud-bar"
              className="h-full rounded-full bg-gradient-to-r from-primary to-gold transition-[width] duration-[var(--dur-slow)]"
              style={{ width: `${pct}%` }}
            />
          </div>
          {total > 0 ? (
            <span data-testid="hud-pct" className="text-xs font-semibold tabular-nums text-muted-foreground">
              {Math.floor(pct)}%
            </span>
          ) : null}
          <Link
            to="/$eventId/overview"
            params={{ eventId }}
            className="flex shrink-0 items-center gap-1.5 transition-colors hover:text-primary"
            aria-label="Open wallet on Overview"
          >
            <span className="flex flex-col items-end">
              <span className="text-[10.5px] uppercase tracking-[.12em] text-muted-foreground">
                {event.tomestone.name}
              </span>
              <span className="flex items-baseline gap-1">
                <span
                  data-testid="hud-count"
                  className="font-display text-[19px] font-bold tabular-nums text-gold"
                >
                  {tomestones}
                </span>
                {total > 0 ? (
                  <span data-testid="hud-total" className="text-xs text-muted-foreground">/ {total}</span>
                ) : null}
              </span>
            </span>
            {event.tomestone.icon ? (
              <img src={event.tomestone.icon} alt={event.tomestone.name} className="size-5" />
            ) : null}
          </Link>
        </div>
        {total === 0 ? (
          <p className="px-[var(--hud-pad-x)] pb-[var(--hud-pad-y)] text-[11px] text-muted-foreground">
            No goal yet — wishlist exchanges to set one
          </p>
        ) : null}
      </FramedCard>
    </div>
  );
}
