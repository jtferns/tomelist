import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/store/useAppStore";
import { useSync, useSyncStatus } from "./useSync";

const opened: { url: string; close: ReturnType<typeof vi.fn> }[] = [];

class StubWebSocket {
  onopen: (() => void) | null = null;
  onmessage = null;
  onclose: (() => void) | null = null;
  close = vi.fn();
  constructor(public url: string) {
    opened.push(this);
  }
  send() {}
}

beforeEach(() => {
  opened.length = 0;
  vi.stubGlobal("WebSocket", StubWebSocket);
  useAppStore.setState({ syncToken: undefined });
});
afterEach(() => vi.unstubAllGlobals());

describe("useSync", () => {
  it("stays idle without a sync token", () => {
    renderHook(() => useSync());
    expect(opened).toHaveLength(0);
    expect(useSyncStatus.getState().status).toBe("off");
  });

  it("connects to this host's sync endpoint and disconnects when the token is cleared", () => {
    renderHook(() => useSync());
    act(() => useAppStore.getState().setSyncToken("AAAAAAAAAAAAAAAAAAAAAA"));
    expect(opened.map((s) => s.url)).toEqual([`ws://${location.host}/api/sync/AAAAAAAAAAAAAAAAAAAAAA`]);
    expect(useSyncStatus.getState().status).toBe("connecting");
    act(() => useAppStore.getState().setSyncToken(undefined));
    expect(opened[0].close).toHaveBeenCalled();
    expect(useSyncStatus.getState().status).toBe("off");
  });
});
