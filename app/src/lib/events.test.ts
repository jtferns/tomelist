import { describe, expect, it } from "vitest";
import { getActiveEvent, getAllEvents, getEvent, isEventEnded } from "./events";

describe("event loading", () => {
  it("loads all bundled events", () => {
    const events = getAllEvents();
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].id).toBe("2026-03-mogmog-collection");
  });
  it("getEvent finds by id", () => {
    expect(getEvent("2026-03-mogmog-collection")?.name).toContain("Mogmog");
    expect(getEvent("nope")).toBeUndefined();
  });
  it("active event: within window", () => {
    expect(getActiveEvent(new Date("2026-07-09T00:00:00Z"))?.id).toBe("2026-03-mogmog-collection");
  });
  it("active event: before any event starts falls back to most recent", () => {
    expect(getActiveEvent(new Date("2020-01-01T00:00:00Z"))?.id).toBe("2026-03-mogmog-collection");
  });
  it("open-ended event is not ended", () => {
    const e = getEvent("2026-03-mogmog-collection")!;
    expect(isEventEnded(e, new Date("2026-07-09T00:00:00Z"))).toBe(false);
  });
});
