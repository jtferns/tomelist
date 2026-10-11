import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UndoToast, useUndoToast } from "./UndoToast";

function rect(top: number, bottom: number) {
  return { top, bottom, left: 0, right: 100, width: 100, height: bottom - top, x: 0, y: top, toJSON() {} } as DOMRect;
}

// Toast lands at innerHeight (844) - bottom (84) - height (60) = 700.
beforeEach(() => {
  vi.stubGlobal("innerHeight", 844);
});

afterEach(() => {
  vi.unstubAllGlobals();
  useUndoToast.setState({ toast: null });
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("UndoToast", () => {
  it("scrolls the tapped row clear of the toast", () => {
    const tapped = document.createElement("button");
    document.body.append(tapped);
    tapped.focus();
    vi.spyOn(tapped, "getBoundingClientRect").mockReturnValue(rect(740, 784));
    vi.spyOn(window, "getComputedStyle").mockReturnValue({ bottom: "84px" } as CSSStyleDeclaration);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(60);
    const scrollBy = vi.spyOn(window, "scrollBy").mockImplementation(() => {});
    render(<UndoToast />);
    act(() => useUndoToast.getState().show("Logged", () => {}));
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ top: 84 + 12 }));
  });

  it("leaves the page alone when the tapped row is already clear", () => {
    const tapped = document.createElement("button");
    document.body.append(tapped);
    tapped.focus();
    vi.spyOn(tapped, "getBoundingClientRect").mockReturnValue(rect(200, 244));
    vi.spyOn(window, "getComputedStyle").mockReturnValue({ bottom: "84px" } as CSSStyleDeclaration);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(60);
    const scrollBy = vi.spyOn(window, "scrollBy").mockImplementation(() => {});
    render(<UndoToast />);
    act(() => useUndoToast.getState().show("Logged", () => {}));
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it("keeps the whole list row clear, not only the button", () => {
    const row = document.createElement("div");
    row.dataset.slot = "list-row";
    const tapped = document.createElement("button");
    row.append(tapped);
    document.body.append(row);
    tapped.focus();
    vi.spyOn(tapped, "getBoundingClientRect").mockReturnValue(rect(650, 694));
    vi.spyOn(row, "getBoundingClientRect").mockReturnValue(rect(620, 730));
    vi.spyOn(window, "getComputedStyle").mockReturnValue({ bottom: "84px" } as CSSStyleDeclaration);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(60);
    const scrollBy = vi.spyOn(window, "scrollBy").mockImplementation(() => {});
    render(<UndoToast />);
    act(() => useUndoToast.getState().show("Logged", () => {}));
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ top: 30 + 12 }));
  });
});
