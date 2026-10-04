import { useParams } from "@tanstack/react-router";
import {
  BookOpen,
  Cat,
  Gem,
  Guitar,
  HardHat,
  Layers,
  Map as MapIcon,
  Music,
  Package,
  Rabbit,
  Scissors,
  Shield,
  Shirt,
  Sofa,
  Sparkles,
  Spade,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { AnimatedCount } from "@/components/ui/animated-count";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { FramedCard } from "@/components/ui/framed-card";
import { SectionHeader } from "@/components/ui/section-header";
import { getEvent } from "@/lib/events";
import { useEorzeaTooltips } from "@/lib/useEorzeaTooltips";
import { cn } from "@/lib/utils";
import { getWishlistTotal } from "@/lib/wishlist";
import { useAppStore } from "@/store/useAppStore";
import type { Exchange } from "@tomelist/schema";

const TYPE_GLYPH: Record<string, LucideIcon> = {
  Mount: Rabbit,
  Minion: Cat,
  Armor: Shirt,
  "Head Gear": HardHat,
  Accessory: Gem,
  Furnishing: Sofa,
  Book: BookOpen,
  Map: MapIcon,
  Music: Music,
  Instrument: Guitar,
  "Mount Equipment": Shield,
  Collectible: Layers,
  Hairstyle: Scissors,
  Cosmetic: Sparkles,
  Item: Spade,
};

const TIER_CYCLE = { must: "want", want: "maybe", maybe: "must" } as const;
const TIER_LABEL = { must: "Must", want: "Nice", maybe: "Maybe" } as const;
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

export function ExchangeRow({ eventId, item, wallet }: { eventId: string; item: Exchange; wallet: number }) {
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

  const Glyph = TYPE_GLYPH[item.type] ?? Package;
  const icon = (
    <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-muted text-gold-soft">
      {item.icon ? (
        <img src={item.icon} alt="" className="size-full" />
      ) : (
        <Glyph aria-hidden="true" data-testid={`glyph-${item.id}`} className="size-6" />
      )}
    </div>
  );
  const short = item.cost * quantity - wallet;
  const shortNote =
    short > 0 ? (
      <span data-testid={`short-${item.id}`} className="ml-auto text-sm text-muted-foreground">
        {short} short
      </span>
    ) : null;

  const meta = (
    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
      <Badge variant="tome">{item.cost} tomes</Badge>
      <span>{item.type}</span>
      {item.tradeable ? <Badge variant="gold-outline">tradeable</Badge> : null}
      {item.altSources?.length ? (
        <Badge
          variant="gold-outline"
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
          className="eorzeadb_link underline underline-offset-2"
        >
          db
        </a>
      ) : null}
    </div>
  );

  if (exchanged) {
    return (
      <FramedCard data-testid={`exchange-${item.id}`} className="list-enter opacity-70">
        <div className="flex items-center gap-3 p-3">
          {icon}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 font-medium leading-snug">{item.name}</p>
            {meta}
          </div>
          <Badge variant="gold-outline">Exchanged</Badge>
        </div>
      </FramedCard>
    );
  }

  return (
    <FramedCard
      data-testid={`exchange-${item.id}`}
      data-insufficient={insufficient ? "true" : undefined}
      className={cn("list-enter", wanted && "border-gold")}
    >
      <div className="flex items-center gap-3 px-3 pt-3">
        {icon}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-medium leading-snug">{item.name}</p>
          {meta}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 px-3 pt-2 pb-3">
        <Button
          variant="outline"
          size="sm"
          aria-pressed={wanted}
          aria-label={`Want ${item.name}`}
          onClick={() => toggleWishlist(eventId, item.id)}
          className={cn(wanted && "border-gold text-gold")}
        >
          {wanted ? "✓ Wanted" : "Want"}
        </Button>
        {wanted ? (
          <>
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
            {shortNote}
            <Button
              variant="action"
              size="sm"
              className={cn(short <= 0 && "ml-auto")}
              disabled={wallet < item.cost}
              onClick={() => markExchanged(eventId, item.id, item.cost)}
            >
              Mark exchanged
            </Button>
          </>
        ) : (
          shortNote
        )}
      </div>
    </FramedCard>
  );
}

export function ExchangesPage() {
  const { eventId } = useParams({ from: "/$eventId" });
  const event = getEvent(eventId);
  const wallet = useAppStore((s) => s.events[eventId]?.tomestones ?? 0);
  const wishlist = useAppStore((s) => s.events[eventId]?.wishlist);
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  useEorzeaTooltips(Boolean(event?.exchanges.some((e) => e.eorzeadbUrl)));
  if (!event) return <div data-testid="exchanges-page">Unknown event.</div>;
  const wantedTotal = getWishlistTotal(event, wishlist);
  const types = [...new Set(event.exchanges.map((e) => e.type))].sort();
  const needle = query.trim().toLowerCase();
  const sortedExchanges = event.exchanges
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      if (needle && !item.name.toLowerCase().includes(needle)) return false;
      if (typeFilter === "wanted") return wishlist?.[item.id]?.status === "wanted";
      return typeFilter === "all" || item.type === typeFilter;
    })
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
      <SectionHeader title="Exchanges">
        <p className="text-sm whitespace-nowrap text-muted-foreground">
          Wishlist total{" "}
          <AnimatedCount
            data-testid="wanted-total"
            value={wantedTotal}
            format={(n) => n.toLocaleString()}
            className="font-bold text-gold tabular-nums"
          />{" "}
          tomes
        </p>
      </SectionHeader>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search ${event.exchanges.length} items`}
        aria-label="Search items"
        className="h-10 w-full rounded-md border border-input bg-surface-2 px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      <div
        data-testid="type-filter"
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
      >
        {[
          { key: "all", label: "All" },
          { key: "wanted", label: "Wanted" },
          ...types.map((t) => ({ key: t, label: t })),
        ].map(({ key, label }) => (
          <Chip key={key} active={typeFilter === key} onClick={() => setTypeFilter(key)}>
            {label}
          </Chip>
        ))}
      </div>
      <div data-testid="sort-options" className="flex flex-wrap items-center gap-1.5">
        {SORT_OPTIONS.map(({ key, label }) => (
          <Chip
            key={key}
            active={sortKey === key}
            data-testid={`sort-${key}`}
            onClick={() => setSortKey(key)}
          >
            {label}
          </Chip>
        ))}
      </div>
      {/* Re-key on sort or filter so every row remounts and replays the list-enter fade. */}
      <div key={`${sortKey}:${typeFilter}`} className="grid gap-3 md:grid-cols-2">
        {sortedExchanges.map((item) => (
          <ExchangeRow key={item.id} eventId={eventId} item={item} wallet={wallet} />
        ))}
      </div>
      {sortedExchanges.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No items match. Try another search or pick All.
        </p>
      ) : null}
    </div>
  );
}
