import { BudgetSummary, useAppStore } from "@tomelist/app";

// Budget card: tier verdict rows + pace line, and the empty-wishlist hint.
// Guarded seeding — the store persists to localStorage across capture runs.
const E = "2026-03-mogmog-collection";
const s = useAppStore.getState();
s.addTomestones(E, 80 - (s.events[E]?.tomestones ?? 0));
if (s.events[E]?.wishlist["miners-earring"]?.status !== "wanted") {
  s.toggleWishlist(E, "miners-earring");
}
if (s.events[E]?.wishlist["miners-earring"]?.tier !== "must") {
  s.setWishlistTier(E, "miners-earring", "must");
}
if (s.events[E]?.wishlist["fat-cat-parasol"]?.status !== "wanted") {
  s.toggleWishlist(E, "fat-cat-parasol");
}

// Single cell: the empty-wishlist hint state would need a second registered
// preview event (getEvent must resolve), not worth the data duplication.
export function TierVerdicts() {
  return <BudgetSummary eventId={E} />;
}
