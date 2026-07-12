import { describe, expect, it } from "vitest";
import type { EventData, Exchange, Objective } from "@tomelist/schema";
import { emptyEventProgress, type EventProgress } from "@tomelist/schema";
import { budgetReport, EFFORT_WEIGHTS } from "./optimizer";

function objective(overrides: Partial<Objective> & Pick<Objective, "id">): Objective {
  return {
    kind: "standard",
    title: overrides.id,
    category: "cat",
    points: 10,
    effort: "quick",
    repeatable: false,
    ...overrides,
  };
}

function exchange(overrides: Partial<Exchange> & Pick<Exchange, "id">): Exchange {
  return {
    name: overrides.id,
    cost: 100,
    type: "item",
    ...overrides,
  };
}

function event(overrides: Partial<EventData> = {}): EventData {
  return {
    id: "2026-01-test-event",
    name: "Test Event",
    tomestone: { name: "Test Tomestone" },
    starts: "2026-01-01T00:00:00Z",
    ends: "2026-02-01T00:00:00Z",
    objectives: [objective({ id: "obj-1" })],
    exchanges: [exchange({ id: "ex-1" })],
    ...overrides,
  };
}

function progress(overrides: Partial<EventProgress> = {}): EventProgress {
  return { ...emptyEventProgress(), ...overrides };
}

const NOW = new Date("2026-01-15T00:00:00Z");

describe("EFFORT_WEIGHTS", () => {
  it("has the expected values", () => {
    expect(EFFORT_WEIGHTS).toEqual({ quick: 1, medium: 2, long: 4 });
  });
});

describe("budgetReport - empty wishlist", () => {
  it("all tiers cost 0, affordable now, no weeks needed", () => {
    const report = budgetReport(event(), progress(), NOW);
    for (const tier of report.tiers) {
      expect(tier.cumulativeCost).toBe(0);
      expect(tier.affordableNow).toBe(true);
      expect(tier.weeksNeeded).toBe(0);
    }
  });
});

describe("budgetReport - cumulative tier math", () => {
  it("sums must/want/maybe cumulatively, respects quantities, excludes exchanged and unknown ids", () => {
    const ev = event({
      exchanges: [
        exchange({ id: "must-item", cost: 10 }),
        exchange({ id: "want-item", cost: 20 }),
        exchange({ id: "maybe-item", cost: 5 }),
        exchange({ id: "exchanged-item", cost: 1000 }),
      ],
    });
    const p = progress({
      tomestones: 0,
      wishlist: {
        "must-item": { status: "wanted", tier: "must", quantity: 2 }, // 20
        "want-item": { status: "wanted", tier: "want", quantity: 1 }, // 20
        "maybe-item": { status: "wanted", tier: "maybe", quantity: 3 }, // 15
        "exchanged-item": { status: "exchanged", tier: "must", quantity: 1 }, // excluded
        "unknown-item": { status: "wanted", tier: "want", quantity: 1 }, // ignored, no matching exchange
      },
    });
    const report = budgetReport(ev, p, NOW);
    const [must, want, maybe] = report.tiers;
    expect(must.cumulativeCost).toBe(20);
    expect(want.cumulativeCost).toBe(40); // 20 + 20
    expect(maybe.cumulativeCost).toBe(55); // 40 + 15
  });
});

describe("budgetReport - oneTimeRemaining", () => {
  it("counts non-repeatable, non-completed objectives, including ultimog; excludes completed", () => {
    const ev = event({
      objectives: [
        objective({ id: "std-1", repeatable: false, points: 10 }),
        objective({ id: "std-2-done", repeatable: false, points: 15 }),
        objective({ id: "ultimog-1", kind: "ultimog", repeatable: false, points: 50 }),
        objective({ id: "ultimog-2-done", kind: "ultimog", repeatable: false, points: 50 }),
      ],
    });
    const p = progress({
      completedObjectives: {
        "std-2-done": { count: 1, lastDoneAt: NOW.toISOString() },
        "ultimog-2-done": { count: 1, lastDoneAt: NOW.toISOString() },
      },
    });
    const report = budgetReport(ev, p, NOW);
    expect(report.oneTimeRemaining).toBe(60); // 10 + 50
  });

  it("excludes minimogs even when flagged repeatable: false — they earn via weeklyRate only", () => {
    const ev = event({
      objectives: [
        objective({ id: "std-1", repeatable: false, points: 10 }),
        objective({ id: "mini-1", kind: "minimog", repeatable: false, points: 40 }),
      ],
    });
    const report = budgetReport(ev, progress({}), NOW);
    expect(report.oneTimeRemaining).toBe(10); // mini-1 not double-counted here
    expect(report.weeklyRate).toBe(40); // it still earns weekly via top-2
  });
});

describe("budgetReport - weeklyRate", () => {
  it("sums weekly objectives plus top-2 of three minimogs, without double counting a weekly-flagged minimog", () => {
    const ev = event({
      objectives: [
        objective({ id: "weekly-1", kind: "standard", repeatable: "weekly", points: 30 }),
        objective({ id: "mini-1", kind: "minimog", repeatable: false, points: 40 }),
        objective({ id: "mini-2", kind: "minimog", repeatable: false, points: 25 }),
        objective({ id: "mini-3-weekly", kind: "minimog", repeatable: "weekly", points: 60 }),
      ],
    });
    const p = progress();
    const report = budgetReport(ev, p, NOW);
    // weekly-1 (30) + top-2 minimogs by points: mini-3-weekly(60) + mini-1(40) = 100; mini-2 excluded
    expect(report.weeklyRate).toBe(130);
  });

  it("takes what's there if fewer than 2 minimog objectives exist", () => {
    const ev = event({
      objectives: [
        objective({ id: "weekly-1", kind: "standard", repeatable: "weekly", points: 30 }),
        objective({ id: "mini-1", kind: "minimog", repeatable: false, points: 40 }),
      ],
    });
    const report = budgetReport(ev, progress(), NOW);
    expect(report.weeklyRate).toBe(70);
  });
});

describe("budgetReport - unbounded repeatables excluded", () => {
  it("excludes repeatable === true objectives from oneTimeRemaining and weeklyRate", () => {
    const ev = event({
      objectives: [
        objective({ id: "grind-1", kind: "standard", repeatable: true, points: 9999 }),
        objective({ id: "mini-grind", kind: "minimog", repeatable: true, points: 9999 }),
      ],
    });
    const report = budgetReport(ev, progress(), NOW);
    expect(report.oneTimeRemaining).toBe(0);
    expect(report.weeklyRate).toBe(0);
  });
});

describe("budgetReport - weeksLeft / projectedIncome / affordableByEnd", () => {
  it("is null for an open-ended event but weeksNeeded is still computed", () => {
    const ev = event({
      ends: null,
      objectives: [objective({ id: "weekly-1", kind: "standard", repeatable: "weekly", points: 40 })],
      exchanges: [exchange({ id: "ex-1", cost: 1000 })],
    });
    const p = progress({
      tomestones: 0,
      wishlist: { "ex-1": { status: "wanted", tier: "must", quantity: 1 } },
    });
    const report = budgetReport(ev, p, NOW);
    expect(report.weeksLeft).toBeNull();
    expect(report.projectedIncome).toBeNull();
    const must = report.tiers[0];
    expect(must.affordableByEnd).toBeNull();
    // weeklyRate > 0 so weeksNeeded is still computable from wallet/oneTime/weeklyRate alone
    expect(must.weeksNeeded).not.toBeNull();
  });

  it("floors weeksLeft at 0 for a past-end event", () => {
    const ev = event({ ends: "2026-01-01T00:00:00Z" });
    const report = budgetReport(ev, progress(), NOW);
    expect(report.weeksLeft).toBe(0);
  });
});

describe("budgetReport - weeksNeeded exact arithmetic", () => {
  it("computes ceil(shortfall / weeklyRate) exactly", () => {
    const ev = event({
      exchanges: [exchange({ id: "ex-1", cost: 100 })],
      objectives: [objective({ id: "weekly-1", kind: "standard", repeatable: "weekly", points: 30 })],
    });
    const p = progress({
      tomestones: 10,
      wishlist: { "ex-1": { status: "wanted", tier: "must", quantity: 1 } },
    });
    // shortfall = 100 - 10 - 0(oneTime) = 90; weeklyRate 30 => ceil(90/30) = 3
    const report = budgetReport(ev, p, NOW);
    expect(report.tiers[0].weeksNeeded).toBe(3);
  });

  it("is null when weeklyRate is 0 and shortfall > 0", () => {
    const ev = event({
      exchanges: [exchange({ id: "ex-1", cost: 100 })],
      objectives: [],
    });
    const p = progress({
      tomestones: 10,
      wishlist: { "ex-1": { status: "wanted", tier: "must", quantity: 1 } },
    });
    const report = budgetReport(ev, p, NOW);
    expect(report.tiers[0].weeksNeeded).toBeNull();
  });
});

describe("budgetReport - purity", () => {
  it("does not mutate the progress argument", () => {
    const ev = event();
    const p = progress({
      tomestones: 5,
      wishlist: { "ex-1": { status: "wanted", tier: "must", quantity: 2 } },
    });
    const before = JSON.parse(JSON.stringify(p));
    budgetReport(ev, p, NOW);
    expect(p).toEqual(before);
  });
});
