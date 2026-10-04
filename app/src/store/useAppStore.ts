import {
  defaultTheme,
  emptyEventProgress,
  type EventProgress,
  type ThemeSettings,
  type UserState,
  type WishlistEntry,
} from "@tomelist/schema";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type PersistedState = {
  schemaVersion: 2;
  settings: { theme: ThemeSettings };
  events: Record<string, EventProgress>;
  updatedAt: string;
};

type AppState = PersistedState & {
  setPalette: (palette: ThemeSettings["palette"]) => void;
  setMode: (mode: ThemeSettings["mode"]) => void;
  setOrnament: (ornament: ThemeSettings["ornament"]) => void;
  setDensity: (density: ThemeSettings["density"]) => void;
  addTomestones: (eventId: string, delta: number) => void;
  addTokens: (eventId: string, delta: number) => void;
  recordObjective: (eventId: string, objectiveId: string, points: number, tokens?: number) => void;
  undoObjective: (eventId: string, objectiveId: string, points: number, tokens?: number) => void;
  toggleWishlist: (eventId: string, exchangeId: string) => void;
  adjustWishlistQuantity: (eventId: string, exchangeId: string, delta: number) => void;
  setWishlistTier: (eventId: string, exchangeId: string, tier: WishlistEntry["tier"]) => void;
  markExchanged: (eventId: string, exchangeId: string, cost: number, tokenCost?: number) => void;
  undoExchanged: (eventId: string, exchangeId: string, cost: number, tokenCost?: number) => void;
  resetEvent: (eventId: string) => void;
  replaceState: (state: UserState) => void;
  getProgress: (eventId: string) => EventProgress;
};

function touch(events: AppState["events"], eventId: string): EventProgress {
  return events[eventId] ? structuredClone(events[eventId]) : emptyEventProgress();
}

// Runs for any persisted snapshot older than `version: 2` below — including the
// pre-versioned launch format (implicit version 0), which stored theme as a
// plain "dark"/"light" string and wishlist entries without quantity.
export function migratePersistedState(persisted: unknown): PersistedState {
  const s = persisted as {
    settings?: { theme?: string | Partial<ThemeSettings> };
    events?: Record<string, EventProgress>;
    updatedAt?: string;
  } | null;
  const legacy = s?.settings?.theme;
  const theme: ThemeSettings =
    typeof legacy === "string"
      ? { ...defaultTheme, mode: legacy === "light" ? "light" : "dark" }
      : { ...defaultTheme, ...legacy };
  const events: Record<string, EventProgress> = {};
  for (const [id, p] of Object.entries(s?.events ?? {})) {
    const wishlist: EventProgress["wishlist"] = {};
    for (const [exchangeId, entry] of Object.entries(p.wishlist ?? {})) {
      wishlist[exchangeId] = { ...entry, quantity: entry.quantity ?? 1 };
    }
    events[id] = { ...emptyEventProgress(), ...p, wishlist };
  }
  return {
    schemaVersion: 2,
    settings: { theme },
    events,
    updatedAt: s?.updatedAt ?? new Date().toISOString(),
  };
}

const HISTORY_LIMIT = 50;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      const update = (eventId: string, fn: (p: EventProgress) => void) =>
        set((s) => {
          const p = touch(s.events, eventId);
          fn(p);
          return { events: { ...s.events, [eventId]: p }, updatedAt: new Date().toISOString() };
        });
      const setTheme = (patch: Partial<ThemeSettings>) =>
        set((s) => ({
          settings: { ...s.settings, theme: { ...s.settings.theme, ...patch } },
          updatedAt: new Date().toISOString(),
        }));

      return {
        schemaVersion: 2,
        settings: { theme: defaultTheme },
        events: {},
        updatedAt: new Date().toISOString(),
        setPalette: (palette) => setTheme({ palette }),
        setMode: (mode) => setTheme({ mode }),
        setOrnament: (ornament) => setTheme({ ornament }),
        setDensity: (density) => setTheme({ density }),
        addTomestones: (eventId, delta) =>
          update(eventId, (p) => {
            p.tomestones = Math.max(0, p.tomestones + delta);
          }),
        addTokens: (eventId, delta) =>
          update(eventId, (p) => {
            p.tokens = Math.max(0, (p.tokens ?? 0) + delta);
          }),
        recordObjective: (eventId, objectiveId, points, tokens = 0) =>
          update(eventId, (p) => {
            const cur = p.completedObjectives[objectiveId];
            const history = cur ? [...(cur.history ?? []), cur.lastDoneAt].slice(-HISTORY_LIMIT) : [];
            p.completedObjectives[objectiveId] = {
              count: (cur?.count ?? 0) + 1,
              lastDoneAt: new Date().toISOString(),
              history,
            };
            p.tomestones += points;
            if (tokens > 0) p.tokens = (p.tokens ?? 0) + tokens;
          }),
        undoObjective: (eventId, objectiveId, points, tokens = 0) =>
          update(eventId, (p) => {
            const cur = p.completedObjectives[objectiveId];
            // Refuse rather than clamp: tomes already spent on exchanges can't be taken back.
            if (!cur || cur.count === 0 || p.tomestones < points || (p.tokens ?? 0) < tokens) return;
            p.tomestones -= points;
            if (tokens > 0) p.tokens = (p.tokens ?? 0) - tokens;
            if (cur.count === 1) {
              delete p.completedObjectives[objectiveId];
              return;
            }
            const history = cur.history ?? [];
            p.completedObjectives[objectiveId] = {
              count: cur.count - 1,
              // Past the history limit the previous time is unknown; keep the latest.
              lastDoneAt: history.length > 0 ? history[history.length - 1] : cur.lastDoneAt,
              history: history.slice(0, -1),
            };
          }),
        toggleWishlist: (eventId, exchangeId) =>
          update(eventId, (p) => {
            if (p.wishlist[exchangeId]) delete p.wishlist[exchangeId];
            else p.wishlist[exchangeId] = { status: "wanted", tier: "want", quantity: 1 };
          }),
        adjustWishlistQuantity: (eventId, exchangeId, delta) =>
          update(eventId, (p) => {
            const entry = p.wishlist[exchangeId];
            if (entry && entry.status === "wanted") {
              p.wishlist[exchangeId] = { ...entry, quantity: Math.max(1, entry.quantity + delta) };
            }
          }),
        setWishlistTier: (eventId, exchangeId, tier) =>
          update(eventId, (p) => {
            const entry = p.wishlist[exchangeId];
            if (entry) p.wishlist[exchangeId] = { ...entry, tier };
          }),
        markExchanged: (eventId, exchangeId, cost, tokenCost = 0) =>
          update(eventId, (p) => {
            const entry = p.wishlist[exchangeId];
            if (entry && entry.status === "wanted") {
              if (p.tomestones < cost || (p.tokens ?? 0) < tokenCost) return;
              p.tomestones -= cost;
              if (tokenCost > 0) p.tokens = (p.tokens ?? 0) - tokenCost;
              p.wishlist[exchangeId] =
                entry.quantity > 1
                  ? { ...entry, quantity: entry.quantity - 1 }
                  : { ...entry, status: "exchanged" };
            }
          }),
        undoExchanged: (eventId, exchangeId, cost, tokenCost = 0) =>
          update(eventId, (p) => {
            const entry = p.wishlist[exchangeId];
            if (!entry) return;
            p.tomestones += cost;
            if (tokenCost > 0) p.tokens = (p.tokens ?? 0) + tokenCost;
            p.wishlist[exchangeId] =
              entry.status === "exchanged"
                ? { ...entry, status: "wanted" }
                : { ...entry, quantity: entry.quantity + 1 };
          }),
        resetEvent: (eventId) =>
          set((s) => {
            const events = { ...s.events };
            delete events[eventId];
            return { events, updatedAt: new Date().toISOString() };
          }),
        replaceState: (state) =>
          set({ settings: state.settings, events: state.events, updatedAt: new Date().toISOString() }),
        // Returns a live reference into the store's state (or a fresh empty progress when the
        // event has no entry yet). Callers must treat the result as read-only — do not mutate
        // it in place. Pure consumers (e.g. the optimizer in lib/optimizer.ts) rely on this.
        getProgress: (eventId) => get().events[eventId] ?? emptyEventProgress(),
      };
    },
    {
      name: "tomelist:v2",
      version: 3,
      migrate: (persisted) => migratePersistedState(persisted),
      partialize: (s) => ({
        schemaVersion: s.schemaVersion,
        settings: s.settings,
        events: s.events,
        updatedAt: s.updatedAt,
      }),
    }
  )
);
