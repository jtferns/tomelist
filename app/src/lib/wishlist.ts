import type { EventData, EventProgress } from "@tomelist/schema";

export function getWishlistTotal(
  event: EventData,
  wishlist: EventProgress["wishlist"] | undefined
): number {
  if (!wishlist) return 0;
  return event.exchanges.reduce((sum, e) => {
    const entry = wishlist[e.id];
    return entry?.status === "wanted" ? sum + e.cost * entry.quantity : sum;
  }, 0);
}

export function getWishlistTokenTotal(
  event: EventData,
  wishlist: EventProgress["wishlist"] | undefined
): number {
  if (!wishlist) return 0;
  return event.exchanges.reduce((sum, e) => {
    const entry = wishlist[e.id];
    return entry?.status === "wanted" && e.tokenCost ? sum + e.tokenCost * entry.quantity : sum;
  }, 0);
}
