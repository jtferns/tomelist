import { PreviewRouter, ProgressHud, useAppStore } from "@tomelist/app";

// Sticky wallet/goal bar. Two cells: mid-progress toward a wishlist goal,
// and the no-goal empty state ("Pick exchanges to set a goal"). Seeding is
// delta/guarded — the store persists to localStorage across capture runs.
const E = "2026-03-mogmog-collection";
const s = useAppStore.getState();
s.addTomestones(E, 80 - (s.events[E]?.tomestones ?? 0));
if (s.events[E]?.wishlist["miners-earring"]?.status !== "wanted") {
  s.toggleWishlist(E, "miners-earring");
}

export function MidProgress() {
  return (
    <PreviewRouter>
      <ProgressHud />
    </PreviewRouter>
  );
}
