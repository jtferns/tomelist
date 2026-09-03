// design-sync-only module (never imported by the real app). The synth-entry
// barrel includes every src .tsx, so this evaluates inside the preview
// bundle and registers static event data for @/lib/events' non-Vite
// fallback (import.meta.glob doesn't exist under the esbuild IIFE).
// lib/events.ts parses lazily at first accessor call — render time — so
// this module's evaluation order relative to events.ts doesn't matter.
// Lowercase export only: deriveComponentsFromSrc must not see a component.
import { sampleEvent } from "@/test/fixtures/sample-event";

globalThis.__tomelistEventModules = {
  [sampleEvent.id]: { default: sampleEvent },
};

export const previewEventIds = Object.keys(globalThis.__tomelistEventModules);
