import { describe, expect, it } from "vitest";
import { eventSchema, manifestSchema } from "./event";

const validEvent = {
  id: "2026-03-mogmog-collection",
  name: "Mogmog Collection",
  tomestone: { name: "Irregular Tomestone" },
  starts: "2026-03-31T08:00:00Z",
  ends: null,
  endsLabel: "Release of Patch 7.5",
  objectives: [
    {
      id: "obj-sample-dungeon",
      kind: "standard",
      title: "Sample Dungeon",
      category: "Dungeons",
      points: 10,
      effort: "quick",
      repeatable: true,
    },
  ],
  exchanges: [
    { id: "fat-cat-parasol", name: "Fat Cat Parasol", cost: 50, type: "Fashion" },
  ],
};

describe("eventSchema", () => {
  it("accepts a valid event", () => {
    expect(eventSchema.parse(validEvent).id).toBe("2026-03-mogmog-collection");
  });
  it("rejects unknown objective kind", () => {
    const bad = structuredClone(validEvent);
    bad.objectives[0].kind = "bogus";
    expect(() => eventSchema.parse(bad)).toThrow();
  });
  it("rejects negative cost", () => {
    const bad = structuredClone(validEvent);
    bad.exchanges[0].cost = -1;
    expect(() => eventSchema.parse(bad)).toThrow();
  });
  it("accepts repeatable weekly literal", () => {
    const ok = structuredClone(validEvent) as any;
    ok.objectives[0].repeatable = "weekly";
    expect(eventSchema.parse(ok).objectives[0].repeatable).toBe("weekly");
  });
});

describe("manifestSchema", () => {
  it("accepts a manifest", () => {
    const m = { events: [{ id: "x", name: "X", starts: "2026-03-31T08:00:00Z", ends: null }] };
    expect(manifestSchema.parse(m).events).toHaveLength(1);
  });
});
