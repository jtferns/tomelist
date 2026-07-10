import { Link, useParams } from "@tanstack/react-router";
import { EventSwitcher } from "@/components/EventSwitcher";
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
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <EventSwitcher eventId={eventId} />
        <div className="h-2 min-w-8 flex-1 overflow-hidden rounded-full bg-secondary">
          <div
            data-testid="hud-bar"
            className="h-full rounded-full bg-primary transition-all"
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
          className="flex shrink-0 items-center gap-1 text-sm tabular-nums transition-colors hover:text-primary"
          aria-label="Open wallet on Overview"
        >
          <span data-testid="hud-count" className="font-bold">{tomestones}</span>
          {total > 0 ? (
            <span data-testid="hud-total" className="text-muted-foreground">/ {total}</span>
          ) : null}
          {event.tomestone.icon ? (
            <img src={event.tomestone.icon} alt={event.tomestone.name} className="size-5" />
          ) : null}
        </Link>
      </div>
      {total === 0 ? (
        <p className="mx-auto max-w-3xl pt-1 text-[11px] text-muted-foreground">
          Pick exchanges to set a goal
        </p>
      ) : null}
    </div>
  );
}
