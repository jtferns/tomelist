// design-sync-only module (never imported by the real app). The synth-entry
// barrel includes every src .tsx, so this evaluates inside the preview
// bundle and registers static event data for @/lib/events' non-Vite
// fallback (import.meta.glob doesn't exist under the esbuild IIFE).
// lib/events.ts parses lazily at first accessor call — render time — so
// this module's evaluation order relative to events.ts doesn't matter.
// Lowercase export only: deriveComponentsFromSrc must not see a component.
import mogmogCollection from "../../../data/events/2026-03-mogmog-collection.json";

globalThis.__tomelistEventModules = {
  "2026-03-mogmog-collection": { default: mogmogCollection },
};

export const previewEventIds = Object.keys(globalThis.__tomelistEventModules);
