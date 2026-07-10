import { beforeEach, describe, expect, it } from "vitest";
import { migratePersistedState, useAppStore } from "./useAppStore";

const E = "2026-03-mogmog-collection";

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ events: {}, settings: { theme: { palette: "maelstrom", mode: "dark" } } });
});

describe("wishlist actions", () => {
  it("toggleWishlist wants at quantity 1 and untoggles", () => {
    useAppStore.getState().toggleWishlist(E, "fat-cat-parasol");
    expect(useAppStore.getState().getProgress(E).wishlist["fat-cat-parasol"]).toEqual({
      status: "wanted",
      tier: "want",
      quantity: 1,
    });
    useAppStore.getState().toggleWishlist(E, "fat-cat-parasol");
    expect(useAppStore.getState().getProgress(E).wishlist["fat-cat-parasol"]).toBeUndefined();
  });

  it("adjustWishlistQuantity clamps at 1", () => {
    useAppStore.getState().toggleWishlist(E, "fat-cat-parasol");
    useAppStore.getState().adjustWishlistQuantity(E, "fat-cat-parasol", 2);
    expect(useAppStore.getState().getProgress(E).wishlist["fat-cat-parasol"].quantity).toBe(3);
    useAppStore.getState().adjustWishlistQuantity(E, "fat-cat-parasol", -5);
    expect(useAppStore.getState().getProgress(E).wishlist["fat-cat-parasol"].quantity).toBe(1);
  });

  it("markExchanged decrements quantity, flips to exchanged on last unit", () => {
    useAppStore.getState().addTomestones(E, 120);
    useAppStore.getState().toggleWishlist(E, "fat-cat-parasol");
    useAppStore.getState().adjustWishlistQuantity(E, "fat-cat-parasol", 1); // qty 2
    useAppStore.getState().markExchanged(E, "fat-cat-parasol", 50);
    let entry = useAppStore.getState().getProgress(E).wishlist["fat-cat-parasol"];
    expect(entry).toEqual({ status: "wanted", tier: "want", quantity: 1 });
    expect(useAppStore.getState().getProgress(E).tomestones).toBe(70);
    useAppStore.getState().markExchanged(E, "fat-cat-parasol", 50);
    entry = useAppStore.getState().getProgress(E).wishlist["fat-cat-parasol"];
    expect(entry.status).toBe("exchanged");
    expect(useAppStore.getState().getProgress(E).tomestones).toBe(20);
  });
});

describe("theme actions", () => {
  it("setPalette and setMode update independently", () => {
    useAppStore.getState().setPalette("flames");
    useAppStore.getState().setMode("light");
    expect(useAppStore.getState().settings.theme).toEqual({ palette: "flames", mode: "light" });
  });
});

describe("objective actions", () => {
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
});

describe("migratePersistedState", () => {
  it("migrates legacy string theme and quantity-less wishlist entries", () => {
    const migrated = migratePersistedState({
      schemaVersion: 1,
      settings: { theme: "light" },
      events: {
        [E]: {
          tomestones: 40,
          completedObjectives: {},
          minimogPicks: [],
          wishlist: { "fat-cat-parasol": { status: "wanted", tier: "want" } },
        },
      },
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(migrated.settings.theme).toEqual({ palette: "maelstrom", mode: "light" });
    expect(migrated.events[E].wishlist["fat-cat-parasol"].quantity).toBe(1);
    expect(migrated.events[E].tomestones).toBe(40);
    expect(migrated.schemaVersion).toBe(2);
  });
});
