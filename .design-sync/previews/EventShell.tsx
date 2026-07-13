import { EventShell, PreviewRouter, useAppStore } from "@tomelist/app";

// Full app chrome: ProgressHud + tab nav around an (empty) outlet. Seed a
// mid-event wallet + goal so the HUD bar shows partial progress instead of
// the empty-state hint. Delta/guarded so localStorage persistence across
// capture runs can't drift the numbers.
const E = "2026-03-mogmog-collection";
const s = useAppStore.getState();
s.addTomestones(E, 80 - (s.events[E]?.tomestones ?? 0));
if (s.events[E]?.wishlist["miners-earring"]?.status !== "wanted") {
  s.toggleWishlist(E, "miners-earring");
}

export function AppShell() {
  return (
    <PreviewRouter tab="overview">
      <EventShell />
    </PreviewRouter>
  );
}
