import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EORZEADB_LOADER_SRC, useEorzeaTooltips } from "@/lib/useEorzeaTooltips";

function Harness({ enabled }: { enabled: boolean }) {
  useEorzeaTooltips(enabled);
  return null;
}

function loaderScripts() {
  return document.querySelectorAll(`script[src="${EORZEADB_LOADER_SRC}"]`);
}

afterEach(() => {
  cleanup();
  loaderScripts().forEach((el) => el.remove());
});

describe("useEorzeaTooltips", () => {
  it("appends exactly one loader script when enabled", () => {
    const { rerender } = render(<Harness enabled />);
    expect(loaderScripts()).toHaveLength(1);

    rerender(<Harness enabled />);
    expect(loaderScripts()).toHaveLength(1);
  });

  it("appends no script when disabled", () => {
    render(<Harness enabled={false} />);
    expect(loaderScripts()).toHaveLength(0);
  });

  it("removes the script on unmount", () => {
    const { unmount } = render(<Harness enabled />);
    expect(loaderScripts()).toHaveLength(1);
    unmount();
    expect(loaderScripts()).toHaveLength(0);
  });
});
