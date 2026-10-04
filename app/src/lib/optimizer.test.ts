import { describe, expect, it } from "vitest";
import type { EventData, Exchange, Objective } from "@tomelist/schema";
import { emptyEventProgress, type EventProgress } from "@tomelist/schema";
import {
  budgetReport,
  eventWeek,
  EFFORT_WEIGHTS,
  lastWeeklyReset,
  rankRunNext,
  tokensRemaining,
  runsToMustGoal,
  weeklyPlan,
} from "./optimizer";

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

describe("lastWeeklyReset", () => {
  it("maps a mid-week date to the previous Tuesday 08:00 UTC", () => {
    // Thursday
    const now = new Date("2026-01-15T12:00:00Z");
    expect(lastWeeklyReset(now).toISOString()).toBe("2026-01-13T08:00:00.000Z");
  });

  it("maps a Tuesday just before reset to a full week back", () => {
    const now = new Date("2026-01-13T07:59:59.999Z");
    expect(lastWeeklyReset(now).toISOString()).toBe("2026-01-06T08:00:00.000Z");
  });

  it("maps exactly 08:00 Tuesday to itself", () => {
    const now = new Date("2026-01-13T08:00:00.000Z");
    expect(lastWeeklyReset(now).toISOString()).toBe("2026-01-13T08:00:00.000Z");
  });
});

describe("rankRunNext", () => {
  it("orders by score (points / effort weight) desc, then points desc, then id asc", () => {
    const ev = event({
      objectives: [
        objective({ id: "a", points: 20, effort: "medium" }), // score 10
        objective({ id: "b", points: 10, effort: "quick" }), // score 10
        objective({ id: "c", points: 40, effort: "long" }), // score 10
        objective({ id: "d", points: 5, effort: "quick" }), // score 5
      ],
    });
    const ranked = rankRunNext(ev, progress(), NOW);
    // a, b, c tie at score 10; sorted by points desc (c=40, a=20, b=10), then d last.
    expect(ranked.map((r) => r.objective.id)).toEqual(["c", "a", "b", "d"]);
  });

  it("excludes a completed one-time objective", () => {
    const ev = event({
      objectives: [objective({ id: "one-time", repeatable: false, points: 10 })],
    });
    const p = progress({
      completedObjectives: { "one-time": { count: 1, lastDoneAt: NOW.toISOString() } },
    });
    expect(rankRunNext(ev, p, NOW)).toEqual([]);
  });

  it("excludes a weekly objective done since the current reset, includes one done before it", () => {
    const ev = event({
      objectives: [
        objective({ id: "weekly-done", kind: "standard", repeatable: "weekly", points: 10 }),
        objective({ id: "weekly-stale", kind: "standard", repeatable: "weekly", points: 10 }),
      ],
    });
    const reset = lastWeeklyReset(NOW);
    const p = progress({
      completedObjectives: {
        "weekly-done": { count: 1, lastDoneAt: new Date(reset.getTime() + 1000).toISOString() },
        "weekly-stale": { count: 3, lastDoneAt: new Date(reset.getTime() - 1000).toISOString() },
      },
    });
    const ids = rankRunNext(ev, p, NOW).map((r) => r.objective.id);
    expect(ids).toEqual(["weekly-stale"]);
  });

  it("always includes repeatable === true objectives regardless of completion history", () => {
    const ev = event({
      objectives: [objective({ id: "grind", kind: "standard", repeatable: true, points: 10 })],
    });
    const p = progress({
      completedObjectives: { grind: { count: 50, lastDoneAt: NOW.toISOString() } },
    });
    expect(rankRunNext(ev, p, NOW).map((r) => r.objective.id)).toEqual(["grind"]);
  });
});

describe("runsToMustGoal", () => {
  it("returns 0 when the must tier is already affordable", () => {
    const ev = event({ exchanges: [exchange({ id: "ex-1", cost: 100 })] });
    const p = progress({
      tomestones: 100,
      wishlist: { "ex-1": { status: "wanted", tier: "must", quantity: 1 } },
    });
    expect(runsToMustGoal(ev, p, NOW)).toBe(0);
  });

  it("greedily counts objectives needed to cover the shortfall", () => {
    const ev = event({
      exchanges: [exchange({ id: "ex-1", cost: 100 })],
      objectives: [
        objective({ id: "a", points: 40, effort: "quick", repeatable: false }), // score 40
        objective({ id: "b", points: 30, effort: "quick", repeatable: false }), // score 30
        objective({ id: "c", points: 10, effort: "quick", repeatable: false }), // score 10
        objective({ id: "d", points: 25, effort: "quick", repeatable: false }), // score 25
      ],
    });
    const p = progress({
      tomestones: 0,
      wishlist: { "ex-1": { status: "wanted", tier: "must", quantity: 1 } },
    });
    // shortfall = 100. Ranked by score desc: a(40), b(30), d(25), c(10).
    // a=40 (1), b=70 (2), d=95 (3), c=105 (4) -> covered at count 4.
    expect(runsToMustGoal(ev, p, NOW)).toBe(4);
  });

  it("returns null when short with no unbounded grind available", () => {
    const ev = event({
      exchanges: [exchange({ id: "ex-1", cost: 1000 })],
      objectives: [objective({ id: "a", points: 10, repeatable: false })],
    });
    const p = progress({
      tomestones: 0,
      wishlist: { "ex-1": { status: "wanted", tier: "must", quantity: 1 } },
    });
    expect(runsToMustGoal(ev, p, NOW)).toBeNull();
  });

  it("covers the shortfall via a repeating unbounded grind when the finite list runs out", () => {
    const ev = event({
      exchanges: [exchange({ id: "ex-1", cost: 100 })],
      objectives: [
        objective({ id: "one-time", points: 10, repeatable: false }),
        objective({ id: "grind", points: 20, repeatable: true }),
      ],
    });
    const p = progress({
      tomestones: 0,
      wishlist: { "ex-1": { status: "wanted", tier: "must", quantity: 1 } },
    });
    // shortfall = 100. Ranked by score desc: grind (score 20) then one-time (score 10).
    // sum after grind(20)=20 (count1), one-time(10)=30 (count2), still short -> repeat best
    // unbounded (grind, 20 pts): 50(3), 70(4), 90(5), 110(6) -> covered at count 6.
    expect(runsToMustGoal(ev, p, NOW)).toBe(6);
  });
});

describe("weeklyPlan", () => {
  const reset = lastWeeklyReset(NOW);

  it("excludes minimogs done this week from suggestions and orders top-2 by score", () => {
    const ev = event({
      objectives: [
        objective({ id: "mini-a", kind: "minimog", points: 40, effort: "quick" }), // score 40
        objective({ id: "mini-b", kind: "minimog", points: 20, effort: "quick" }), // score 20
        objective({ id: "mini-c", kind: "minimog", points: 10, effort: "quick" }), // score 10, done this week
      ],
    });
    const p = progress({
      completedObjectives: {
        "mini-c": { count: 1, lastDoneAt: new Date(reset.getTime() + 1000).toISOString() },
      },
    });
    const plan = weeklyPlan(ev, p, NOW);
    expect(plan.suggestedMinimogs.map((r) => r.objective.id)).toEqual(["mini-a", "mini-b"]);
  });

  it("weeklies flag flips based on lastDoneAt before/after reset", () => {
    const ev = event({
      objectives: [
        objective({ id: "weekly-done", kind: "standard", repeatable: "weekly", points: 10 }),
        objective({ id: "weekly-stale", kind: "standard", repeatable: "weekly", points: 10 }),
      ],
    });
    const p = progress({
      completedObjectives: {
        "weekly-done": { count: 1, lastDoneAt: new Date(reset.getTime() + 1000).toISOString() },
        "weekly-stale": { count: 3, lastDoneAt: new Date(reset.getTime() - 1000).toISOString() },
      },
    });
    const plan = weeklyPlan(ev, p, NOW);
    const byId = Object.fromEntries(plan.weeklies.map((w) => [w.objective.id, w.doneThisWeek]));
    expect(byId).toEqual({ "weekly-done": true, "weekly-stale": false });
  });

  it("excludes minimogs from the weeklies list even if flagged repeatable: weekly", () => {
    const ev = event({
      objectives: [objective({ id: "mini-weekly", kind: "minimog", repeatable: "weekly", points: 10 })],
    });
    const plan = weeklyPlan(ev, progress(), NOW);
    expect(plan.weeklies).toEqual([]);
  });

  it("sums earnedThisWeek across all doneThisWeek objectives", () => {
    const ev = event({
      objectives: [
        objective({ id: "a", points: 10 }),
        objective({ id: "b", kind: "minimog", points: 20 }),
        objective({ id: "c", points: 5 }), // not done
      ],
    });
    const p = progress({
      completedObjectives: {
        a: { count: 1, lastDoneAt: new Date(reset.getTime() + 100).toISOString() },
        b: { count: 1, lastDoneAt: new Date(reset.getTime() + 100).toISOString() },
      },
    });
    const plan = weeklyPlan(ev, p, NOW);
    expect(plan.earnedThisWeek).toBe(30);
  });

  it("neededPerWeek is 0 when the must tier is already covered by wallet/one-time income", () => {
    const ev = event({ exchanges: [exchange({ id: "ex-1", cost: 50 })] });
    const p = progress({
      tomestones: 100,
      wishlist: { "ex-1": { status: "wanted", tier: "must", quantity: 1 } },
    });
    const plan = weeklyPlan(ev, p, NOW);
    expect(plan.neededPerWeek).toBe(0);
    expect(plan.onPace).toBe(true);
  });

  it("neededPerWeek is positive when there's a shortfall and weeksLeft > 0; onPace false when under-earned", () => {
    const ev = event({
      ends: "2026-01-29T00:00:00Z", // 2 weeks after NOW
      exchanges: [exchange({ id: "ex-1", cost: 100 })],
      objectives: [],
    });
    const p = progress({
      tomestones: 0,
      wishlist: { "ex-1": { status: "wanted", tier: "must", quantity: 1 } },
    });
    // shortfall = 100 - 0 - 0 = 100; weeksLeft = 2 -> ceil(100/2) = 50
    const plan = weeklyPlan(ev, p, NOW);
    expect(plan.neededPerWeek).toBe(50);
    expect(plan.earnedThisWeek).toBe(0);
    expect(plan.onPace).toBe(false);
  });

  it("neededPerWeek is null when nothing is wishlisted at the must tier", () => {
    const ev = event({ ends: "2026-02-01T00:00:00Z" }); // fixed end, weeksLeft > 0
    const plan = weeklyPlan(ev, progress(), NOW); // empty wishlist -> mustCost 0
    expect(plan.neededPerWeek).toBeNull();
    expect(plan.onPace).toBeNull();
  });

  it("neededPerWeek is null when weeksLeft is null (open-ended event)", () => {
    const ev = event({ ends: null, exchanges: [exchange({ id: "ex-1", cost: 100 })] });
    const p = progress({
      tomestones: 0,
      wishlist: { "ex-1": { status: "wanted", tier: "must", quantity: 1 } },
    });
    const plan = weeklyPlan(ev, p, NOW);
    expect(plan.neededPerWeek).toBeNull();
    expect(plan.onPace).toBeNull();
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

describe("week-tagged minimogs", () => {
  // Starts Wed 2026-01-07; resets fall on Tue 01-13, 01-20, 01-27.
  const ev = event({
    starts: "2026-01-07T08:00:00Z",
    ends: "2026-02-01T00:00:00Z",
    objectives: [
      objective({ id: "mm-w1", kind: "minimog", week: 1, points: 10, repeatable: "weekly" }),
      objective({ id: "mm-w2", kind: "minimog", week: 2, points: 10, repeatable: "weekly" }),
      objective({ id: "mm-w3", kind: "minimog", week: 3, points: 10, repeatable: "weekly" }),
    ],
  });
  const WEEK2 = new Date("2026-01-15T00:00:00Z");

  it("eventWeek counts weekly resets since the start", () => {
    expect(eventWeek(ev, new Date("2026-01-06T00:00:00Z"))).toBe(0);
    expect(eventWeek(ev, new Date("2026-01-07T08:00:00Z"))).toBe(1);
    expect(eventWeek(ev, new Date("2026-01-13T07:59:59Z"))).toBe(1);
    expect(eventWeek(ev, new Date("2026-01-13T08:00:00Z"))).toBe(2);
    expect(eventWeek(ev, new Date("2026-01-28T00:00:00Z"))).toBe(4);
  });

  it("budget counts current and future weeks once each and skips past weeks", () => {
    const report = budgetReport(ev, progress(), WEEK2);
    expect(report.weeklyRate).toBe(0);
    expect(report.oneTimeRemaining).toBe(20);
  });

  it("budget drops a completed current-week minimog", () => {
    const p = progress({ completedObjectives: { "mm-w2": { count: 1, lastDoneAt: WEEK2.toISOString() } } });
    expect(budgetReport(ev, p, WEEK2).oneTimeRemaining).toBe(10);
  });

  it("planner and run-next suggest only the current week's minimog", () => {
    const plan = weeklyPlan(ev, progress(), WEEK2);
    expect(plan.suggestedMinimogs.map((r) => r.objective.id)).toEqual(["mm-w2"]);
    expect(plan.currentWeek).toBe(2);
    expect(plan.minimogWeeks).toBe(3);
    expect(rankRunNext(ev, progress(), WEEK2).map((r) => r.objective.id)).toEqual(["mm-w2"]);
  });

  it("suggests nothing once the current week's minimog is done", () => {
    const p = progress({ completedObjectives: { "mm-w2": { count: 1, lastDoneAt: WEEK2.toISOString() } } });
    expect(weeklyPlan(ev, p, WEEK2).suggestedMinimogs).toEqual([]);
  });
});

describe("event tokens", () => {
  const ev = event({
    token: { name: "Horn Token" },
    starts: "2026-01-07T08:00:00Z",
    ends: "2026-02-01T00:00:00Z",
    objectives: [
      objective({ id: "mm-w1", kind: "minimog", week: 1, tokens: 1, repeatable: "weekly" }),
      objective({ id: "mm-w2", kind: "minimog", week: 2, tokens: 1, repeatable: "weekly" }),
      objective({ id: "mm-w3", kind: "minimog", week: 3, tokens: 1, repeatable: "weekly" }),
      objective({ id: "ulti", kind: "ultimog", tokens: 5, points: 70 }),
    ],
    exchanges: [exchange({ id: "mount", cost: 100, tokenCost: 7 }), exchange({ id: "hat", cost: 50 })],
  });
  const WEEK2 = new Date("2026-01-15T00:00:00Z");

  it("tokensRemaining skips past weeks and completed objectives", () => {
    expect(tokensRemaining(ev, progress(), WEEK2)).toBe(7);
    const p = progress({ completedObjectives: { ulti: { count: 1, lastDoneAt: WEEK2.toISOString() } } });
    expect(tokensRemaining(ev, p, WEEK2)).toBe(2);
  });

  it("tokensRemaining is null when an unbounded grind awards tokens", () => {
    const grind = event({ objectives: [objective({ id: "g", repeatable: true, tokens: 1 })] });
    expect(tokensRemaining(grind, progress(), WEEK2)).toBeNull();
  });

  it("is not affordable now when tomes suffice but tokens don't", () => {
    const p = progress({
      tomestones: 200,
      tokens: 6,
      wishlist: { mount: { status: "wanted", tier: "must", quantity: 1 } },
    });
    const must = budgetReport(ev, p, WEEK2).tiers[0];
    expect(must.tokenCost).toBe(7);
    expect(must.affordableNow).toBe(false);
    expect(must.affordableByEnd).toBe(true);
  });

  it("is out of reach by the end when tokens can't be earned in time", () => {
    const p = progress({
      tomestones: 200,
      completedObjectives: { ulti: { count: 1, lastDoneAt: WEEK2.toISOString() } },
      wishlist: { mount: { status: "wanted", tier: "must", quantity: 1 } },
    });
    expect(budgetReport(ev, p, WEEK2).tiers[0].affordableByEnd).toBe(false);
    expect(weeklyPlan(ev, p, WEEK2).mustTokensReachable).toBe(false);
  });

  it("an event without tokens reports zero token costs", () => {
    const plain = event();
    const report = budgetReport(plain, progress(), WEEK2);
    expect(report.tokens).toBe(0);
    expect(report.tiers.every((t) => t.tokenCost === 0)).toBe(true);
  });
});

describe("multi-clear objectives", () => {
  const ev = event({
    objectives: [
      objective({ id: "aloalo", kind: "ultimog", clears: 6, points: 72, effort: "long", tokens: 5 }),
      objective({ id: "quick", points: 10, effort: "quick" }),
    ],
    token: { name: "Horn Token" },
  });
  const withCount = (count: number) =>
    progress({ completedObjectives: { aloalo: { count, lastDoneAt: NOW.toISOString() } } });

  it("stays available and unpaid until the last clear", () => {
    expect(rankRunNext(ev, withCount(3), NOW).map((r) => r.objective.id)).toContain("aloalo");
    expect(budgetReport(ev, withCount(3), NOW).oneTimeRemaining).toBe(82);
    expect(tokensRemaining(ev, withCount(3), NOW)).toBe(5);
  });

  it("is done after the last clear", () => {
    expect(rankRunNext(ev, withCount(6), NOW).map((r) => r.objective.id)).not.toContain("aloalo");
    expect(budgetReport(ev, withCount(6), NOW).oneTimeRemaining).toBe(10);
    expect(tokensRemaining(ev, withCount(6), NOW)).toBe(0);
  });

  it("scores per run, not per reward", () => {
    const aloalo = rankRunNext(ev, progress(), NOW).find((r) => r.objective.id === "aloalo")!;
    expect(aloalo.score).toBe(72 / 6 / EFFORT_WEIGHTS.long);
  });
});
