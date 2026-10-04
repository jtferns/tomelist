export const tomeCount = (n: number) => `${n} ${n === 1 ? "tome" : "tomes"}`;

export const tokenCount = (n: number, name = "token") => `${n} ${n === 1 ? name : `${name}s`}`;

// Why a clear worth `points` can't be undone with `wallet` tomes left, or null when it can.
export function undoClearBlockedReason(wallet: number, points: number): string | null {
  if (wallet >= points) return null;
  return `${tomeCount(points - wallet)} from this clear already went to exchanges. Undo an exchange first.`;
}
