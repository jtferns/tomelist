import { RunNext, useAppStore } from "@tomelist/app";

// Run-next card: top-3 ranked objectives + the runs-to-Must-goal hint.
// Guarded seeding — the store persists to localStorage across capture runs.
const E = "2026-03-mogmog-collection";
const s = useAppStore.getState();
s.addTomestones(E, 40 - (s.events[E]?.tomestones ?? 0));
if (s.events[E]?.wishlist["miners-earring"]?.status !== "wanted") {
  s.toggleWishlist(E, "miners-earring");
}
if (s.events[E]?.wishlist["miners-earring"]?.tier !== "must") {
  s.setWishlistTier(E, "miners-earring", "must");
}

export function TopThree() {
  return <RunNext eventId={E} />;
}
