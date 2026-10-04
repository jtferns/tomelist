import { useEffect, useRef, useState } from "react";

const DEFAULT_DURATION_MS = 340;

function prefersReducedMotion(): boolean {
  // jsdom has no matchMedia; treat its absence as "animate nothing" so tests
  // (and any non-browser render) see the final value straight away.
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return true;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Rolls a displayed integer from its previous value to `target` over `durationMs`
 * whenever `target` changes. The first render shows `target` as-is (no count from
 * zero). Under prefers-reduced-motion the value jumps immediately.
 */
export function useCountUp(target: number, durationMs = DEFAULT_DURATION_MS): number {
  const [display, setDisplay] = useState(target);
  const frameRef = useRef<number | null>(null);
  const fromRef = useRef(target);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      fromRef.current = target;
      return;
    }

    if (prefersReducedMotion() || durationMs <= 0) {
      fromRef.current = target;
      setDisplay(target);
      return;
    }

    const from = fromRef.current;
    // Measure from the first frame's own timestamp. performance.now() and the frame clock can
    // have different origins (jsdom does), which would leave the elapsed time negative.
    let start: number | null = null;

    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, Math.max(0, (now - start) / durationMs));
      const value = from + (target - from) * easeOutCubic(t);
      setDisplay(t >= 1 ? target : Math.round(value));
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(frameRef.current);
      }
      fromRef.current = target;
    };
  }, [target, durationMs]);

  return display;
}
