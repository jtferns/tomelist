import { useParams } from "@tanstack/react-router";
import { CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getEvent } from "@/lib/events";
import { cn } from "@/lib/utils";
import { getWishlistTotal } from "@/lib/wishlist";
import { useAppStore } from "@/store/useAppStore";
import type { Exchange } from "@tomelist/schema";

function ExchangeRow({ eventId, item, wallet }: { eventId: string; item: Exchange; wallet: number }) {
  const entry = useAppStore((s) => s.events[eventId]?.wishlist[item.id]);
  const toggleWishlist = useAppStore((s) => s.toggleWishlist);
  const adjustWishlistQuantity = useAppStore((s) => s.adjustWishlistQuantity);
  const markExchanged = useAppStore((s) => s.markExchanged);
  const wanted = entry?.status === "wanted";
  const exchanged = entry?.status === "exchanged";
  const quantity = entry?.quantity ?? 1;
  const insufficient = wanted && item.cost * quantity > wallet;

  const meta = (
    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
      <Badge variant="secondary">{item.cost} tomes</Badge>
      <span>{item.type}</span>
      {item.tradeable ? <Badge variant="outline">tradeable</Badge> : null}
    </div>
  );

  if (exchanged) {
    return (
      <Card data-testid={`exchange-${item.id}`} className="opacity-70">
        <CardContent className="flex items-center gap-3 p-3">
          <CheckCircle2 className="size-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{item.name}</p>
            {meta}
          </div>
          <Badge>Exchanged</Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      data-testid={`exchange-${item.id}`}
      data-insufficient={insufficient ? "true" : undefined}
      className={cn(
        "relative transition-colors hover:bg-accent",
        wanted && "border-primary"
      )}
    >
      <CardContent className="flex items-center gap-3 p-3">
        {wanted ? (
          <CheckCircle2 className="size-5 shrink-0 text-primary" />
        ) : (
          <Circle className="size-5 shrink-0 text-muted-foreground" />
        )}
        <button
          type="button"
          aria-pressed={wanted}
          aria-label={`Want ${item.name}`}
          onClick={() => toggleWishlist(eventId, item.id)}
          className={cn(
            "min-w-0 flex-1 cursor-pointer text-left after:absolute after:inset-0 after:content-['']",
            insufficient && "italic opacity-60"
          )}
        >
          <p className="truncate font-medium">{item.name}</p>
          {meta}
        </button>
        {wanted ? (
          <div
            className="relative z-10 flex shrink-0 items-center gap-1"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Button
              variant="outline"
              size="sm"
              aria-label={`Fewer ${item.name}`}
              onClick={() => adjustWishlistQuantity(eventId, item.id, -1)}
            >
              −
            </Button>
            <span data-testid={`qty-${item.id}`} className="w-6 text-center text-sm tabular-nums">
              {quantity}
            </span>
            <Button
              variant="outline"
              size="sm"
              aria-label={`More ${item.name}`}
              onClick={() => adjustWishlistQuantity(eventId, item.id, 1)}
            >
              +
            </Button>
            <Button
              size="sm"
              disabled={wallet < item.cost}
              onClick={() => markExchanged(eventId, item.id, item.cost)}
            >
              Mark exchanged
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ExchangesPage() {
  const { eventId } = useParams({ from: "/$eventId" });
  const event = getEvent(eventId);
  const wallet = useAppStore((s) => s.events[eventId]?.tomestones ?? 0);
  const wishlist = useAppStore((s) => s.events[eventId]?.wishlist);
  if (!event) return <div data-testid="exchanges-page">Unknown event.</div>;
  const wantedTotal = getWishlistTotal(event, wishlist);
  return (
    <div data-testid="exchanges-page" className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Wishlist total:{" "}
        <span data-testid="wanted-total" className="font-bold text-foreground">{wantedTotal}</span>{" "}
        tomes
      </p>
      {event.exchanges.map((item) => (
        <ExchangeRow key={item.id} eventId={eventId} item={item} wallet={wallet} />
      ))}
    </div>
  );
}
