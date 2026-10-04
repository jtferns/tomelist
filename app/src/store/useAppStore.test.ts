import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { migratePersistedState, useAppStore } from "./useAppStore";

const E = "2026-03-mogmog-collection";

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({
    events: {},
    settings: { theme: { palette: "maelstrom", mode: "dark", ornament: "full", density: "comfy" } },
  });
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
    expect(useAppStore.getState().settings.theme).toEqual({
      palette: "flames",
      mode: "light",
      ornament: "full",
      density: "comfy",
    });
  });

  it("setOrnament and setDensity update independently", () => {
    useAppStore.getState().setOrnament("minimal");
    useAppStore.getState().setDensity("compact");
    expect(useAppStore.getState().settings.theme).toEqual({
      palette: "maelstrom",
      mode: "dark",
      ornament: "minimal",
      density: "compact",
    });
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it("undo with nothing recorded changes nothing", () => {
    useAppStore.getState().undoObjective(E, "obj-x", 10);
    const p = useAppStore.getState().getProgress(E);
    expect(p.completedObjectives["obj-x"]).toBeUndefined();
    expect(p.tomestones).toBe(0);
  });

  it("undoing the only clear removes the record entirely", () => {
    useAppStore.getState().recordObjective(E, "obj-x", 10);
    useAppStore.getState().undoObjective(E, "obj-x", 10);
    const p = useAppStore.getState().getProgress(E);
    expect(p.completedObjectives["obj-x"]).toBeUndefined();
    expect(p.tomestones).toBe(0);
  });

  it("undo restores the previous clear time", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T00:00:00Z"));
    useAppStore.getState().recordObjective(E, "obj-x", 10);
    vi.setSystemTime(new Date("2026-10-08T00:00:00Z"));
    useAppStore.getState().recordObjective(E, "obj-x", 10);
    useAppStore.getState().undoObjective(E, "obj-x", 10);
    const p = useAppStore.getState().getProgress(E);
    expect(p.completedObjectives["obj-x"]).toEqual({
      count: 1,
      lastDoneAt: "2026-10-01T00:00:00.000Z",
      history: [],
    });
    expect(p.tomestones).toBe(10);
  });

  it("refuses to undo a clear whose tomes were spent", () => {
    useAppStore.getState().recordObjective(E, "obj-x", 10);
    useAppStore.getState().addTomestones(E, -4);
    useAppStore.getState().undoObjective(E, "obj-x", 10);
    const p = useAppStore.getState().getProgress(E);
    expect(p.completedObjectives["obj-x"].count).toBe(1);
    expect(p.tomestones).toBe(6);
  });
});

describe("token actions", () => {
  it("old progress without tokens reads as 0 and addTokens floors at 0", () => {
    expect(useAppStore.getState().getProgress(E).tokens ?? 0).toBe(0);
    useAppStore.getState().addTokens(E, 3);
    useAppStore.getState().addTokens(E, -5);
    expect(useAppStore.getState().getProgress(E).tokens).toBe(0);
  });

  it("logging and undoing a clear moves tokens with tomes", () => {
    useAppStore.getState().recordObjective(E, "obj-x", 10, 1);
    expect(useAppStore.getState().getProgress(E).tokens).toBe(1);
    useAppStore.getState().undoObjective(E, "obj-x", 10, 1);
    const p = useAppStore.getState().getProgress(E);
    expect(p.tokens).toBe(0);
    expect(p.tomestones).toBe(0);
  });

  it("refuses to undo a clear whose tokens were spent", () => {
    useAppStore.getState().recordObjective(E, "obj-x", 10, 1);
    useAppStore.getState().addTokens(E, -1);
    useAppStore.getState().undoObjective(E, "obj-x", 10, 1);
    const p = useAppStore.getState().getProgress(E);
    expect(p.completedObjectives["obj-x"].count).toBe(1);
    expect(p.tomestones).toBe(10);
  });

  it("exchange charges both currencies, refuses when tokens are short, and undo refunds both", () => {
    useAppStore.getState().addTomestones(E, 100);
    useAppStore.getState().addTokens(E, 9);
    useAppStore.getState().toggleWishlist(E, "mount");
    useAppStore.getState().markExchanged(E, "mount", 100, 10);
    expect(useAppStore.getState().getProgress(E).wishlist["mount"].status).toBe("wanted");
    expect(useAppStore.getState().getProgress(E).tomestones).toBe(100);

    useAppStore.getState().addTokens(E, 1);
    useAppStore.getState().markExchanged(E, "mount", 100, 10);
    let p = useAppStore.getState().getProgress(E);
    expect(p.wishlist["mount"].status).toBe("exchanged");
    expect([p.tomestones, p.tokens]).toEqual([0, 0]);

    useAppStore.getState().undoExchanged(E, "mount", 100, 10);
    p = useAppStore.getState().getProgress(E);
    expect([p.tomestones, p.tokens]).toEqual([100, 10]);
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
    expect(migrated.settings.theme).toEqual({
      palette: "maelstrom",
      mode: "light",
      ornament: "full",
      density: "comfy",
    });
    expect(migrated.events[E].wishlist["fat-cat-parasol"].quantity).toBe(1);
    expect(migrated.events[E].tomestones).toBe(40);
    expect(migrated.schemaVersion).toBe(2);
  });

  it("migrates a v2 snapshot (palette+mode only) to add ornament/density defaults", () => {
    const migrated = migratePersistedState({
      schemaVersion: 2,
      settings: { theme: { palette: "adder", mode: "dark" } },
      events: {},
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(migrated.settings.theme).toEqual({
      palette: "adder",
      mode: "dark",
      ornament: "full",
      density: "comfy",
    });
  });
});
