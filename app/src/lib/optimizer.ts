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
 *   kind "ultimog" (unclaimed Ultimogs are one-time).
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
