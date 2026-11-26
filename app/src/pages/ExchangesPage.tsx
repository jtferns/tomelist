import { useParams } from "@tanstack/react-router";
import { UnknownEvent } from "@/components/UnknownEvent";
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
  Handshake,
  Check,
} from "lucide-react";
import { useState } from "react";
import { AnimatedCount } from "@/components/ui/animated-count";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { FramedCard } from "@/components/ui/framed-card";
import { SectionHeader } from "@/components/ui/section-header";
import { getEvent } from "@/lib/events";
import { tokenCount, tomeCount } from "@/lib/format";
import { useEorzeaTooltips } from "@/lib/useEorzeaTooltips";
import { cn } from "@/lib/utils";
import { getWishlistTokenTotal, getWishlistTotal } from "@/lib/wishlist";
import { useAppStore } from "@/store/useAppStore";
import { useCollectStore } from "@/store/useCollectStore";
import { ownedKey } from "@/lib/collect";
import { useUndoToast } from "@/components/UndoToast";
import { AskFriendPanel } from "@/components/AskFriendPanel";
import type { EventData, Exchange, WishlistEntry } from "@tomelist/schema";

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

// Wanted tiers first, then items a friend is covering, then unlisted, then exchanged.
function tierGroupRank(entry: WishlistEntry | undefined) {
  if (!entry) return 4;
  if (entry.status === "exchanged") return 5;
  if (entry.status === "covering") return 3;
  return TIER_RANK[entry.tier];
}

function ItemHeader({
  item,
  owned,
  className,
  children,
}: {
  item: Exchange;
  owned: boolean;
  className: string;
  children?: React.ReactNode;
}) {
  const Glyph = TYPE_GLYPH[item.type] ?? Package;
  return (
    <div className={className}>
      <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-muted text-gold-soft">
        {item.icon ? (
          <img src={item.icon} alt="" className="size-full" />
        ) : (
          <Glyph aria-hidden="true" data-testid={`glyph-${item.id}`} className="size-6" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-medium leading-snug">{item.name}</p>
        <ItemMeta item={item} owned={owned} />
      </div>
      {children}
    </div>
  );
}

function ItemMeta({ item, owned }: { item: Exchange; owned: boolean }) {
  const tokenCost = item.tokenCost ?? 0;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <Badge variant="tome">
        {tomeCount(item.cost)}
        {tokenCost > 0 ? ` + ${tokenCount(tokenCost)}` : null}
      </Badge>
      <span>{item.type}</span>
      {owned ? (
        <Badge
          variant="gold-outline"
          data-testid={`owned-${item.id}`}
          title="Your character has this, per FFXIV Collect"
        >
          <Check aria-hidden="true" className="size-3" />
          Owned
        </Badge>
      ) : null}
      {item.tradeable ? (
        <Badge variant="gold-outline" data-testid={`tradeable-${item.id}`}>
          <Handshake aria-hidden="true" className="size-3" />
          Tradeable
        </Badge>
      ) : null}
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
          className="eorzeadb_link underline underline-offset-2 pointer-coarse:-mx-2 pointer-coarse:-my-3.5 pointer-coarse:inline-block pointer-coarse:px-2 pointer-coarse:py-3.5"
        >
          db
        </a>
      ) : null}
    </div>
  );
}

function shortText(short: number, tokensShort: number): string {
  if (short > 0 && tokensShort > 0) return `${short} + ${tokenCount(tokensShort)} short`;
  if (tokensShort > 0) return `${tokenCount(tokensShort)} short`;
  return `${short} short`;
}

function shortfall(item: Exchange, quantity: number, wallet: number, tokenBalance: number) {
  return {
    short: Math.max(0, item.cost * quantity - wallet),
    tokensShort: Math.max(0, (item.tokenCost ?? 0) * quantity - tokenBalance),
  };
}

export function ExchangeRow({ eventId, item, wallet }: { eventId: string; item: Exchange; wallet: number }) {
  const entry = useAppStore((s) => s.events[eventId]?.wishlist[item.id]);
  const tokenBalance = useAppStore((s) => s.events[eventId]?.tokens ?? 0);
  const owned = useCollectStore((s) => Boolean(item.collect && s.imported?.owned.includes(ownedKey(item.collect))));
  const { short, tokensShort } = shortfall(item, entry?.quantity ?? 1, wallet, tokenBalance);
  const isShort = short > 0 || tokensShort > 0;
  const card = cardState(entry, owned, isShort);
  return (
    <FramedCard
      data-testid={`exchange-${item.id}`}
      data-insufficient={card.insufficient ? "true" : undefined}
      data-owned={card.owned ? "true" : undefined}
      className={card.className}
    >
      {entry?.status === "exchanged" ? (
        <ItemHeader item={item} owned={owned} className="flex items-center gap-3 p-3">
          <Badge variant="gold-outline">Exchanged</Badge>
        </ItemHeader>
      ) : entry?.status === "covering" ? (
        <CoveringBody eventId={eventId} item={item} owned={owned} quantity={entry.quantity} />
      ) : (
        <OpenBody
          eventId={eventId}
          item={item}
          owned={owned}
          entry={entry}
          shortNote={isShort ? <ShortNote itemId={item.id} short={short} tokensShort={tokensShort} /> : null}
          canExchangeOne={wallet >= item.cost && tokenBalance >= (item.tokenCost ?? 0)}
        />
      )}
    </FramedCard>
  );
}

// Card styling and data flags by wishlist status; exchanged and covered cards drop the flags.
function cardState(entry: WishlistEntry | undefined, owned: boolean, short: boolean) {
  if (entry?.status === "exchanged") return { className: "list-enter opacity-70", insufficient: false, owned: false };
  if (entry?.status === "covering") return { className: "list-enter border-gold", insufficient: false, owned: false };
  const wanted = entry?.status === "wanted";
  return {
    className: cn("list-enter", wanted && "border-gold", owned && !wanted && "opacity-70"),
    insufficient: wanted && short,
    owned,
  };
}

function ShortNote({ itemId, short, tokensShort }: { itemId: string; short: number; tokensShort: number }) {
  return (
    <span data-testid={`short-${itemId}`} className="ml-auto text-sm text-muted-foreground">
      {shortText(short, tokensShort)}
    </span>
  );
}

function CoveringBody({
  eventId,
  item,
  owned,
  quantity,
}: {
  eventId: string;
  item: Exchange;
  owned: boolean;
  quantity: number;
}) {
  const setCovering = useAppStore((s) => s.setCovering);
  const markReceived = useAppStore((s) => s.markReceived);
  const undoReceived = useAppStore((s) => s.undoReceived);
  const showToast = useUndoToast((s) => s.show);
  return (
    <>
      <ItemHeader item={item} owned={owned} className="flex items-center gap-3 px-3 pt-3" />
      <div className="flex flex-wrap items-center gap-1 px-3 pt-2 pb-3">
        <Badge variant="tome" data-testid={`covering-${item.id}`}>
          Friend covering{quantity > 1 ? ` ×${quantity}` : ""}
        </Badge>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => setCovering(eventId, item.id, false)}>
          Not covered
        </Button>
        <Button
          variant="action-soft"
          size="sm"
          onClick={() => {
            markReceived(eventId, item.id);
            showToast(`Received ${item.name} from a friend`, () => undoReceived(eventId, item.id));
          }}
        >
          Received
        </Button>
      </div>
    </>
  );
}

function OpenBody({
  eventId,
  item,
  owned,
  entry,
  shortNote,
  canExchangeOne,
}: {
  eventId: string;
  item: Exchange;
  owned: boolean;
  entry: WishlistEntry | undefined;
  shortNote: React.ReactNode;
  canExchangeOne: boolean;
}) {
  const toggleWishlist = useAppStore((s) => s.toggleWishlist);
  const showToast = useUndoToast((s) => s.show);
  const wanted = entry?.status === "wanted";
  return (
    <>
      <ItemHeader item={item} owned={owned} className="flex items-center gap-3 px-3 pt-3" />
      <div className="flex flex-wrap items-center gap-1 px-3 pt-2 pb-3">
        <Button
          variant="outline"
          size="sm"
          aria-pressed={wanted}
          aria-label={`Want ${item.name}`}
          onClick={() => {
            toggleWishlist(eventId, item.id);
            if (!entry) showToast(`Added ${item.name} as ${TIER_LABEL.want}`, () => toggleWishlist(eventId, item.id));
          }}
          className={cn(wanted && "border-gold text-gold")}
        >
          {wanted ? (
            <>
              <Check aria-hidden="true" />
              Wanted
            </>
          ) : (
            "Want"
          )}
        </Button>
        {wanted ? (
          <WantedControls
            eventId={eventId}
            item={item}
            entry={entry}
            shortNote={shortNote}
            canExchangeOne={canExchangeOne}
          />
        ) : (
          shortNote
        )}
      </div>
    </>
  );
}

function WantedControls({
  eventId,
  item,
  entry,
  shortNote,
  canExchangeOne,
}: {
  eventId: string;
  item: Exchange;
  entry: WishlistEntry;
  shortNote: React.ReactNode;
  canExchangeOne: boolean;
}) {
  const adjustWishlistQuantity = useAppStore((s) => s.adjustWishlistQuantity);
  const setWishlistTier = useAppStore((s) => s.setWishlistTier);
  const setCovering = useAppStore((s) => s.setCovering);
  const markExchanged = useAppStore((s) => s.markExchanged);
  const undoExchanged = useAppStore((s) => s.undoExchanged);
  const showToast = useUndoToast((s) => s.show);
  const { tier, quantity } = entry;
  const tierLabel = TIER_LABEL[tier];
  const tokenCost = item.tokenCost ?? 0;
  const logExchange = () => {
    const granted = item.grantsTokens ?? 0;
    markExchanged(eventId, item.id, item.cost, tokenCost, granted);
    const spent = tokenCost > 0 ? `${tomeCount(item.cost)}, −${tokenCount(tokenCost)}` : tomeCount(item.cost);
    const gained = granted > 0 ? `, +${tokenCount(granted)}` : "";
    showToast(`Exchanged ${item.name}, −${spent}${gained}`, () =>
      undoExchanged(eventId, item.id, item.cost, tokenCost, granted),
    );
  };
  return (
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
      {item.tradeable ? (
        <Button variant="outline" size="sm" onClick={() => setCovering(eventId, item.id, true)}>
          Friend's covering this
        </Button>
      ) : null}
      {shortNote}
      <Button
        variant="action-soft"
        size="sm"
        className={cn(!shortNote && "ml-auto")}
        disabled={!canExchangeOne}
        onClick={logExchange}
      >
        Log exchange
      </Button>
    </>
  );
}

type Indexed = { item: Exchange; index: number };

function matchesFilter(item: Exchange, entry: WishlistEntry | undefined, needle: string, typeFilter: string): boolean {
  if (needle && !item.name.toLowerCase().includes(needle)) return false;
  const status = entry?.status;
  if (typeFilter === "wanted") return status === "wanted" || status === "covering";
  if (typeFilter === "tradeable") return item.tradeable === true;
  return typeFilter === "all" || item.type === typeFilter;
}

function compareFor(sortKey: SortKey, wishlist: Record<string, WishlistEntry> | undefined) {
  const primary: Record<SortKey, (a: Exchange, b: Exchange) => number> = {
    default: () => 0,
    tier: (a, b) => tierGroupRank(wishlist?.[a.id]) - tierGroupRank(wishlist?.[b.id]),
    cost: (a, b) => a.cost - b.cost,
    type: (a, b) => a.type.localeCompare(b.type) || a.cost - b.cost,
  };
  return (a: Indexed, b: Indexed) => primary[sortKey](a.item, b.item) || a.index - b.index;
}

function visibleExchanges(
  exchanges: Exchange[],
  wishlist: Record<string, WishlistEntry> | undefined,
  query: string,
  typeFilter: string,
  sortKey: SortKey,
): Exchange[] {
  const needle = query.trim().toLowerCase();
  return exchanges
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => matchesFilter(item, wishlist?.[item.id], needle, typeFilter))
    .sort(compareFor(sortKey, wishlist))
    .map(({ item }) => item);
}

function filterOptions(exchanges: Exchange[], hasTradeable: boolean) {
  const types = [...new Set(exchanges.map((e) => e.type))].sort();
  return [
    { key: "all", label: "All" },
    { key: "wanted", label: "Wanted" },
    ...(hasTradeable ? [{ key: "tradeable", label: "Tradeable" }] : []),
    ...types.map((t) => ({ key: t, label: t })),
  ];
}

function WishlistTotal({ wantedTotal, wantedTokenTotal }: { wantedTotal: number; wantedTokenTotal: number }) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", wantedTokenTotal > 0 ? "min-w-0 text-right" : "whitespace-nowrap")}
    >
      Wishlist total{" "}
      <span className="whitespace-nowrap">
        <AnimatedCount
          data-testid="wanted-total"
          value={wantedTotal}
          format={(n) => n.toLocaleString()}
          className="font-bold text-gold tabular-nums"
        />{" "}
        tomes
      </span>
      {wantedTokenTotal > 0 ? (
        <span data-testid="wanted-token-total" className="whitespace-nowrap">
          {" + "}
          <span className="font-bold text-gold tabular-nums">{wantedTokenTotal}</span>{" "}
          {wantedTokenTotal === 1 ? "token" : "tokens"}
        </span>
      ) : null}
    </p>
  );
}

function AskFriendToggle({
  event,
  wishlist,
}: {
  event: EventData;
  wishlist: Record<string, WishlistEntry> | undefined;
}) {
  const [askOpen, setAskOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        aria-expanded={askOpen}
        aria-controls="ask-friend-panel"
        onClick={() => setAskOpen((open) => !open)}
      >
        <Handshake aria-hidden="true" />
        {askOpen ? "Hide ask-a-friend list" : "Ask a friend"}
      </Button>
      {askOpen ? <AskFriendPanel event={event} wishlist={wishlist} /> : null}
    </>
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
  if (!event) return <UnknownEvent testId="exchanges-page" />;
  const hasTradeable = event.exchanges.some((e) => e.tradeable);
  const sortedExchanges = visibleExchanges(event.exchanges, wishlist, query, typeFilter, sortKey);
  const filters = filterOptions(event.exchanges, hasTradeable);
  return (
    <div data-testid="exchanges-page" className="flex flex-col gap-3">
      <SectionHeader title="Exchanges">
        <WishlistTotal
          wantedTotal={getWishlistTotal(event, wishlist)}
          wantedTokenTotal={event.token ? getWishlistTokenTotal(event, wishlist) : 0}
        />
      </SectionHeader>
      {hasTradeable ? <AskFriendToggle event={event} wishlist={wishlist} /> : null}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search ${event.exchanges.length} items`}
        aria-label="Search items"
        className="h-10 w-full rounded-md border border-input bg-surface-2 pointer-coarse:h-11 px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      <div
        data-testid="type-filter"
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-32px),transparent)]"
      >
        {filters.map(({ key, label }) => (
          <Chip key={key} active={typeFilter === key} onClick={() => setTypeFilter(key)}>
            {label}
          </Chip>
        ))}
      </div>
      <div data-testid="sort-options" className="flex flex-wrap items-center gap-1.5">
        {SORT_OPTIONS.map(({ key, label }) => (
          <Chip key={key} active={sortKey === key} data-testid={`sort-${key}`} onClick={() => setSortKey(key)}>
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
