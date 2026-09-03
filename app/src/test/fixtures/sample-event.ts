import type { EventData } from "@tomelist/schema";

/**
 * Synthetic event used only by the test suite (registered in vitest.setup.ts)
 * and by the design-sync preview shim. It is never bundled into the app: it
 * lives here, not under data/events/, so production only ever ships real events.
 *
 * The id, name, and date range are load-bearing for ~20 test files and are kept
 * stable on purpose. Its objectives/exchanges cover every shape the UI needs:
 * all four objective kinds, a repeatable grind, a one-time objective, a
 * non-tradeable exchange, and a spread of costs.
 */
export const sampleEvent = {
  id: "2026-03-mogmog-collection",
  name: "Mogmog Collection (Mar 2026)",
  tomestone: { name: "Irregular Tomestone", icon: "/tomes/2026-03-mogmog-collection.png" },
  starts: "2026-03-31T08:00:00Z",
  ends: "2026-05-01T08:00:00Z",
  endsLabel: "Release of Patch 7.5",
  objectives: [
    {
      id: "obj-moogle-dungeons",
      kind: "standard",
      title: "Complete a moogle-marked dungeon",
      category: "Dungeons",
      points: 10,
      effort: "medium",
      repeatable: true,
    },
    {
      id: "obj-gates",
      kind: "standard",
      title: "Earn 2,000+ points in GATEs",
      category: "GATEs",
      points: 5,
      effort: "quick",
      repeatable: true,
      requirement: "min 2,000 points",
    },
    {
      id: "obj-weekly-random",
      kind: "weekly",
      title: "Weekly objective (randomly assigned)",
      category: "Weekly",
      points: 30,
      effort: "medium",
      repeatable: "weekly",
    },
    {
      id: "obj-minimog-fishing",
      kind: "minimog",
      title: "Minimog: Ocean fishing voyage",
      category: "Ocean Fishing",
      points: 20,
      effort: "long",
      repeatable: "weekly",
    },
    {
      id: "obj-ultimog-msq",
      kind: "ultimog",
      title: "Ultimog: Complete the event quest",
      category: "Quests",
      points: 50,
      effort: "quick",
      repeatable: false,
    },
  ],
  exchanges: [
    { id: "miners-earring", name: "Miner's Earring", cost: 100, type: "Gear" },
    { id: "fat-cat-parasol", name: "Fat Cat Parasol", cost: 50, type: "Fashion", tradeable: false },
    { id: "magicked-prism-bundle", name: "Magicked Prism (bundle)", cost: 1, type: "Other" },
  ],
} satisfies EventData;
