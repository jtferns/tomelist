import { describe, expect, it } from "vitest";
import { defaultTheme, themeSettingsSchema, wishlistEntrySchema, userStateSchema } from "./state";

describe("themeSettingsSchema", () => {
  it("accepts a full theme object", () => {
    expect(
      themeSettingsSchema.parse({
        palette: "adder",
        mode: "light",
        ornament: "reduced",
        density: "compact",
      })
    ).toEqual({
      palette: "adder",
      mode: "light",
      ornament: "reduced",
      density: "compact",
    });
  });
  it("rejects unknown palettes", () => {
    expect(() =>
      themeSettingsSchema.parse({ palette: "garlean", mode: "dark", ornament: "full", density: "comfy" })
    ).toThrow();
  });
  it("rejects unknown ornament values", () => {
    expect(() =>
      themeSettingsSchema.parse({ palette: "maelstrom", mode: "dark", ornament: "extra", density: "comfy" })
    ).toThrow();
  });
  it("rejects unknown density values", () => {
    expect(() =>
      themeSettingsSchema.parse({ palette: "maelstrom", mode: "dark", ornament: "full", density: "roomy" })
    ).toThrow();
  });
  it("rejects a theme missing ornament/density", () => {
    expect(() => themeSettingsSchema.parse({ palette: "maelstrom", mode: "dark" })).toThrow();
  });
  it("exports a maelstrom-dark-full-comfy default", () => {
    expect(defaultTheme).toEqual({
      palette: "maelstrom",
      mode: "dark",
      ornament: "full",
      density: "comfy",
    });
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
      settings: { theme: { palette: "maelstrom", mode: "dark", ornament: "full", density: "comfy" } },
      events: {},
      updatedAt: new Date().toISOString(),
    });
    expect(parsed.schemaVersion).toBe(2);
  });
});
