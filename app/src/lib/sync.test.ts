import type { UserState } from "@tomelist/schema";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSyncClient, type SyncSocket, type SyncStatus } from "./sync";

class FakeSocket implements SyncSocket {
  sent: unknown[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.closed = true;
  }
  open() {
    this.onopen?.();
  }
  receive(message: unknown) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
  drop() {
    this.onclose?.();
  }
}

function state(updatedAt: string, tomestones = 0): UserState {
  return {
    schemaVersion: 2,
    settings: { theme: { palette: "maelstrom", mode: "dark", ornament: "full", density: "comfy" } },
    events: { e: { tomestones, completedObjectives: {}, minimogPicks: [], wishlist: {} } },
    updatedAt,
  };
}

function setup(initial = state("2026-10-11T10:00:00.000Z")) {
  let current = initial;
  const listeners = new Set<() => void>();
  const sockets: FakeSocket[] = [];
  const statuses: SyncStatus[] = [];
  let online: (() => void) | null = null;
  const adopt = vi.fn((s: UserState) => {
    current = s;
    listeners.forEach((l) => l());
  });
  const client = createSyncClient({
    url: "ws://test/api/sync/t",
    getState: () => current,
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    adopt,
    openSocket: () => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    },
    onStatus: (s) => statuses.push(s),
    onOnline: (fn) => {
      online = fn;
      return () => (online = null);
    },
  });
  const change = (next: UserState) => {
    current = next;
    listeners.forEach((l) => l());
  };
  return { client, sockets, statuses, adopt, change, goOnline: () => online?.(), get: () => current };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createSyncClient", () => {
  it("pushes the current state once the socket opens", () => {
    const t = setup();
    expect(t.statuses).toEqual(["connecting"]);
    t.sockets[0].open();
    expect(t.statuses).toEqual(["connecting", "connected"]);
    expect(t.sockets[0].sent).toEqual([{ type: "state", state: t.get() }]);
  });

  it("strips the sync token from pushed state", () => {
    const t = setup({ ...state("2026-10-11T10:00:00.000Z"), syncToken: "secret" });
    t.sockets[0].open();
    expect(t.sockets[0].sent[0]).toEqual({ type: "state", state: state("2026-10-11T10:00:00.000Z") });
  });

  it("debounces local changes into one push", () => {
    const t = setup();
    t.sockets[0].open();
    t.change(state("2026-10-11T10:00:01.000Z", 1));
    t.change(state("2026-10-11T10:00:02.000Z", 2));
    vi.advanceTimersByTime(999);
    expect(t.sockets[0].sent).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(t.sockets[0].sent).toEqual([
      expect.anything(),
      { type: "state", state: state("2026-10-11T10:00:02.000Z", 2) },
    ]);
  });

  it("adopts only a strictly newer remote state", () => {
    const t = setup();
    t.sockets[0].open();
    t.sockets[0].receive({ type: "state", state: state("2026-10-11T09:00:00.000Z", 5) });
    t.sockets[0].receive({ type: "state", state: state("2026-10-11T10:00:00.000Z", 5) });
    expect(t.adopt).not.toHaveBeenCalled();
    t.sockets[0].receive({ type: "state", state: state("2026-10-11T11:00:00.000Z", 9) });
    expect(t.adopt).toHaveBeenCalledWith(state("2026-10-11T11:00:00.000Z", 9));
  });

  it("does not push an adopted state back", () => {
    const t = setup();
    t.sockets[0].open();
    t.sockets[0].receive({ type: "state", state: state("2026-10-11T11:00:00.000Z", 9) });
    vi.advanceTimersByTime(5000);
    expect(t.sockets[0].sent).toHaveLength(1);
  });

  it("ignores malformed and error messages", () => {
    const t = setup();
    t.sockets[0].open();
    t.sockets[0].onmessage?.({ data: "not json" });
    t.sockets[0].receive({ type: "error", reason: "invalid" });
    expect(t.adopt).not.toHaveBeenCalled();
  });

  it("reconnects with doubling backoff capped at 30 s", () => {
    const t = setup();
    const delays = [1000, 2000, 4000, 8000, 16000, 30000, 30000];
    for (const [i, delay] of delays.entries()) {
      t.sockets[i].drop();
      expect(t.statuses.at(-1)).toBe("offline");
      vi.advanceTimersByTime(delay - 1);
      expect(t.sockets).toHaveLength(i + 1);
      vi.advanceTimersByTime(1);
      expect(t.sockets).toHaveLength(i + 2);
    }
  });

  it("resets the backoff after a successful open", () => {
    const t = setup();
    t.sockets[0].drop();
    vi.advanceTimersByTime(1000);
    t.sockets[1].drop();
    vi.advanceTimersByTime(2000);
    t.sockets[2].open();
    t.sockets[2].drop();
    vi.advanceTimersByTime(1000);
    expect(t.sockets).toHaveLength(4);
  });

  it("reconnects at once when the browser comes back online", () => {
    const t = setup();
    t.sockets[0].drop();
    t.goOnline();
    expect(t.sockets).toHaveLength(2);
    vi.advanceTimersByTime(60000);
    expect(t.sockets).toHaveLength(2);
  });

  it("pushes changes made while offline once reconnected", () => {
    const t = setup();
    t.sockets[0].drop();
    t.change(state("2026-10-11T10:00:05.000Z", 3));
    vi.advanceTimersByTime(1000);
    t.sockets[1].open();
    expect(t.sockets[1].sent).toEqual([{ type: "state", state: state("2026-10-11T10:00:05.000Z", 3) }]);
  });

  it("stop closes the socket and never reconnects", () => {
    const t = setup();
    t.sockets[0].open();
    t.client.stop();
    expect(t.sockets[0].closed).toBe(true);
    t.sockets[0].drop();
    t.change(state("2026-10-11T10:00:05.000Z", 3));
    t.goOnline();
    vi.advanceTimersByTime(60000);
    expect(t.sockets).toHaveLength(1);
    expect(t.sockets[0].sent).toHaveLength(1);
  });
});
