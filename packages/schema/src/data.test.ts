import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { eventSchema, manifestSchema } from "./event";

const dataDir = join(__dirname, "../../../data");

describe("bundled event data", () => {
  it("manifest is valid", () => {
    const manifest = manifestSchema.parse(JSON.parse(readFileSync(join(dataDir, "manifest.json"), "utf8")));
    expect(manifest.events.length).toBeGreaterThan(0);
  });
  it("every event file is valid and listed in the manifest", () => {
    const manifest = manifestSchema.parse(JSON.parse(readFileSync(join(dataDir, "manifest.json"), "utf8")));
    const files = readdirSync(join(dataDir, "events")).filter((f) => f.endsWith(".json"));
    expect(files.length).toBe(manifest.events.length);
    for (const f of files) {
      const event = eventSchema.parse(JSON.parse(readFileSync(join(dataDir, "events", f), "utf8")));
      expect(f).toBe(`${event.id}.json`);
      expect(manifest.events.map((e) => e.id)).toContain(event.id);
    }
  });
  it("every icon path points to a file in app/public", () => {
    const publicDir = join(__dirname, "../../../app/public");
    const files = readdirSync(join(dataDir, "events")).filter((f) => f.endsWith(".json"));
    for (const f of files) {
      const event = eventSchema.parse(JSON.parse(readFileSync(join(dataDir, "events", f), "utf8")));
      const icons = [event.tomestone.icon, ...event.exchanges.map((e) => e.icon)].filter(
        (icon): icon is string => Boolean(icon)
      );
      for (const icon of icons) expect(existsSync(join(publicDir, icon)), `${f}: ${icon}`).toBe(true);
    }
  });
  it("manifest entries match their event file metadata", () => {
    const manifest = manifestSchema.parse(JSON.parse(readFileSync(join(dataDir, "manifest.json"), "utf8")));
    for (const entry of manifest.events) {
      const event = eventSchema.parse(
        JSON.parse(readFileSync(join(dataDir, "events", `${entry.id}.json`), "utf8"))
      );
      expect(entry.name).toBe(event.name);
      expect(entry.starts).toBe(event.starts);
      expect(entry.ends).toBe(event.ends);
    }
  });
  it("events that award or charge tokens define the token", () => {
    const files = readdirSync(join(dataDir, "events")).filter((f) => f.endsWith(".json"));
    for (const f of files) {
      const event = eventSchema.parse(JSON.parse(readFileSync(join(dataDir, "events", f), "utf8")));
      const usesTokens =
        event.objectives.some((o) => o.tokens !== undefined) ||
        event.exchanges.some((e) => e.tokenCost !== undefined);
      if (usesTokens) expect(event.token, `${f}: uses tokens without "token"`).toBeDefined();
    }
  });
  it("the newest event records whether every exchange is tradeable", () => {
    const files = readdirSync(join(dataDir, "events")).filter((f) => f.endsWith(".json"));
    const events = files.map((f) => eventSchema.parse(JSON.parse(readFileSync(join(dataDir, "events", f), "utf8"))));
    const newest = events.reduce((a, b) => (b.starts > a.starts ? b : a));
    const missing = newest.exchanges.filter((e) => e.tradeable === undefined).map((e) => e.id);
    expect(missing, `${newest.id}: run scripts/fetch-tradeable.ts`).toEqual([]);
  });
});
