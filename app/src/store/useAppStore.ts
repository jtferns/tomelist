import { emptyEventProgress, type EventProgress, type WishlistEntry } from "@tomelist/schema";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type AppState = {
  schemaVersion: 1;
  settings: { theme: string };
  events: Record<string, EventProgress>;
  updatedAt: string;
  setTheme: (theme: string) => void;
  addTomestones: (eventId: string, delta: number) => void;
  recordObjective: (eventId: string, objectiveId: string, points: number) => void;
  undoObjective: (eventId: string, objectiveId: string, points: number) => void;
  cycleWishlist: (eventId: string, exchangeId: string) => void;
  setWishlistTier: (eventId: string, exchangeId: string, tier: WishlistEntry["tier"]) => void;
  markExchanged: (eventId: string, exchangeId: string, cost: number) => void;
  getProgress: (eventId: string) => EventProgress;
};

function touch(events: AppState["events"], eventId: string): EventProgress {
  return events[eventId] ? structuredClone(events[eventId]) : emptyEventProgress();
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      const update = (eventId: string, fn: (p: EventProgress) => void) =>
        set((s) => {
          const p = touch(s.events, eventId);
          fn(p);
          return { events: { ...s.events, [eventId]: p }, updatedAt: new Date().toISOString() };
        });

      return {
        schemaVersion: 1,
        settings: { theme: "dark" },
        events: {},
        updatedAt: new Date().toISOString(),
        setTheme: (theme) => set({ settings: { theme }, updatedAt: new Date().toISOString() }),
        addTomestones: (eventId, delta) =>
          update(eventId, (p) => {
            p.tomestones = Math.max(0, p.tomestones + delta);
          }),
        recordObjective: (eventId, objectiveId, points) =>
          update(eventId, (p) => {
            const cur = p.completedObjectives[objectiveId] ?? { count: 0, lastDoneAt: "" };
            p.completedObjectives[objectiveId] = { count: cur.count + 1, lastDoneAt: new Date().toISOString() };
            p.tomestones += points;
          }),
        undoObjective: (eventId, objectiveId, points) =>
          update(eventId, (p) => {
            const cur = p.completedObjectives[objectiveId];
            if (cur && cur.count > 0) {
              p.completedObjectives[objectiveId] = { ...cur, count: cur.count - 1 };
              p.tomestones = Math.max(0, p.tomestones - points);
            }
          }),
        cycleWishlist: (eventId, exchangeId) =>
          update(eventId, (p) => {
            if (p.wishlist[exchangeId]) delete p.wishlist[exchangeId];
            else p.wishlist[exchangeId] = { status: "wanted", tier: "want" };
          }),
        setWishlistTier: (eventId, exchangeId, tier) =>
          update(eventId, (p) => {
            const entry = p.wishlist[exchangeId];
            if (entry) p.wishlist[exchangeId] = { ...entry, tier };
          }),
        markExchanged: (eventId, exchangeId, cost) =>
          update(eventId, (p) => {
            const entry = p.wishlist[exchangeId];
            if (entry && entry.status === "wanted") {
              p.wishlist[exchangeId] = { ...entry, status: "exchanged" };
              p.tomestones = Math.max(0, p.tomestones - cost);
            }
          }),
        getProgress: (eventId) => get().events[eventId] ?? emptyEventProgress(),
      };
    },
    {
      name: "tomelist:v2",
      partialize: (s) => ({
        schemaVersion: s.schemaVersion,
        settings: s.settings,
        events: s.events,
        updatedAt: s.updatedAt,
      }),
    }
  )
);
