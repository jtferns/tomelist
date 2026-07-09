import { describe, expect, it } from "vitest";
import { emptyEventProgress, userStateSchema } from "./state";

describe("userStateSchema", () => {
  it("accepts a minimal state", () => {
    const s = {
      schemaVersion: 1,
      settings: { theme: "dark" },
      events: {},
      updatedAt: "2026-07-09T00:00:00Z",
    };
    expect(userStateSchema.parse(s).schemaVersion).toBe(1);
  });
  it("accepts full event progress", () => {
    const s = {
      schemaVersion: 1,
      settings: { theme: "light" },
      events: {
        "2026-03-mogmog-collection": {
          tomestones: 42,
          completedObjectives: { "obj-x": { count: 3, lastDoneAt: "2026-07-01T00:00:00Z" } },
          minimogPicks: ["obj-a", "obj-b"],
          wishlist: { "fat-cat-parasol": { status: "wanted", tier: "must" } },
        },
      },
      updatedAt: "2026-07-09T00:00:00Z",
    };
    expect(userStateSchema.parse(s).events["2026-03-mogmog-collection"].tomestones).toBe(42);
  });
  it("rejects invalid wishlist tier", () => {
    const s = {
      schemaVersion: 1,
      settings: { theme: "dark" },
      events: { e: { tomestones: 0, completedObjectives: {}, minimogPicks: [], wishlist: { x: { status: "wanted", tier: "top" } } } },
      updatedAt: "2026-07-09T00:00:00Z",
    };
    expect(() => userStateSchema.parse(s)).toThrow();
  });
  it("emptyEventProgress returns zeroed progress", () => {
    expect(emptyEventProgress()).toEqual({ tomestones: 0, completedObjectives: {}, minimogPicks: [], wishlist: {} });
  });
});
