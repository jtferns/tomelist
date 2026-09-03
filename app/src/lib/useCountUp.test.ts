import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCountUp } from "./useCountUp";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  // @ts-expect-error - clean up the stub between tests
  delete window.matchMedia;
});

function stubMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query.includes("reduce"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe("useCountUp", () => {
  it("returns the initial target immediately, without counting up from zero", () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useCountUp(42));
    expect(result.current).toBe(42);
  });

  it("jumps straight to the new value when matchMedia is unavailable (jsdom default)", () => {
    const { result, rerender } = renderHook(({ n }) => useCountUp(n), {
      initialProps: { n: 0 },
    });
    act(() => rerender({ n: 100 }));
    expect(result.current).toBe(100);
  });

  it("jumps straight to the new value under prefers-reduced-motion", () => {
    stubMatchMedia(true);
    const { result, rerender } = renderHook(({ n }) => useCountUp(n), {
      initialProps: { n: 0 },
    });
    act(() => rerender({ n: 100 }));
    expect(result.current).toBe(100);
  });

  it("animates toward the target and settles exactly on it when motion is allowed", async () => {
    stubMatchMedia(false);
    const { result, rerender } = renderHook(({ n }) => useCountUp(n, 60), {
      initialProps: { n: 0 },
    });

    act(() => rerender({ n: 90 }));
    // A frame or two in, it is on its way but not there yet.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 16));
    });
    expect(result.current).toBeGreaterThanOrEqual(0);
    expect(result.current).toBeLessThan(90);

    await waitFor(() => expect(result.current).toBe(90));
  });
});
