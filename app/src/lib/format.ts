export const tomeCount = (n: number) => `${n} ${n === 1 ? "tome" : "tomes"}`;

export const tokenCount = (n: number, name = "token") => `${n} ${n === 1 ? name : `${name}s`}`;

// Why a clear can't be undone with the balances left, or null when it can.
export function undoClearBlockedReason(
  wallet: number,
  points: number,
  tokens = 0,
  tokenAward = 0,
  tokenName = "token"
): string | null {
  const parts: string[] = [];
  if (wallet < points) parts.push(tomeCount(points - wallet));
  if (tokens < tokenAward) parts.push(tokenCount(tokenAward - tokens, tokenName));
  if (parts.length === 0) return null;
  return `${parts.join(" and ")} from this clear already went to exchanges. Undo an exchange first.`;
}
