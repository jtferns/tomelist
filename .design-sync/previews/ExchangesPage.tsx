import { ExchangesPage, PreviewRouter, useAppStore } from "@tomelist/app";

// Exchange list with sort chips and one wanted row (tier chip + steppers +
// Mark exchanged visible). Guarded seeding — the store persists to
// localStorage across capture runs.
const E = "2026-03-mogmog-collection";
const s = useAppStore.getState();
s.addTomestones(E, 80 - (s.events[E]?.tomestones ?? 0));
if (s.events[E]?.wishlist["fat-cat-parasol"]?.status !== "wanted") {
  s.toggleWishlist(E, "fat-cat-parasol");
}

export function Exchanges() {
  return (
    <PreviewRouter tab="exchanges">
      <ExchangesPage />
    </PreviewRouter>
  );
}
