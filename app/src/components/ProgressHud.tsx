import { Link, useParams } from "@tanstack/react-router";
import { emptyEventProgress } from "@tomelist/schema";
import { useEffect, useRef, useState } from "react";
import { AnimatedCount } from "@/components/ui/animated-count";
import { EventSwitcher } from "@/components/EventSwitcher";
import { getEvent } from "@/lib/events";
import { tokenCount } from "@/lib/format";
import { budgetReport } from "@/lib/optimizer";
import { cn } from "@/lib/utils";
import { getWishlistTokenTotal, getWishlistTotal } from "@/lib/wishlist";
import { useAppStore } from "@/store/useAppStore";

export function ProgressHud() {
  const { eventId } = useParams({ from: "/$eventId" });
  const event = getEvent(eventId);
  const tomestones = useAppStore((s) => s.events[eventId]?.tomestones ?? 0);
  const tokens = useAppStore((s) => s.events[eventId]?.tokens ?? 0);
  const progress = useAppStore((s) => s.events[eventId]);
  const wishlist = progress?.wishlist;
  const must = event ? budgetReport(event, progress ?? emptyEventProgress(), new Date()).tiers.find((t) => t.tier === "must") : undefined;
  const mustCovered = !!must && must.cumulativeCost > 0 && must.affordableNow;
  // Crossing into covered while the app is open plays a one-shot sheen. Loading
  // already covered does not; dropping back below re-arms it.
  const wasCovered = useRef(mustCovered);
  const [celebrate, setCelebrate] = useState(0);
  useEffect(() => {
    if (mustCovered && !wasCovered.current) setCelebrate((n) => n + 1);
    wasCovered.current = mustCovered;
  }, [mustCovered]);
  if (!event) return null;
  const total = getWishlistTotal(event, wishlist);
  const tokenTotal = event.token ? getWishlistTokenTotal(event, wishlist) : 0;
  // The bar tracks whichever currency is further from the goal.
  const tomePct = total > 0 ? Math.min(100, (tomestones / total) * 100) : 0;
  const pct = tokenTotal > 0 ? Math.min(tomePct, Math.min(100, (tokens / tokenTotal) * 100)) : tomePct;
  return (
    <div className="sticky top-0 z-10 border-b border-[var(--frame-border)] bg-card/95 backdrop-blur sm:top-14">
      <div className="mx-auto flex max-w-[960px] items-center gap-2 px-4 py-2 sm:gap-3">
        <div className="min-w-0 max-w-[50%]">
          <EventSwitcher eventId={eventId} />
        </div>
        <div
          role="progressbar"
          aria-label="Wishlist goal progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-valuetext={mustCovered ? `${Math.round(pct)}%, Must-haves covered` : undefined}
          title={
            total > 0
              ? `${Math.round(pct)}% of your wishlist goal${mustCovered ? ". Must-haves covered" : ""}`
              : "No goal yet"
          }
          data-must-covered={mustCovered || undefined}
          key={celebrate}
          className={cn(
            "relative h-2 min-w-8 flex-1 overflow-hidden rounded-full bg-secondary ring-1 ring-inset ring-[var(--frame-border)] data-[must-covered]:ring-gold/60",
            celebrate > 0 && "animate-goal-reached"
          )}
        >
          <div
            data-testid="hud-bar"
            className="h-full origin-left rounded-full bg-gradient-to-r from-primary to-gold in-data-[must-covered]:from-gold in-data-[must-covered]:to-gold-soft transition-transform duration-[var(--dur-slow)]"
            style={{ transform: `scaleX(${pct / 100})` }}
          />
        </div>
        <Link
          to="/$eventId/overview"
          params={{ eventId }}
          className="flex shrink-0 items-center gap-1.5 transition-colors hover:text-primary pointer-coarse:-my-2 pointer-coarse:py-2"
          aria-label={`${event.tomestone.name}: open wallet on Overview`}
        >
          {event.tomestone.icon ? <img src={event.tomestone.icon} alt="" className="size-5" /> : null}
          <AnimatedCount
            key={celebrate}
            data-testid="hud-count"
            value={tomestones}
            className="font-display text-lg font-bold tabular-nums text-gold"
          />
          {total > 0 ? (
            <span data-testid="hud-total" className="text-[13px] text-muted-foreground">
              / {total}
            </span>
          ) : null}
        </Link>
        {event.token ? (
          <span
            data-testid="hud-tokens"
            aria-label={
              tokenTotal > 0
                ? `${tokenCount(tokens, event.token.name)} of ${tokenTotal}`
                : tokenCount(tokens, event.token.name)
            }
            className="flex shrink-0 flex-col items-center text-[13px] leading-tight text-muted-foreground sm:flex-row sm:gap-1"
          >
            <span>
              <span className="font-bold tabular-nums text-gold">{tokens}</span>
              {tokenTotal > 0 ? `/${tokenTotal}` : null}
            </span>{" "}
            <span className="text-xs sm:text-[13px]">{tokens === 1 && tokenTotal === 0 ? "token" : "tokens"}</span>
          </span>
        ) : null}
        {total === 0 ? (
          <Link
            to="/$eventId/exchanges"
            params={{ eventId }}
            data-testid="hud-set-goal"
            className="shrink-0 text-[13px] text-gold underline underline-offset-2 pointer-coarse:inline-block pointer-coarse:py-3.5 pointer-coarse:-my-3.5"
          >
            Set a goal
          </Link>
        ) : null}
      </div>
    </div>
  );
}
