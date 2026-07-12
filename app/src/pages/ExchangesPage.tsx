import { useParams } from "@tanstack/react-router";
import { CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getEvent } from "@/lib/events";
import { useEorzeaTooltips } from "@/lib/useEorzeaTooltips";
import { cn } from "@/lib/utils";
import { getWishlistTotal } from "@/lib/wishlist";
import { useAppStore } from "@/store/useAppStore";
import type { Exchange } from "@tomelist/schema";

const TIER_CYCLE = { must: "want", want: "maybe", maybe: "must" } as const;
const TIER_LABEL = { must: "Must", want: "Want", maybe: "Maybe" } as const;
const TIER_VARIANT = { must: "default", want: "secondary", maybe: "outline" } as const;

type SortKey = "default" | "tier" | "cost" | "type";
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "default", label: "Default" },
  { key: "tier", label: "Tier" },
  { key: "cost", label: "Cost" },
  { key: "type", label: "Type" },
];
const TIER_RANK = { must: 0, want: 1, maybe: 2 } as const;

function tierGroupRank(entry: { status: "wanted" | "exchanged"; tier: "must" | "want" | "maybe" } | undefined) {
  if (!entry) return 3;
  if (entry.status === "exchanged") return 4;
  return TIER_RANK[entry.tier];
}

function ExchangeRow({ eventId, item, wallet }: { eventId: string; item: Exchange; wallet: number }) {
  const entry = useAppStore((s) => s.events[eventId]?.wishlist[item.id]);
  const toggleWishlist = useAppStore((s) => s.toggleWishlist);
  const adjustWishlistQuantity = useAppStore((s) => s.adjustWishlistQuantity);
  const setWishlistTier = useAppStore((s) => s.setWishlistTier);
  const markExchanged = useAppStore((s) => s.markExchanged);
  const wanted = entry?.status === "wanted";
  const exchanged = entry?.status === "exchanged";
  const quantity = entry?.quantity ?? 1;
  const insufficient = wanted && item.cost * quantity > wallet;
  const tier = entry?.tier ?? "want";
  const tierLabel = TIER_LABEL[tier];

  const meta = (
    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
      <Badge variant="secondary">{item.cost} tomes</Badge>
      <span>{item.type}</span>
      {item.tradeable ? <Badge variant="outline">tradeable</Badge> : null}
      {item.altSources?.length ? (
        <Badge
          variant="outline"
          data-testid={`alt-${item.id}`}
          title={item.altSources.map((s) => `${s.type}: ${s.text}`).join("\n")}
        >
          also elsewhere
        </Badge>
      ) : null}
      {item.eorzeadbUrl ? (
        <a
          href={item.eorzeadbUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`eorzeadb-${item.id}`}
          className={cn("eorzeadb_link", "relative z-10 underline underline-offset-2")}
          onClick={(e) => e.stopPropagation()}
        >
          db
        </a>
      ) : null}
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
              variant={TIER_VARIANT[tier]}
              size="sm"
              aria-label={`Priority for ${item.name}: ${tierLabel}. Tap to change`}
              data-testid={`tier-${item.id}`}
              onClick={() => setWishlistTier(eventId, item.id, TIER_CYCLE[tier])}
            >
              {tierLabel}
            </Button>
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
  const [sortKey, setSortKey] = useState<SortKey>("default");
  useEorzeaTooltips(Boolean(event?.exchanges.some((e) => e.eorzeadbUrl)));
  if (!event) return <div data-testid="exchanges-page">Unknown event.</div>;
  const wantedTotal = getWishlistTotal(event, wishlist);
  const sortedExchanges = event.exchanges
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      switch (sortKey) {
        case "tier": {
          const diff = tierGroupRank(wishlist?.[a.item.id]) - tierGroupRank(wishlist?.[b.item.id]);
          return diff !== 0 ? diff : a.index - b.index;
        }
        case "cost": {
          const diff = a.item.cost - b.item.cost;
          return diff !== 0 ? diff : a.index - b.index;
        }
        case "type": {
          const diff = a.item.type.localeCompare(b.item.type);
          if (diff !== 0) return diff;
          const costDiff = a.item.cost - b.item.cost;
          return costDiff !== 0 ? costDiff : a.index - b.index;
        }
        default:
          return a.index - b.index;
      }
    })
    .map(({ item }) => item);
  return (
    <div data-testid="exchanges-page" className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Wishlist total:{" "}
        <span data-testid="wanted-total" className="font-bold text-foreground">{wantedTotal}</span>{" "}
        tomes
      </p>
      <div data-testid="sort-options" className="flex flex-wrap items-center gap-1.5">
        {SORT_OPTIONS.map(({ key, label }) => (
          <Button
            key={key}
            size="sm"
            variant={sortKey === key ? "default" : "outline"}
            aria-pressed={sortKey === key}
            data-testid={`sort-${key}`}
            onClick={() => setSortKey(key)}
          >
            {label}
          </Button>
        ))}
      </div>
      {sortedExchanges.map((item) => (
        <ExchangeRow key={item.id} eventId={eventId} item={item} wallet={wallet} />
      ))}
    </div>
  );
}
