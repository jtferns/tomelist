import { readFileSync, readdirSync } from "node:fs";
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
});
