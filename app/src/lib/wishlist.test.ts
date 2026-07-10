import { describe, expect, it } from "vitest";
import { getEvent } from "./events";
import { getWishlistTotal } from "./wishlist";

const event = getEvent("2026-03-mogmog-collection")!;

describe("getWishlistTotal", () => {
  it("returns 0 for empty/undefined wishlist", () => {
    expect(getWishlistTotal(event, undefined)).toBe(0);
    expect(getWishlistTotal(event, {})).toBe(0);
  });
  it("sums cost x quantity for wanted entries only", () => {
    expect(
      getWishlistTotal(event, {
        "fat-cat-parasol": { status: "wanted", tier: "want", quantity: 2 }, // 50 x 2
        "miners-earring": { status: "exchanged", tier: "want", quantity: 1 }, // ignored
        "magicked-prism-bundle": { status: "wanted", tier: "want", quantity: 20 }, // 1 x 20
      })
    ).toBe(120);
  });
});
