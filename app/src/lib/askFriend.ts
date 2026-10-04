import type { EventData, EventProgress, Exchange } from "@tomelist/schema";
import { tokenCount, tomeCount } from "@/lib/format";

export type AskLine = { item: Exchange; quantity: number };

export type AskGroups = {
  // Wanted, tradeable, and nobody is covering them yet: what to ask friends for.
  ask: AskLine[];
  covered: AskLine[];
  // Wanted but untradeable: the player has to earn these.
  earn: AskLine[];
};

export function askGroups(event: EventData, wishlist: EventProgress["wishlist"] | undefined): AskGroups {
  const groups: AskGroups = { ask: [], covered: [], earn: [] };
  for (const item of event.exchanges) {
    const entry = wishlist?.[item.id];
    if (!entry || entry.status === "exchanged") continue;
    const line = { item, quantity: entry.quantity };
    if (entry.status === "covering") groups.covered.push(line);
    else if (item.tradeable) groups.ask.push(line);
    else groups.earn.push(line);
  }
  return groups;
}

export function lineCost({ item, quantity }: AskLine): string {
  const tomes = tomeCount(item.cost * quantity);
  return item.tokenCost ? `${tomes} + ${tokenCount(item.tokenCost * quantity)}` : tomes;
}

export function askTotal(lines: AskLine[]): { tomes: number; tokens: number } {
  return lines.reduce(
    (sum, { item, quantity }) => ({
      tomes: sum.tomes + item.cost * quantity,
      tokens: sum.tokens + (item.tokenCost ?? 0) * quantity,
    }),
    { tomes: 0, tokens: 0 }
  );
}

// Plain text for pasting into Discord or chat. Lists only what friends can actually help with.
export function askText(eventName: string, lines: AskLine[]): string {
  const total = askTotal(lines);
  const totalText = total.tokens > 0 ? `${tomeCount(total.tomes)} + ${tokenCount(total.tokens)}` : tomeCount(total.tomes);
  return [
    `Tomelist: ${eventName}`,
    "Looking for help with (all tradeable):",
    ...lines.map((line) => `- ${line.item.name}${line.quantity > 1 ? ` x${line.quantity}` : ""}: ${lineCost(line)}`),
    `Total: ${totalText}`,
  ].join("\n");
}
