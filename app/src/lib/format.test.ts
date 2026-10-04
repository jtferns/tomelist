import { describe, expect, it } from "vitest";
import { tokenCount, undoClearBlockedReason } from "./format";

describe("tokenCount", () => {
  it("pluralises the token name", () => {
    expect(tokenCount(1, "Uolon Horn Token")).toBe("1 Uolon Horn Token");
    expect(tokenCount(10, "Uolon Horn Token")).toBe("10 Uolon Horn Tokens");
    expect(tokenCount(2)).toBe("2 tokens");
  });
});

describe("undoClearBlockedReason", () => {
  it("is null when both balances cover the clear", () => {
    expect(undoClearBlockedReason(10, 10, 1, 1)).toBeNull();
  });

  it("names whichever balances fall short, tomes first", () => {
    expect(undoClearBlockedReason(4, 10, 1, 1)).toBe(
      "6 tomes from this clear already went to exchanges. Undo an exchange first."
    );
    expect(undoClearBlockedReason(4, 10, 0, 1, "Horn Token")).toBe(
      "6 tomes and 1 Horn Token from this clear already went to exchanges. Undo an exchange first."
    );
  });
});
