import { useParams } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getEvent } from "@/lib/events";
import { useAppStore } from "@/store/useAppStore";
import type { Exchange } from "@tomelist/schema";

function ExchangeRow({ eventId, item }: { eventId: string; item: Exchange }) {
  const status = useAppStore((s) => s.events[eventId]?.wishlist[item.id]?.status);
  const cycleWishlist = useAppStore((s) => s.cycleWishlist);
  const markExchanged = useAppStore((s) => s.markExchanged);
  return (
    <Card data-testid={`exchange-${item.id}`}>
      <CardContent className="flex items-center gap-3 p-3">
        <button
          type="button"
          aria-label={`Want ${item.name}`}
          onClick={() => cycleWishlist(eventId, item.id)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate font-medium">{item.name}</p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant="secondary">{item.cost} tomes</Badge>
            <span>{item.type}</span>
            {item.tradeable ? <Badge variant="outline">tradeable</Badge> : null}
          </div>
        </button>
        {status === "exchanged" ? (
          <Badge>Exchanged</Badge>
        ) : status === "wanted" ? (
          <Button size="sm" onClick={() => markExchanged(eventId, item.id, item.cost)}>
            Mark exchanged
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ExchangesPage() {
  const { eventId } = useParams({ from: "/$eventId" });
  const event = getEvent(eventId);
  const wantedTotal = useAppStore((s) => {
    const wishlist = s.events[eventId]?.wishlist ?? {};
    return event?.exchanges
      .filter((e) => wishlist[e.id]?.status === "wanted")
      .reduce((sum, e) => sum + e.cost, 0) ?? 0;
  });
  if (!event) return <div data-testid="exchanges-page">Unknown event.</div>;
  return (
    <div data-testid="exchanges-page" className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Wishlist total: <span data-testid="wanted-total" className="font-bold text-foreground">{wantedTotal}</span> tomes
      </p>
      {event.exchanges.map((item) => (
        <ExchangeRow key={item.id} eventId={eventId} item={item} />
      ))}
    </div>
  );
}
