import type { EventData, Exchange } from "@tomelist/schema";
import { describe, expect, it } from "vitest";
import { askGroups, askText } from "./askFriend";

const item = (id: string, cost: number, tradeable: boolean, extra: Partial<Exchange> = {}): Exchange => ({
  id,
  name: id,
  cost,
  type: "Item",
  tradeable,
  ...extra,
});

const event = {
  name: "Test Hunt",
  exchanges: [
    item("Ramuh Crystal", 50, true),
    item("Toad Head", 30, true),
    item("Uolon Horn", 100, false, { tokenCost: 10 }),
    item("Domakin", 7, true),
    item("Bamboo Fence", 20, true),
  ],
} as EventData;

describe("askGroups", () => {
  it("splits the wishlist into ask, covered and earn, skipping exchanged and unlisted items", () => {
    const groups = askGroups(event, {
      "Ramuh Crystal": { status: "wanted", tier: "must", quantity: 1 },
      "Toad Head": { status: "wanted", tier: "want", quantity: 2 },
      "Uolon Horn": { status: "wanted", tier: "must", quantity: 1 },
      Domakin: { status: "covering", tier: "want", quantity: 1 },
      "Bamboo Fence": { status: "exchanged", tier: "want", quantity: 1 },
    });
    expect(groups.ask.map((l) => l.item.id)).toEqual(["Ramuh Crystal", "Toad Head"]);
    expect(groups.covered.map((l) => l.item.id)).toEqual(["Domakin"]);
    expect(groups.earn.map((l) => l.item.id)).toEqual(["Uolon Horn"]);
  });
});

describe("askText", () => {
  it("lists tradeable asks with quantities and a total", () => {
    const { ask } = askGroups(event, {
      "Ramuh Crystal": { status: "wanted", tier: "must", quantity: 1 },
      "Toad Head": { status: "wanted", tier: "want", quantity: 2 },
    });
    expect(askText("Test Hunt", ask)).toBe(
      [
        "Tomelist: Test Hunt",
        "Looking for help with (all tradeable):",
        "- Ramuh Crystal: 50 tomes",
        "- Toad Head x2: 60 tomes",
        "Total: 110 tomes",
      ].join("\n")
    );
  });
});
