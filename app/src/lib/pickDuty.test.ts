import { describe, expect, it } from "vitest";
import { pickDuty } from "./pickDuty";

describe("pickDuty", () => {
  it("picks by the random value", () => {
    expect(pickDuty(["a", "b", "c"], null, () => 0)).toBe("a");
    expect(pickDuty(["a", "b", "c"], null, () => 0.99)).toBe("c");
  });
  it("never repeats the previous pick", () => {
    for (const r of [0, 0.4, 0.99]) expect(pickDuty(["a", "b"], "a", () => r)).toBe("b");
  });
  it("returns the only duty again when there is one", () => {
    expect(pickDuty(["a"], "a", () => 0.5)).toBe("a");
  });
});
