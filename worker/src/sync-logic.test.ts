import { describe, expect, it } from "vitest";
import type { UserState } from "@tomelist/schema";
import { MAX_MESSAGE_BYTES, alarmDue, handleMessage } from "./sync-logic";

function state(updatedAt: string, extra: Partial<UserState> = {}): UserState {
  return {
    schemaVersion: 2,
    settings: {
      theme: { palette: "maelstrom", mode: "dark", ornament: "full", density: "comfy" },
    },
    events: {},
    updatedAt,
    ...extra,
  };
}

const send = (s: unknown) => JSON.stringify({ type: "state", state: s });

describe("handleMessage", () => {
  it("stores and broadcasts the first state", () => {
    const incoming = state("2026-10-11T10:00:00.000Z");
    expect(handleMessage(send(incoming), null)).toEqual({
      store: incoming,
      broadcast: { type: "state", state: incoming },
    });
  });

  it("stores and broadcasts a newer state", () => {
    const stored = state("2026-10-11T10:00:00.000Z");
    const incoming = state("2026-10-11T10:00:01.000Z");
    expect(handleMessage(send(incoming), stored)).toEqual({
      store: incoming,
      broadcast: { type: "state", state: incoming },
    });
  });

  it("sends the stored state back for an older or equal write", () => {
    const stored = state("2026-10-11T10:00:01.000Z");
    for (const at of ["2026-10-11T10:00:00.000Z", "2026-10-11T10:00:01.000Z"]) {
      expect(handleMessage(send(state(at)), stored)).toEqual({
        reply: { type: "state", state: stored },
      });
    }
  });

  it("strips the sync token before storing", () => {
    const incoming = state("2026-10-11T10:00:00.000Z", { syncToken: "secret" });
    const result = handleMessage(send(incoming), null);
    expect(result.store).not.toHaveProperty("syncToken");
    expect(result.broadcast).toEqual({ type: "state", state: result.store });
  });

  it("rejects messages that are not valid state", () => {
    for (const raw of ["not json", JSON.stringify({ type: "state", state: { nope: 1 } }), "{}"]) {
      expect(handleMessage(raw, null)).toEqual({ reply: { type: "error", reason: "invalid" } });
    }
  });

  it("rejects an unparseable updatedAt", () => {
    expect(handleMessage(send(state("yesterday")), null)).toEqual({
      reply: { type: "error", reason: "invalid" },
    });
  });

  it("rejects messages over the size cap before parsing", () => {
    const big = "x".repeat(MAX_MESSAGE_BYTES + 1);
    expect(handleMessage(big, null)).toEqual({ reply: { type: "error", reason: "too-large" } });
  });

  it("counts the cap in UTF-8 bytes, not characters", () => {
    const multibyte = "★".repeat(Math.ceil(MAX_MESSAGE_BYTES / 3) + 1);
    expect(handleMessage(multibyte, null)).toEqual({ reply: { type: "error", reason: "too-large" } });
  });
});

describe("alarmDue", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.parse("2026-10-11T10:00:00.000Z");

  it("sets an alarm 90 days out when there is none", () => {
    expect(alarmDue(now, null)).toBe(now + 90 * DAY);
  });

  it("leaves a recent alarm alone", () => {
    expect(alarmDue(now, now + 90 * DAY - 1000)).toBeNull();
    expect(alarmDue(now, now + 89 * DAY + 1)).toBeNull();
  });

  it("pushes out an alarm that is more than a day stale", () => {
    expect(alarmDue(now, now + 89 * DAY)).toBe(now + 90 * DAY);
  });
});
