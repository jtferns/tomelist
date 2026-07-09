import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "./useAppStore";

const E = "2026-03-mogmog-collection";

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ events: {}, settings: { theme: "dark" } });
});

describe("useAppStore", () => {
  it("records an objective: increments count and wallet", () => {
    useAppStore.getState().recordObjective(E, "obj-x", 10);
    useAppStore.getState().recordObjective(E, "obj-x", 10);
    const p = useAppStore.getState().getProgress(E);
    expect(p.completedObjectives["obj-x"].count).toBe(2);
    expect(p.tomestones).toBe(20);
  });
  it("undo floors at zero", () => {
    useAppStore.getState().undoObjective(E, "obj-x", 10);
    const p = useAppStore.getState().getProgress(E);
    expect(p.completedObjectives["obj-x"]?.count ?? 0).toBe(0);
    expect(p.tomestones).toBe(0);
  });
  it("cycleWishlist: absent -> wanted -> removed", () => {
    useAppStore.getState().cycleWishlist(E, "item");
    expect(useAppStore.getState().getProgress(E).wishlist["item"]).toEqual({ status: "wanted", tier: "want" });
    useAppStore.getState().cycleWishlist(E, "item");
    expect(useAppStore.getState().getProgress(E).wishlist["item"]).toBeUndefined();
  });
  it("markExchanged deducts cost and sets status", () => {
    useAppStore.getState().addTomestones(E, 60);
    useAppStore.getState().cycleWishlist(E, "item");
    useAppStore.getState().markExchanged(E, "item", 50);
    const p = useAppStore.getState().getProgress(E);
    expect(p.wishlist["item"].status).toBe("exchanged");
    expect(p.tomestones).toBe(10);
  });
  it("setTheme persists to state", () => {
    useAppStore.getState().setTheme("light");
    expect(useAppStore.getState().settings.theme).toBe("light");
  });
});
