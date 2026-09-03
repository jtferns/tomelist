import type { EventData, EventProgress, Objective } from "@tomelist/schema";

/**
 * Optimizer core: pure, deterministic budget/affordability engine.
 *
 * Income model
 * ------------
 * - wallet = progress.tomestones.
 * - Wishlist cost of an entry = exchange.cost x entry.quantity, counted ONLY while
 *   entry.status === "wanted" (exchanged items are already paid for). Entries whose id has
 *   no matching exchange in the event are ignored.
 * - Cumulative tiers: must = sum(must); want = must + sum(want); maybe = want + sum(maybe).
 * - oneTimeRemaining = sum of points of objectives with repeatable === false that are NOT
 *   completed (progress.completedObjectives[id]?.count >= 1 means done). This includes
 *   kind "ultimog" (unclaimed Ultimogs are one-time) but EXCLUDES kind "minimog" — minimogs
 *   are weekly picks by game mechanics and earn only through weeklyRate's top-2 rule.
 * - weeklyRate = sum of points of objectives with repeatable === "weekly" (regardless of
 *   kind), PLUS the top-2 minimog-kind objectives by points (the game allows 2 Minimog picks
 *   per week). If fewer than 2 minimog objectives exist, take what's there. A minimog
 *   objective with repeatable === "weekly" must not be double-counted -- minimogs are only
 *   counted via the top-2 rule, never via the generic weekly sum.
 * - Objectives with repeatable === true (unbounded grinds) are EXCLUDED from all
 *   projections -- unbounded income would make every tier trivially affordable.
 * - weeksLeft: null if event.ends is null. Otherwise ceil((ends - now) / 7 days), floored
 *   at 0.
 * - projectedIncome = wallet + oneTimeRemaining + weeklyRate * weeksLeft; null when
 *   weeksLeft is null.
 * - weeksNeeded per tier: 0 if affordableNow. Else shortfall = cumulativeCost - wallet -
 *   oneTimeRemaining; if shortfall <= 0 -> 0 (one-time income isn't instant, but we treat it
 *   as available); else if weeklyRate > 0 -> ceil(shortfall / weeklyRate); else null.
 * - affordableByEnd = projectedIncome !== null ? projectedIncome >= cumulativeCost : null.
 *
 * Run-next ranking
 * ----------------
 * - lastWeeklyReset(now): the most recent FFXIV weekly reset (Tuesday 08:00:00.000 UTC) at or
 *   before `now`, computed in UTC.
 * - Availability (an objective must be available to be ranked):
 *   - repeatable === false -> available iff never completed (count 0).
 *   - repeatable === "weekly" OR kind === "minimog" -> available iff never completed, or
 *     lastDoneAt is strictly before lastWeeklyReset(now) (i.e. not yet done since the current
 *     reset). Minimogs count as weekly picks here regardless of their own repeatable flag,
 *     matching the game mechanic (see Income model above).
 *   - repeatable === true -> always available (unbounded grind).
 * - score = points / EFFORT_WEIGHTS[effort]. Ranked list sorted by score desc, then points desc,
 *   then id asc, for a stable/deterministic order.
 * - runsToMustGoal walks the ranked list, summing points until the must-tier shortfall
 *   (cumulativeCost - wallet) is covered, returning the count of objectives consumed; 0 if
 *   already affordable. If the ranked list is exhausted while still short, it keeps repeating
 *   the highest-scoring available unbounded-grind objective (repeatable === true) until covered;
 *   if none exists, the goal is unreachable and it returns null.
 *
 * Weekly plan
 * -----------
 * - doneThisWeek(id): completedObjectives[id] exists AND its lastDoneAt parses to a time >=
 *   lastWeeklyReset(now).
 * - suggestedMinimogs: kind === "minimog" objectives NOT doneThisWeek, scored and ordered
 *   exactly like rankRunNext (points / EFFORT_WEIGHTS[effort] desc, then points desc, then id
 *   asc), truncated to the top 2 — the game allows 2 Minimog picks per week.
 * - weeklies: objectives with repeatable === "weekly" (any kind other than minimog — minimogs
 *   are surfaced via suggestedMinimogs instead), in event order, each paired with its
 *   doneThisWeek flag.
 * - earnedThisWeek: sum of objective.points over ALL event objectives that are doneThisWeek.
 *   This is an approximation: completedObjectives only stores the latest lastDoneAt (and a
 *   cumulative count), so a repeatable objective completed more than once within the same
 *   week is only counted once here, not per-completion.
 * - neededPerWeek: derived from budgetReport's must tier. Let shortfall = mustCost - wallet -
 *   oneTimeRemaining. When weeksLeft is a number > 0: max(0, ceil(shortfall / weeksLeft)).
 *   When weeksLeft is null or 0, or nothing is wishlisted at the must tier (mustCost 0):
 *   null (no meaningful weekly target).
 * - onPace: null when neededPerWeek is null; otherwise earnedThisWeek >= neededPerWeek.
 */

export const EFFORT_WEIGHTS = { quick: 1, medium: 2, long: 4 } as const;

export type TierVerdict = {
  tier: "must" | "want" | "maybe";
  cumulativeCost: number;
  affordableNow: boolean;
  weeksNeeded: number | null;
  affordableByEnd: boolean | null;
};

export type BudgetReport = {
  wallet: number;
  weeklyRate: number;
  oneTimeRemaining: number;
  weeksLeft: number | null;
  projectedIncome: number | null;
  tiers: TierVerdict[];
};

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const TIER_ORDER = ["must", "want", "maybe"] as const;

function isCompleted(progress: EventProgress, objectiveId: string): boolean {
  return (progress.completedObjectives[objectiveId]?.count ?? 0) >= 1;
}

function isUnboundedGrind(objective: Objective): boolean {
  return objective.repeatable === true;
}

function computeOneTimeRemaining(event: EventData, progress: EventProgress): number {
  let total = 0;
  for (const objective of event.objectives) {
    if (objective.repeatable !== false) continue;
    // Minimogs are weekly picks by game mechanics whatever their repeatable
    // flag says — they earn through weeklyRate's top-2 rule, and counting a
    // repeatable:false minimog here too would double its points.
    if (objective.kind === "minimog") continue;
    if (isCompleted(progress, objective.id)) continue;
    total += objective.points;
  }
  return total;
}

function computeWeeklyRate(event: EventData): number {
  let total = 0;
  const minimogs: Objective[] = [];
  for (const objective of event.objectives) {
    if (isUnboundedGrind(objective)) continue;
    if (objective.kind === "minimog") {
      minimogs.push(objective);
      continue;
    }
    if (objective.repeatable === "weekly") {
      total += objective.points;
    }
  }
  const topTwoMinimogs = [...minimogs].sort((a, b) => b.points - a.points).slice(0, 2);
  for (const minimog of topTwoMinimogs) {
    total += minimog.points;
  }
  return total;
}

function computeTierCosts(event: EventData, progress: EventProgress): Record<(typeof TIER_ORDER)[number], number> {
  const exchangesById = new Map(event.exchanges.map((exchange) => [exchange.id, exchange]));
  const tierSums = { must: 0, want: 0, maybe: 0 };
  for (const [exchangeId, entry] of Object.entries(progress.wishlist)) {
    if (entry.status !== "wanted") continue;
    const exchange = exchangesById.get(exchangeId);
    if (!exchange) continue;
    tierSums[entry.tier] += exchange.cost * entry.quantity;
  }
  const must = tierSums.must;
  const want = must + tierSums.want;
  const maybe = want + tierSums.maybe;
  return { must, want, maybe };
}

function weeksUntil(ends: string, now: Date): number {
  const diffMs = new Date(ends).getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / MS_PER_WEEK));
}

export function budgetReport(event: EventData, progress: EventProgress, now: Date): BudgetReport {
  const wallet = progress.tomestones;
  const oneTimeRemaining = computeOneTimeRemaining(event, progress);
  const weeklyRate = computeWeeklyRate(event);
  const weeksLeft = event.ends === null ? null : weeksUntil(event.ends, now);
  const projectedIncome = weeksLeft === null ? null : wallet + oneTimeRemaining + weeklyRate * weeksLeft;

  const cumulativeCosts = computeTierCosts(event, progress);

  const tiers: TierVerdict[] = TIER_ORDER.map((tier) => {
    const cumulativeCost = cumulativeCosts[tier];
    const affordableNow = wallet >= cumulativeCost;
    let weeksNeeded: number | null;
    if (affordableNow) {
      weeksNeeded = 0;
    } else {
      const shortfall = cumulativeCost - wallet - oneTimeRemaining;
      if (shortfall <= 0) {
        weeksNeeded = 0;
      } else if (weeklyRate > 0) {
        weeksNeeded = Math.ceil(shortfall / weeklyRate);
      } else {
        weeksNeeded = null;
      }
    }
    const affordableByEnd = projectedIncome !== null ? projectedIncome >= cumulativeCost : null;
    return { tier, cumulativeCost, affordableNow, weeksNeeded, affordableByEnd };
  });

  return { wallet, weeklyRate, oneTimeRemaining, weeksLeft, projectedIncome, tiers };
}

const WEEKLY_RESET_DAY = 2; // Tuesday, per Date#getUTCDay (0 = Sunday)
const WEEKLY_RESET_HOUR = 8;

export function lastWeeklyReset(now: Date): Date {
  const reset = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), WEEKLY_RESET_HOUR, 0, 0, 0)
  );
  const dayDiff = (reset.getUTCDay() - WEEKLY_RESET_DAY + 7) % 7;
  reset.setUTCDate(reset.getUTCDate() - dayDiff);
  if (reset.getTime() > now.getTime()) {
    reset.setUTCDate(reset.getUTCDate() - 7);
  }
  return reset;
}

export type RankedObjective = { objective: Objective; score: number };

function isAvailableForRunNext(objective: Objective, progress: EventProgress, now: Date): boolean {
  const record = progress.completedObjectives[objective.id];
  if (objective.repeatable === true) return true;
  if (objective.repeatable === "weekly" || objective.kind === "minimog") {
    if (!record) return true;
    const lastDoneAt = new Date(record.lastDoneAt).getTime();
    if (Number.isNaN(lastDoneAt)) return true;
    return lastDoneAt < lastWeeklyReset(now).getTime();
  }
  // repeatable === false
  return (record?.count ?? 0) === 0;
}

export function rankRunNext(event: EventData, progress: EventProgress, now: Date): RankedObjective[] {
  const ranked: RankedObjective[] = event.objectives
    .filter((objective) => isAvailableForRunNext(objective, progress, now))
    .map((objective) => ({ objective, score: objective.points / EFFORT_WEIGHTS[objective.effort] }));

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.objective.points !== a.objective.points) return b.objective.points - a.objective.points;
    return a.objective.id.localeCompare(b.objective.id);
  });

  return ranked;
}

export function runsToMustGoal(event: EventData, progress: EventProgress, now: Date): number | null {
  const report = budgetReport(event, progress, now);
  const mustTier = report.tiers.find((tier) => tier.tier === "must");
  const mustCost = mustTier?.cumulativeCost ?? 0;
  const shortfall = mustCost - report.wallet;
  if (shortfall <= 0) return 0;

  const ranked = rankRunNext(event, progress, now);
  let sum = 0;
  let count = 0;
  for (const { objective } of ranked) {
    sum += objective.points;
    count += 1;
    if (sum >= shortfall) return count;
  }

  const bestUnbounded = ranked.find(({ objective }) => objective.repeatable === true);
  if (!bestUnbounded) return null;

  while (sum < shortfall) {
    sum += bestUnbounded.objective.points;
    count += 1;
  }
  return count;
}

export type WeeklyPlan = {
  suggestedMinimogs: RankedObjective[];
  weeklies: { objective: Objective; doneThisWeek: boolean }[];
  earnedThisWeek: number;
  neededPerWeek: number | null;
  onPace: boolean | null;
};

function doneThisWeek(progress: EventProgress, objectiveId: string, now: Date): boolean {
  const record = progress.completedObjectives[objectiveId];
  if (!record) return false;
  const lastDoneAt = new Date(record.lastDoneAt).getTime();
  if (Number.isNaN(lastDoneAt)) return false;
  return lastDoneAt >= lastWeeklyReset(now).getTime();
}

export function weeklyPlan(event: EventData, progress: EventProgress, now: Date): WeeklyPlan {
  const suggestedMinimogs = event.objectives
    .filter((objective) => objective.kind === "minimog" && !doneThisWeek(progress, objective.id, now))
    .map((objective) => ({ objective, score: objective.points / EFFORT_WEIGHTS[objective.effort] }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.objective.points !== a.objective.points) return b.objective.points - a.objective.points;
      return a.objective.id.localeCompare(b.objective.id);
    })
    .slice(0, 2);

  const weeklies = event.objectives
    .filter((objective) => objective.repeatable === "weekly" && objective.kind !== "minimog")
    .map((objective) => ({ objective, doneThisWeek: doneThisWeek(progress, objective.id, now) }));

  let earnedThisWeek = 0;
  for (const objective of event.objectives) {
    if (doneThisWeek(progress, objective.id, now)) earnedThisWeek += objective.points;
  }

  const report = budgetReport(event, progress, now);
  const mustTier = report.tiers.find((tier) => tier.tier === "must");
  const mustCost = mustTier?.cumulativeCost ?? 0;
  const shortfall = mustCost - report.wallet - report.oneTimeRemaining;

  let neededPerWeek: number | null;
  if (report.weeksLeft === null || report.weeksLeft === 0 || mustCost === 0) {
    neededPerWeek = null;
  } else {
    neededPerWeek = shortfall <= 0 ? 0 : Math.ceil(shortfall / report.weeksLeft);
  }

  const onPace = neededPerWeek === null ? null : earnedThisWeek >= neededPerWeek;

  return { suggestedMinimogs, weeklies, earnedThisWeek, neededPerWeek, onPace };
}
