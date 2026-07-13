import { OverviewPage, PreviewRouter, useAppStore } from "@tomelist/app";

// Overview with a seeded wallet + must-tier wishlist entry so the Budget and
// Run-next cards show real verdicts instead of empty-state hints. Guarded
// seeding — the store persists to localStorage across capture runs.
const E = "2026-03-mogmog-collection";
const s = useAppStore.getState();
s.addTomestones(E, 80 - (s.events[E]?.tomestones ?? 0));
if (s.events[E]?.wishlist["miners-earring"]?.status !== "wanted") {
  s.toggleWishlist(E, "miners-earring");
}
if (s.events[E]?.wishlist["miners-earring"]?.tier !== "must") {
  s.setWishlistTier(E, "miners-earring", "must");
}

export function Overview() {
  return (
    <PreviewRouter tab="overview">
      <OverviewPage />
    </PreviewRouter>
  );
}
