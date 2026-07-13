import { PlannerPage, PreviewRouter, useAppStore } from "@tomelist/app";

// Weekly planner: pace card, minimog picks, weeklies. Seed a must-tier goal
// so the pace card has a target. Guarded seeding — the store persists to
// localStorage across capture runs.
const E = "2026-03-mogmog-collection";
const s = useAppStore.getState();
s.addTomestones(E, 40 - (s.events[E]?.tomestones ?? 0));
if (s.events[E]?.wishlist["miners-earring"]?.status !== "wanted") {
  s.toggleWishlist(E, "miners-earring");
}
if (s.events[E]?.wishlist["miners-earring"]?.tier !== "must") {
  s.setWishlistTier(E, "miners-earring", "must");
}

export function Planner() {
  return (
    <PreviewRouter tab="planner">
      <PlannerPage />
    </PreviewRouter>
  );
}
