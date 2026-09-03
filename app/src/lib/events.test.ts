import { describe, expect, it } from "vitest";
import { getActiveEvent, getAllEvents, getEvent, isEventEnded } from "./events";

describe("event loading", () => {
  it("loads all bundled events", () => {
    const events = getAllEvents();
    expect(events.length).toBeGreaterThan(0);
    // sorted newest-first by `starts`
    expect(events[0].id).toBe("2026-09-astronomy-first-hunt");
  });
  it("getEvent finds by id", () => {
    expect(getEvent("2026-03-mogmog-collection")?.name).toContain("Mogmog");
    expect(getEvent("nope")).toBeUndefined();
  });
  it("active event: within window", () => {
    expect(getActiveEvent(new Date("2026-04-15T00:00:00Z"))?.id).toBe("2026-03-mogmog-collection");
  });
  it("active event: between events falls back to most recent", () => {
    expect(getActiveEvent(new Date("2026-07-09T00:00:00Z"))?.id).toBe("2026-09-astronomy-first-hunt");
  });
  it("active event: before any event starts falls back to most recent", () => {
    expect(getActiveEvent(new Date("2020-01-01T00:00:00Z"))?.id).toBe("2026-09-astronomy-first-hunt");
  });
  it("isEventEnded: false before the end, true after, and a null end never ends", () => {
    const e = getEvent("2026-03-mogmog-collection")!;
    expect(isEventEnded(e, new Date("2026-04-15T00:00:00Z"))).toBe(false);
    expect(isEventEnded(e, new Date("2026-06-01T00:00:00Z"))).toBe(true);
    expect(isEventEnded({ ...e, ends: null }, new Date("2030-01-01T00:00:00Z"))).toBe(false);
  });
});
