import type { Objective } from "@tomelist/schema";

export function clearsNeeded(objective: Objective): number {
  return objective.clears ?? 1;
}

// Reward paid by the clear that brings the count to `countAfter`. Multi-clear objectives pay
// everything on the last clear and nothing before it.
export function clearReward(
  objective: Objective,
  countAfter: number,
  withTokens: boolean
): { points: number; tokens: number } {
  if (objective.clears !== undefined && countAfter !== objective.clears) return { points: 0, tokens: 0 };
  return { points: objective.points, tokens: withTokens ? (objective.tokens ?? 0) : 0 };
}
