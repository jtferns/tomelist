import { describe, expect, it } from "vitest";
import { defaultTheme, themeSettingsSchema, wishlistEntrySchema, userStateSchema } from "./state";

describe("themeSettingsSchema", () => {
  it("accepts a palette + mode object", () => {
    expect(themeSettingsSchema.parse({ palette: "adder", mode: "light" })).toEqual({
      palette: "adder",
      mode: "light",
    });
  });
  it("rejects unknown palettes", () => {
    expect(() => themeSettingsSchema.parse({ palette: "garlean", mode: "dark" })).toThrow();
  });
  it("exports a maelstrom-dark default", () => {
    expect(defaultTheme).toEqual({ palette: "maelstrom", mode: "dark" });
  });
});

describe("wishlistEntrySchema", () => {
  it("requires quantity >= 1", () => {
    expect(() => wishlistEntrySchema.parse({ status: "wanted", tier: "want", quantity: 0 })).toThrow();
    expect(wishlistEntrySchema.parse({ status: "wanted", tier: "want", quantity: 3 }).quantity).toBe(3);
  });
});

describe("userStateSchema", () => {
  it("is schemaVersion 2 with structured theme", () => {
    const parsed = userStateSchema.parse({
      schemaVersion: 2,
      settings: { theme: { palette: "maelstrom", mode: "dark" } },
      events: {},
      updatedAt: new Date().toISOString(),
    });
    expect(parsed.schemaVersion).toBe(2);
  });
});
