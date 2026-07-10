# Tomelist v2 UX Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore v1's core loop (persistent progress HUD, tactile exchange toggles with quantities, mogtome favicon) and add Grand Company themes, per the spec at `docs/superpowers/specs/2026-07-10-ux-restoration-design.md`.

**Architecture:** All user state stays in the Zustand persist store (`app/src/store/useAppStore.ts`), which gets a persist-version bump (0 → 2) migrating the theme string to `{palette, mode}` and adding `quantity` to wishlist entries. A new sticky `ProgressHud` renders inside `EventShell` on every event route, fed by a shared wishlist-total helper. Themes are CSS-token overrides keyed on `data-palette` + `data-theme` attributes. Favicon swaps at runtime to the viewed event's `tomestone.icon` (schema field already exists).

**Tech Stack:** React 19, TanStack Router, Zustand persist, Zod, Tailwind v4 tokens, Vitest + Testing Library, vite-plugin-pwa.

## Global Constraints

- Yarn 4 workspaces; run all commands from the repo root.
- App tests: `yarn workspace @tomelist/app run test` (append a file path to filter). Schema tests: `yarn workspace @tomelist/schema run test`. Typecheck: `yarn tsc`.
- Commit after every task; **never push or deploy** — publishing is the user's call.
- No new npm dependencies (7-day age gate is active; everything here uses existing deps: `lucide-react`, `date-fns`, `zustand`, `zod`).
- End every commit message with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` (shown abbreviated in snippets below as `Co-Authored-By: …`).
- localStorage key stays `"tomelist:v2"`; existing persisted data must survive via migration, never be dropped.

---

### Task 1: Schema — theme settings object + wishlist quantity

**Files:**
- Modify: `packages/schema/src/state.ts`
- Test: `packages/schema/src/state.test.ts` (create)

**Interfaces:**
- Consumes: nothing new.
- Produces: `themeSettingsSchema`, `type ThemeSettings = { palette: "maelstrom" | "adder" | "flames"; mode: "dark" | "light" }`, `defaultTheme: ThemeSettings`, `wishlistEntrySchema` gains `quantity: number` (int ≥ 1), `userStateSchema` becomes `schemaVersion: z.literal(2)` with `settings: { theme: themeSettingsSchema }`. All re-exported from the package root (check `packages/schema/src/index.ts` exports `* from "./state"`; if it lists names individually, add the new ones).

- [ ] **Step 1: Write the failing test**

Create `packages/schema/src/state.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { defaultTheme, themeSettingsSchema, wishlistEntrySchema, userStateSchema } from "./state";

describe("themeSettingsSchema", () => {
  it("accepts a palette + mode object", () => {
    expect(themeSettingsSchema.parse({ palette: "adder", mode: "light" })).toEqual({
      palette: "adder",
      mode: "light",
    });
  });
  it("rejects unknown palettes", () => {
    expect(() => themeSettingsSchema.parse({ palette: "garlean", mode: "dark" })).toThrow();
  });
  it("exports a maelstrom-dark default", () => {
    expect(defaultTheme).toEqual({ palette: "maelstrom", mode: "dark" });
  });
});

describe("wishlistEntrySchema", () => {
  it("requires quantity >= 1", () => {
    expect(() => wishlistEntrySchema.parse({ status: "wanted", tier: "want", quantity: 0 })).toThrow();
    expect(wishlistEntrySchema.parse({ status: "wanted", tier: "want", quantity: 3 }).quantity).toBe(3);
  });
});

describe("userStateSchema", () => {
  it("is schemaVersion 2 with structured theme", () => {
    const parsed = userStateSchema.parse({
      schemaVersion: 2,
      settings: { theme: { palette: "maelstrom", mode: "dark" } },
      events: {},
      updatedAt: new Date().toISOString(),
    });
    expect(parsed.schemaVersion).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @tomelist/schema run test src/state.test.ts`
Expected: FAIL — `themeSettingsSchema`/`defaultTheme` not exported; quantity missing.

- [ ] **Step 3: Implement**

Replace the relevant parts of `packages/schema/src/state.ts`:

```ts
import { z } from "zod";

export const themeSettingsSchema = z.object({
  palette: z.enum(["maelstrom", "adder", "flames"]),
  mode: z.enum(["dark", "light"]),
});

export const wishlistEntrySchema = z.object({
  status: z.enum(["wanted", "exchanged"]),
  tier: z.enum(["must", "want", "maybe"]),
  quantity: z.number().int().min(1),
});

export const eventProgressSchema = z.object({
  tomestones: z.number().int().min(0),
  completedObjectives: z.record(
    z.string(),
    z.object({ count: z.number().int().min(0), lastDoneAt: z.string() })
  ),
  minimogPicks: z.array(z.string()),
  wishlist: z.record(z.string(), wishlistEntrySchema),
});

export const userStateSchema = z.object({
  schemaVersion: z.literal(2),
  syncToken: z.string().optional(),
  settings: z.object({ theme: themeSettingsSchema }),
  events: z.record(z.string(), eventProgressSchema),
  updatedAt: z.string(),
});

export type ThemeSettings = z.infer<typeof themeSettingsSchema>;
export type WishlistEntry = z.infer<typeof wishlistEntrySchema>;
export type EventProgress = z.infer<typeof eventProgressSchema>;
export type UserState = z.infer<typeof userStateSchema>;

export const defaultTheme: ThemeSettings = { palette: "maelstrom", mode: "dark" };

export function emptyEventProgress(): EventProgress {
  return { tomestones: 0, completedObjectives: {}, minimogPicks: [], wishlist: {} };
}
```

If `packages/schema/src/index.ts` re-exports named symbols instead of `export * from "./state"`, add `themeSettingsSchema`, `ThemeSettings`, `defaultTheme` to it.

- [ ] **Step 4: Run tests**

Run: `yarn workspace @tomelist/schema run test`
Expected: PASS (state tests + existing data-validation tests; event data has no wishlist entries, so nothing else changes).

Note: `yarn tsc` will now FAIL in `@tomelist/app` (store still uses string theme and quantity-less entries). That is expected until Task 2 — do not "fix" it here.

- [ ] **Step 5: Commit**

```bash
git add packages/schema/src/state.ts packages/schema/src/state.test.ts packages/schema/src/index.ts
git commit -m "feat(schema): structured theme settings + wishlist quantity (state v2)

Co-Authored-By: …"
```

---

### Task 2: Store — persist migration + quantity-aware actions

**Files:**
- Modify: `app/src/store/useAppStore.ts`
- Test: `app/src/store/useAppStore.test.ts` (create)

**Interfaces:**
- Consumes: `ThemeSettings`, `defaultTheme`, `emptyEventProgress`, `EventProgress` from `@tomelist/schema`.
- Produces (used by Tasks 3–6):
  - `settings.theme: ThemeSettings`
  - `setPalette(palette: ThemeSettings["palette"]): void`, `setMode(mode: ThemeSettings["mode"]): void`
  - `toggleWishlist(eventId: string, exchangeId: string): void` — none ↔ wanted (quantity 1). Replaces `cycleWishlist` (delete the old name).
  - `adjustWishlistQuantity(eventId: string, exchangeId: string, delta: number): void` — clamps at 1; only when status is `"wanted"`.
  - `markExchanged(eventId: string, exchangeId: string, cost: number): void` — deducts one unit's cost; decrements quantity, flips to `"exchanged"` when the last unit is bought.
  - `migratePersistedState(persisted: unknown): PersistedState` — exported for tests.

- [ ] **Step 1: Write the failing test**

Create `app/src/store/useAppStore.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @tomelist/app run test src/store/useAppStore.test.ts`
Expected: FAIL — `toggleWishlist`, `setPalette`, `migratePersistedState` don't exist.

- [ ] **Step 3: Implement**

Replace `app/src/store/useAppStore.ts` with:

```ts
import {
  defaultTheme,
  emptyEventProgress,
  type EventProgress,
  type ThemeSettings,
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
  addTomestones: (eventId: string, delta: number) => void;
  recordObjective: (eventId: string, objectiveId: string, points: number) => void;
  undoObjective: (eventId: string, objectiveId: string, points: number) => void;
  toggleWishlist: (eventId: string, exchangeId: string) => void;
  adjustWishlistQuantity: (eventId: string, exchangeId: string, delta: number) => void;
  setWishlistTier: (eventId: string, exchangeId: string, tier: WishlistEntry["tier"]) => void;
  markExchanged: (eventId: string, exchangeId: string, cost: number) => void;
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
    settings?: { theme?: string | ThemeSettings };
    events?: Record<string, EventProgress>;
    updatedAt?: string;
  } | null;
  const legacy = s?.settings?.theme;
  const theme: ThemeSettings =
    typeof legacy === "string"
      ? { palette: defaultTheme.palette, mode: legacy === "light" ? "light" : "dark" }
      : (legacy ?? defaultTheme);
  const events: Record<string, EventProgress> = {};
  for (const [id, p] of Object.entries(s?.events ?? {})) {
    const wishlist: EventProgress["wishlist"] = {};
    for (const [exchangeId, entry] of Object.entries(p.wishlist ?? {})) {
      wishlist[exchangeId] = { quantity: 1, ...entry };
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
          settings: { theme: { ...s.settings.theme, ...patch } },
          updatedAt: new Date().toISOString(),
        }));

      return {
        schemaVersion: 2,
        settings: { theme: defaultTheme },
        events: {},
        updatedAt: new Date().toISOString(),
        setPalette: (palette) => setTheme({ palette }),
        setMode: (mode) => setTheme({ mode }),
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
        markExchanged: (eventId, exchangeId, cost) =>
          update(eventId, (p) => {
            const entry = p.wishlist[exchangeId];
            if (entry && entry.status === "wanted") {
              p.tomestones = Math.max(0, p.tomestones - cost);
              p.wishlist[exchangeId] =
                entry.quantity > 1
                  ? { ...entry, quantity: entry.quantity - 1 }
                  : { ...entry, status: "exchanged" };
            }
          }),
        getProgress: (eventId) => get().events[eventId] ?? emptyEventProgress(),
      };
    },
    {
      name: "tomelist:v2",
      version: 2,
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
```

Then fix the two existing compile errors from the rename/shape change:
- `app/src/pages/ExchangesPage.tsx:11` — change `s.cycleWishlist` to `s.toggleWishlist` (variable name too; full rework comes in Task 6).
- `app/src/pages/SettingsPage.tsx` — temporary shim so it compiles (Task 3 rewrites it): replace `setTheme`/`theme` usage with `const theme = useAppStore((s) => s.settings.theme.mode); const setMode = useAppStore((s) => s.setMode);` and `onClick={() => setMode(t)}` with `variant={theme === t ? "default" : "outline"}`.
- `app/src/components/Layout.tsx` — `document.documentElement.dataset.theme = theme` becomes `theme.mode` (full version in Task 3).
- `app/src/pages/SettingsPage.test.tsx` — `beforeEach` `settings: { theme: "dark" }` becomes `settings: { theme: { palette: "maelstrom", mode: "dark" } }`, and the assertion `settings.theme).toBe("light")` becomes `settings.theme.mode).toBe("light")`.

- [ ] **Step 4: Run tests and typecheck**

Run: `yarn tsc && yarn workspace @tomelist/app run test`
Expected: PASS (all suites, including the untouched Exchanges tests — the store rename is aliased in the page).

- [ ] **Step 5: Commit**

```bash
git add app/src/store/useAppStore.ts app/src/store/useAppStore.test.ts app/src/pages/ExchangesPage.tsx app/src/pages/SettingsPage.tsx app/src/pages/SettingsPage.test.tsx app/src/components/Layout.tsx
git commit -m "feat(app): store v2 — palette/mode theme, wishlist quantities, persist migration

Co-Authored-By: …"
```

---

### Task 3: Grand Company themes + global click affordances

**Files:**
- Modify: `app/src/index.css`, `app/index.html`, `app/src/components/Layout.tsx`, `app/src/components/EventShell.tsx` (nav hover only), `app/src/pages/SettingsPage.tsx`
- Test: `app/src/pages/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `setPalette`, `setMode`, `settings.theme: ThemeSettings` (Task 2).
- Produces: `<html>` carries `data-theme` (mode) and `data-palette`; CSS tokens respond to both. Settings UI: buttons named "Maelstrom", "Twin Adder", "Immortal Flames", "dark", "light".

- [ ] **Step 1: Write the failing test**

Replace the theme test in `app/src/pages/SettingsPage.test.tsx` (keep the render helper pattern and the "lists events" test as-is):

```tsx
it("switches mode independently of palette", async () => {
  const router = createAppRouter();
  await router.navigate({ to: "/$eventId/settings", params: { eventId: "2026-03-mogmog-collection" } });
  render(<RouterProvider router={router} />);
  await screen.findByTestId("settings-page");
  await userEvent.click(screen.getByRole("button", { name: /^light$/i }));
  expect(useAppStore.getState().settings.theme).toEqual({ palette: "maelstrom", mode: "light" });
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(document.documentElement.dataset.palette).toBe("maelstrom");
});

it("switches Grand Company palette", async () => {
  const router = createAppRouter();
  await router.navigate({ to: "/$eventId/settings", params: { eventId: "2026-03-mogmog-collection" } });
  render(<RouterProvider router={router} />);
  await screen.findByTestId("settings-page");
  await userEvent.click(screen.getByRole("button", { name: /immortal flames/i }));
  expect(useAppStore.getState().settings.theme.palette).toBe("flames");
  expect(document.documentElement.dataset.palette).toBe("flames");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @tomelist/app run test src/pages/SettingsPage.test.tsx`
Expected: FAIL — no "Immortal Flames" button; `data-palette` never set.

- [ ] **Step 3: Implement**

`app/src/components/Layout.tsx`:

```tsx
import { Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

export function Layout() {
  const theme = useAppStore((s) => s.settings.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme.mode;
    document.documentElement.dataset.palette = theme.palette;
  }, [theme]);
  return <Outlet />;
}
```

`app/index.html` line 2: `<html lang="en" data-theme="dark" data-palette="maelstrom">`.

`app/src/index.css` — (a) append after the existing two `:root[data-theme=…]` blocks (whose `--primary`/`--accent`/`--ring` values these palette blocks will always override once `data-palette` is present; also update the base blocks' `--primary`, `--primary-foreground`, `--accent`, `--ring` to the Maelstrom values below so the attribute-less fallback matches the default theme):

```css
/* Grand Company palettes — brand-token overrides over the neutral mode blocks. */
:root[data-palette="maelstrom"][data-theme="dark"] {
  --primary: oklch(0.63 0.19 25);
  --primary-foreground: oklch(0.98 0.01 25);
  --accent: oklch(0.32 0.06 25);
  --accent-foreground: oklch(0.95 0.01 25);
  --ring: oklch(0.63 0.19 25);
}
:root[data-palette="maelstrom"][data-theme="light"] {
  --primary: oklch(0.5 0.19 25);
  --primary-foreground: oklch(0.98 0 0);
  --accent: oklch(0.92 0.03 25);
  --accent-foreground: oklch(0.25 0.05 25);
  --ring: oklch(0.5 0.19 25);
}
:root[data-palette="adder"][data-theme="dark"] {
  --primary: oklch(0.8 0.16 125);
  --primary-foreground: oklch(0.2 0.05 125);
  --accent: oklch(0.32 0.05 135);
  --accent-foreground: oklch(0.95 0.01 135);
  --ring: oklch(0.8 0.16 125);
}
:root[data-palette="adder"][data-theme="light"] {
  --primary: oklch(0.5 0.13 135);
  --primary-foreground: oklch(0.98 0 0);
  --accent: oklch(0.92 0.05 130);
  --accent-foreground: oklch(0.25 0.05 135);
  --ring: oklch(0.5 0.13 135);
}
:root[data-palette="flames"][data-theme="dark"] {
  --primary: oklch(0.8 0.13 85);
  --primary-foreground: oklch(0.22 0.05 85);
  --accent: oklch(0.33 0.05 85);
  --accent-foreground: oklch(0.95 0.01 85);
  --ring: oklch(0.8 0.13 85);
}
:root[data-palette="flames"][data-theme="light"] {
  --primary: oklch(0.55 0.12 80);
  --primary-foreground: oklch(0.98 0 0);
  --accent: oklch(0.92 0.04 85);
  --accent-foreground: oklch(0.25 0.05 85);
  --ring: oklch(0.55 0.12 80);
}
```

(b) restore pointer cursors (Tailwind v4 preflight sets `cursor: default` on buttons):

```css
@layer base {
  button:not(:disabled),
  [role="button"]:not([aria-disabled="true"]) {
    cursor: pointer;
  }
}
```

`app/src/components/EventShell.tsx` — add hover affordance to the tab links: extend the Link `className` with `transition-colors hover:text-foreground`.

`app/src/pages/SettingsPage.tsx` — replace the Theme section:

```tsx
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAllEvents, isEventEnded } from "@/lib/events";
import { useAppStore } from "@/store/useAppStore";

const palettes = [
  { id: "maelstrom", label: "Maelstrom" },
  { id: "adder", label: "Twin Adder" },
  { id: "flames", label: "Immortal Flames" },
] as const;

export function SettingsPage() {
  const theme = useAppStore((s) => s.settings.theme);
  const setPalette = useAppStore((s) => s.setPalette);
  const setMode = useAppStore((s) => s.setMode);
  const now = new Date();
  return (
    <div data-testid="settings-page" className="flex flex-col gap-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Grand Company</h2>
        <div className="flex flex-wrap gap-2">
          {palettes.map((p) => (
            <Button key={p.id} variant={theme.palette === p.id ? "default" : "outline"} onClick={() => setPalette(p.id)}>
              {p.label}
            </Button>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Mode</h2>
        <div className="flex gap-2">
          {(["dark", "light"] as const).map((m) => (
            <Button key={m} variant={theme.mode === m ? "default" : "outline"} onClick={() => setMode(m)}>
              {m}
            </Button>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Events</h2>
        <ul className="flex flex-col gap-1">
          {getAllEvents().map((e) => (
            <li key={e.id} className="flex items-center gap-2">
              <Link to="/$eventId/overview" params={{ eventId: e.id }} className="text-primary underline-offset-2 hover:underline">
                {e.name}
              </Link>
              {isEventEnded(e, now) ? <Badge variant="outline">Ended</Badge> : null}
            </li>
          ))}
        </ul>
      </section>
      <p className="text-xs text-muted-foreground">Tomelist v2.0.0-dev</p>
    </div>
  );
}
```

- [ ] **Step 4: Run tests and typecheck**

Run: `yarn tsc && yarn workspace @tomelist/app run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/index.css app/index.html app/src/components/Layout.tsx app/src/components/EventShell.tsx app/src/pages/SettingsPage.tsx app/src/pages/SettingsPage.test.tsx
git commit -m "feat(app): Grand Company palettes (palette x mode) + pointer-cursor affordances

Co-Authored-By: …"
```

---

### Task 4: Wishlist-total helper + EventSwitcher dropdown

**Files:**
- Create: `app/src/lib/wishlist.ts`, `app/src/components/EventSwitcher.tsx`
- Test: `app/src/lib/wishlist.test.ts` (create)

**Interfaces:**
- Consumes: `getAllEvents`, `getEvent`, `isEventEnded` from `@/lib/events`; `EventData`, `EventProgress` types from `@tomelist/schema`.
- Produces (used by Tasks 5–6):
  - `getWishlistTotal(event: EventData, wishlist: EventProgress["wishlist"] | undefined): number` — Σ `cost × quantity` over entries with status `"wanted"`.
  - `<EventSwitcher eventId={string} />` — renders the event name + compact status line as a dropdown trigger; selecting an event navigates to the **same tab** on that event. Trigger has `aria-haspopup="listbox"`.

- [ ] **Step 1: Write the failing test**

Create `app/src/lib/wishlist.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getEvent } from "./events";
import { getWishlistTotal } from "./wishlist";

const event = getEvent("2026-03-mogmog-collection")!;

describe("getWishlistTotal", () => {
  it("returns 0 for empty/undefined wishlist", () => {
    expect(getWishlistTotal(event, undefined)).toBe(0);
    expect(getWishlistTotal(event, {})).toBe(0);
  });
  it("sums cost x quantity for wanted entries only", () => {
    expect(
      getWishlistTotal(event, {
        "fat-cat-parasol": { status: "wanted", tier: "want", quantity: 2 }, // 50 x 2
        "miners-earring": { status: "exchanged", tier: "want", quantity: 1 }, // ignored
        "magicked-prism-bundle": { status: "wanted", tier: "want", quantity: 20 }, // 1 x 20
      })
    ).toBe(120);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @tomelist/app run test src/lib/wishlist.test.ts`
Expected: FAIL — module `./wishlist` not found.

- [ ] **Step 3: Implement**

`app/src/lib/wishlist.ts`:

```ts
import type { EventData, EventProgress } from "@tomelist/schema";

export function getWishlistTotal(
  event: EventData,
  wishlist: EventProgress["wishlist"] | undefined
): number {
  if (!wishlist) return 0;
  return event.exchanges.reduce((sum, e) => {
    const entry = wishlist[e.id];
    return entry?.status === "wanted" ? sum + e.cost * entry.quantity : sum;
  }, 0);
}
```

`app/src/components/EventSwitcher.tsx`:

```tsx
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { formatDistanceToNowStrict } from "date-fns";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getAllEvents, getEvent, isEventEnded } from "@/lib/events";

const TABS = ["overview", "objectives", "exchanges", "settings"] as const;

export function EventSwitcher({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const event = getEvent(eventId);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  if (!event) return null;
  const now = new Date();
  const ended = isEventEnded(event, now);
  const lastSegment = pathname.split("/").filter(Boolean).pop() ?? "overview";
  const tab = (TABS as readonly string[]).includes(lastSegment) ? lastSegment : "overview";
  const statusLine = ended
    ? "Ended"
    : event.ends
      ? `ends in ${formatDistanceToNowStrict(new Date(event.ends))}`
      : (event.endsLabel ?? "Ongoing");

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-0 flex-col items-start rounded-md px-1 py-0.5 text-left transition-colors hover:bg-accent"
        data-testid="event-switcher-trigger"
      >
        <span className="flex min-w-0 items-center gap-1 text-sm font-semibold">
          <span className="truncate">{event.name}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </span>
        <span className="text-[11px] leading-tight text-muted-foreground">{statusLine}</span>
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label="Switch event"
          className="absolute left-0 top-full z-20 mt-1 w-64 rounded-md border border-border bg-card p-1 shadow-lg"
        >
          {getAllEvents().map((e) => (
            <li key={e.id}>
              <button
                type="button"
                role="option"
                aria-selected={e.id === eventId}
                onClick={() => {
                  setOpen(false);
                  navigate({ to: `/$eventId/${tab}`, params: { eventId: e.id } });
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <span className="min-w-0 flex-1 truncate">{e.name}</span>
                {isEventEnded(e, now) ? <Badge variant="outline">Ended</Badge> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
```

(EventSwitcher's behavior is covered by the ProgressHud tests in Task 5, where it renders inside a real router; no isolated component test needed here.)

- [ ] **Step 4: Run tests and typecheck**

Run: `yarn tsc && yarn workspace @tomelist/app run test src/lib/wishlist.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/wishlist.ts app/src/lib/wishlist.test.ts app/src/components/EventSwitcher.tsx
git commit -m "feat(app): wishlist total helper + event switcher dropdown

Co-Authored-By: …"
```

---

### Task 5: ProgressHud in EventShell

**Files:**
- Create: `app/src/components/ProgressHud.tsx`
- Modify: `app/src/components/EventShell.tsx`, `app/src/pages/OverviewPage.test.tsx` (event name now appears twice)
- Test: `app/src/components/ProgressHud.test.tsx` (create)

**Interfaces:**
- Consumes: `getWishlistTotal` (Task 4), `EventSwitcher` (Task 4), `useAppStore` wallet/wishlist, `getEvent`.
- Produces: sticky HUD on every event route with testids `hud-bar` (fill element, width `${pct}%`), `hud-count` (wallet number), `hud-total` (goal number, absent when wishlist empty), `hud-pct` (percent label, absent when wishlist empty). Wallet numbers link to `/$eventId/overview`.

- [ ] **Step 1: Write the failing test**

Create `app/src/components/ProgressHud.test.tsx`:

```tsx
import { RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/store/useAppStore";
import { createAppRouter } from "@/router";

const E = "2026-03-mogmog-collection";

async function renderAt(tab: string) {
  const router = createAppRouter();
  await router.navigate({ to: `/$eventId/${tab}`, params: { eventId: E } });
  render(<RouterProvider router={router} />);
  await screen.findByTestId(`${tab}-page`);
  return router;
}

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ events: {} });
});

describe("ProgressHud", () => {
  it("shows wallet count and goal hint on every tab, including objectives", async () => {
    useAppStore.getState().addTomestones(E, 30);
    await renderAt("objectives");
    expect(screen.getByTestId("hud-count")).toHaveTextContent("30");
    expect(screen.queryByTestId("hud-total")).not.toBeInTheDocument();
    expect(screen.getByText(/pick exchanges to set a goal/i)).toBeInTheDocument();
  });

  it("shows progress toward the wishlist total", async () => {
    useAppStore.getState().addTomestones(E, 25);
    useAppStore.getState().toggleWishlist(E, "fat-cat-parasol"); // 50 tomes
    await renderAt("overview");
    expect(screen.getByTestId("hud-count")).toHaveTextContent("25");
    expect(screen.getByTestId("hud-total")).toHaveTextContent("50");
    expect(screen.getByTestId("hud-pct")).toHaveTextContent("50%");
    expect(screen.getByTestId("hud-bar")).toHaveStyle({ width: "50%" });
  });

  it("switches events keeping the current tab", async () => {
    const router = await renderAt("exchanges");
    await userEvent.click(screen.getByTestId("event-switcher-trigger"));
    await userEvent.click(screen.getByRole("option", { name: /mogmog collection/i }));
    expect(router.state.location.pathname).toBe(`/${E}/exchanges`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @tomelist/app run test src/components/ProgressHud.test.tsx`
Expected: FAIL — no `hud-count` testid rendered.

- [ ] **Step 3: Implement**

`app/src/components/ProgressHud.tsx`:

```tsx
import { Link, useParams } from "@tanstack/react-router";
import { EventSwitcher } from "@/components/EventSwitcher";
import { getEvent } from "@/lib/events";
import { getWishlistTotal } from "@/lib/wishlist";
import { useAppStore } from "@/store/useAppStore";

export function ProgressHud() {
  const { eventId } = useParams({ from: "/$eventId" });
  const event = getEvent(eventId);
  const tomestones = useAppStore((s) => s.events[eventId]?.tomestones ?? 0);
  const wishlist = useAppStore((s) => s.events[eventId]?.wishlist);
  if (!event) return null;
  const total = getWishlistTotal(event, wishlist);
  const pct = total > 0 ? Math.min(100, (tomestones / total) * 100) : 0;
  return (
    <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-2 backdrop-blur sm:top-14">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <EventSwitcher eventId={eventId} />
        <div className="h-2 min-w-8 flex-1 overflow-hidden rounded-full bg-secondary">
          <div
            data-testid="hud-bar"
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {total > 0 ? (
          <span data-testid="hud-pct" className="text-xs font-semibold tabular-nums text-muted-foreground">
            {Math.floor(pct)}%
          </span>
        ) : null}
        <Link
          to="/$eventId/overview"
          params={{ eventId }}
          className="flex shrink-0 items-center gap-1 text-sm tabular-nums transition-colors hover:text-primary"
          aria-label="Open wallet on Overview"
        >
          <span data-testid="hud-count" className="font-bold">{tomestones}</span>
          {total > 0 ? (
            <span data-testid="hud-total" className="text-muted-foreground">/ {total}</span>
          ) : null}
          {event.tomestone.icon ? (
            <img src={event.tomestone.icon} alt={event.tomestone.name} className="size-5" />
          ) : null}
        </Link>
      </div>
      {total === 0 ? (
        <p className="mx-auto max-w-3xl pt-1 text-[11px] text-muted-foreground">
          Pick exchanges to set a goal
        </p>
      ) : null}
    </div>
  );
}
```

`app/src/components/EventShell.tsx` — render the HUD above the content (imports: add `ProgressHud`):

```tsx
export function EventShell() {
  const { eventId } = useParams({ from: "/$eventId" });
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <div className="sm:pt-14">
        <ProgressHud />
      </div>
      <main className="flex-1 p-4 pb-20 sm:pb-4">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card sm:bottom-auto sm:top-0 sm:border-b sm:border-t-0">
        ...unchanged tabs markup (with the hover classes from Task 3)...
      </nav>
    </div>
  );
}
```

Note the layout shift: the `sm:pt-16` that used to live on `<main>` moves up as `sm:pt-14` on the HUD wrapper (desktop nav is 3.5rem tall), so the HUD sits directly under the fixed desktop nav and sticks there (`sm:top-14` on the HUD itself). Mobile: nav stays bottom-fixed, HUD sticks at `top-0`. Add `z-20` to the nav so it layers above the sticky HUD.

`app/src/pages/OverviewPage.test.tsx` — the event name now renders in both the HUD switcher and the page heading; change

```tsx
expect(screen.getByText(/Mogmog Collection/)).toBeInTheDocument();
```

to

```tsx
expect(screen.getAllByText(/Mogmog Collection/).length).toBeGreaterThan(0);
```

- [ ] **Step 4: Run all app tests**

Run: `yarn tsc && yarn workspace @tomelist/app run test`
Expected: PASS. If another suite fails on a newly-duplicated text match (event name), scope that query with `within(screen.getByTestId("<page>-page"))` rather than weakening the HUD.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/ProgressHud.tsx app/src/components/ProgressHud.test.tsx app/src/components/EventShell.tsx app/src/pages/OverviewPage.test.tsx
git commit -m "feat(app): sticky progress HUD with event switcher on all event routes

Co-Authored-By: …"
```

---

### Task 6: Exchanges — whole-card toggle, quantity stepper, affordability

**Files:**
- Modify: `app/src/pages/ExchangesPage.tsx`
- Test: `app/src/pages/ExchangesPage.test.tsx`

**Interfaces:**
- Consumes: `toggleWishlist`, `adjustWishlistQuantity`, `markExchanged` (Task 2), `getWishlistTotal` (Task 4).
- Produces: card testid stays `exchange-<id>`; new testids `qty-<id>` (quantity readout); cards expose `data-insufficient="true"` when wanted and `cost × quantity > wallet`.

- [ ] **Step 1: Write the failing tests**

Replace `app/src/pages/ExchangesPage.test.tsx` `describe` body (keep the render helper and `beforeEach`; add `const store = () => useAppStore.getState();` inside the describe or use `useAppStore.getState()` inline):

```tsx
describe("ExchangesPage", () => {
  it("lists exchange items with costs", async () => {
    await renderExchanges();
    expect(screen.getByText("Fat Cat Parasol")).toBeInTheDocument();
    expect(screen.getByTestId("exchange-fat-cat-parasol")).toHaveTextContent("50");
  });

  it("tapping the card wants it and updates the summary", async () => {
    await renderExchanges();
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    expect(screen.getByTestId("wanted-total")).toHaveTextContent("50");
    expect(screen.getByTestId("qty-fat-cat-parasol")).toHaveTextContent("1");
  });

  it("tapping a wanted card untoggles it", async () => {
    await renderExchanges();
    const card = () => screen.getByRole("button", { name: /want fat cat parasol/i });
    await userEvent.click(card());
    await userEvent.click(card());
    expect(screen.getByTestId("wanted-total")).toHaveTextContent("0");
  });

  it("quantity stepper multiplies the total and clamps at 1", async () => {
    await renderExchanges();
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    await userEvent.click(screen.getByRole("button", { name: /more fat cat parasol/i }));
    expect(screen.getByTestId("qty-fat-cat-parasol")).toHaveTextContent("2");
    expect(screen.getByTestId("wanted-total")).toHaveTextContent("100");
    await userEvent.click(screen.getByRole("button", { name: /fewer fat cat parasol/i }));
    await userEvent.click(screen.getByRole("button", { name: /fewer fat cat parasol/i }));
    expect(screen.getByTestId("qty-fat-cat-parasol")).toHaveTextContent("1");
    // stepper clicks must not toggle the card off
    expect(screen.getByTestId("wanted-total")).toHaveTextContent("50");
  });

  it("marks unaffordable wanted items", async () => {
    useAppStore.getState().addTomestones(E, 60);
    await renderExchanges();
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    expect(screen.getByTestId("exchange-fat-cat-parasol")).not.toHaveAttribute("data-insufficient");
    await userEvent.click(screen.getByRole("button", { name: /more fat cat parasol/i })); // 100 > 60
    expect(screen.getByTestId("exchange-fat-cat-parasol")).toHaveAttribute("data-insufficient", "true");
  });

  it("mark exchanged deducts one unit and decrements quantity", async () => {
    useAppStore.getState().addTomestones(E, 120);
    await renderExchanges();
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    await userEvent.click(screen.getByRole("button", { name: /more fat cat parasol/i })); // qty 2
    const row = screen.getByTestId("exchange-fat-cat-parasol");
    await userEvent.click(within(row).getByRole("button", { name: /mark exchanged/i }));
    expect(useAppStore.getState().getProgress(E).tomestones).toBe(70);
    expect(screen.getByTestId("qty-fat-cat-parasol")).toHaveTextContent("1");
    await userEvent.click(within(row).getByRole("button", { name: /mark exchanged/i }));
    expect(useAppStore.getState().getProgress(E).tomestones).toBe(20);
    expect(within(row).getByText(/exchanged/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @tomelist/app run test src/pages/ExchangesPage.test.tsx`
Expected: FAIL — no stepper buttons / `qty-*` testids.

- [ ] **Step 3: Implement**

Replace `app/src/pages/ExchangesPage.tsx`:

```tsx
import { useParams } from "@tanstack/react-router";
import { CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getEvent } from "@/lib/events";
import { cn } from "@/lib/utils";
import { getWishlistTotal } from "@/lib/wishlist";
import { useAppStore } from "@/store/useAppStore";
import type { Exchange } from "@tomelist/schema";

function ExchangeRow({ eventId, item, wallet }: { eventId: string; item: Exchange; wallet: number }) {
  const entry = useAppStore((s) => s.events[eventId]?.wishlist[item.id]);
  const toggleWishlist = useAppStore((s) => s.toggleWishlist);
  const adjustWishlistQuantity = useAppStore((s) => s.adjustWishlistQuantity);
  const markExchanged = useAppStore((s) => s.markExchanged);
  const wanted = entry?.status === "wanted";
  const exchanged = entry?.status === "exchanged";
  const quantity = entry?.quantity ?? 1;
  const insufficient = wanted && item.cost * quantity > wallet;

  const meta = (
    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
      <Badge variant="secondary">{item.cost} tomes</Badge>
      <span>{item.type}</span>
      {item.tradeable ? <Badge variant="outline">tradeable</Badge> : null}
    </div>
  );

  if (exchanged) {
    return (
      <Card data-testid={`exchange-${item.id}`} className="opacity-70">
        <CardContent className="flex items-center gap-3 p-3">
          <CheckCircle2 className="size-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{item.name}</p>
            {meta}
          </div>
          <Badge>Exchanged</Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      data-testid={`exchange-${item.id}`}
      data-insufficient={insufficient ? "true" : undefined}
      role="button"
      tabIndex={0}
      aria-pressed={wanted}
      aria-label={`Want ${item.name}`}
      onClick={() => toggleWishlist(eventId, item.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleWishlist(eventId, item.id);
        }
      }}
      className={cn(
        "cursor-pointer transition-colors hover:bg-accent",
        wanted && "border-primary"
      )}
    >
      <CardContent className="flex items-center gap-3 p-3">
        {wanted ? (
          <CheckCircle2 className="size-5 shrink-0 text-primary" />
        ) : (
          <Circle className="size-5 shrink-0 text-muted-foreground" />
        )}
        <div className={cn("min-w-0 flex-1", insufficient && "italic opacity-60")}>
          <p className="truncate font-medium">{item.name}</p>
          {meta}
        </div>
        {wanted ? (
          <div
            className="flex shrink-0 items-center gap-1"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Button
              variant="outline"
              size="sm"
              aria-label={`Fewer ${item.name}`}
              onClick={() => adjustWishlistQuantity(eventId, item.id, -1)}
            >
              −
            </Button>
            <span data-testid={`qty-${item.id}`} className="w-6 text-center text-sm tabular-nums">
              {quantity}
            </span>
            <Button
              variant="outline"
              size="sm"
              aria-label={`More ${item.name}`}
              onClick={() => adjustWishlistQuantity(eventId, item.id, 1)}
            >
              +
            </Button>
            <Button size="sm" onClick={() => markExchanged(eventId, item.id, item.cost)}>
              Mark exchanged
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ExchangesPage() {
  const { eventId } = useParams({ from: "/$eventId" });
  const event = getEvent(eventId);
  const wallet = useAppStore((s) => s.events[eventId]?.tomestones ?? 0);
  const wishlist = useAppStore((s) => s.events[eventId]?.wishlist);
  if (!event) return <div data-testid="exchanges-page">Unknown event.</div>;
  const wantedTotal = getWishlistTotal(event, wishlist);
  return (
    <div data-testid="exchanges-page" className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Wishlist total:{" "}
        <span data-testid="wanted-total" className="font-bold text-foreground">{wantedTotal}</span>{" "}
        tomes
      </p>
      {event.exchanges.map((item) => (
        <ExchangeRow key={item.id} eventId={eventId} item={item} wallet={wallet} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run all app tests**

Run: `yarn tsc && yarn workspace @tomelist/app run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/ExchangesPage.tsx app/src/pages/ExchangesPage.test.tsx
git commit -m "feat(app): whole-card exchange toggles with quantity stepper and affordability tint

Co-Authored-By: …"
```

---

### Task 7: Mogtome favicon — dynamic per event + static/PWA fallback

**Files:**
- Create: `app/src/lib/favicon.ts`, `app/public/tomes/2026-03-mogmog-collection.png` (extracted from v1 git history)
- Modify: `app/src/components/EventShell.tsx`, `app/index.html`, `app/vite.config.ts`, `data/events/2026-03-mogmog-collection.json`, `scripts/README.md`
- Test: `app/src/lib/favicon.test.ts` (create)
- Delete: `app/public/icon.svg`

**Interfaces:**
- Consumes: `event.tomestone.icon` (already optional in `eventSchema` — no schema change needed; the spec's "gains an icon field" is satisfied by this existing field).
- Produces: `setFavicon(href: string): void` — creates/updates `<link rel="icon">` in `document.head`.

- [ ] **Step 1: Extract the tome art placeholder**

The real Irregular Tomestone art isn't in the repo; use v1's tome icon as a stand-in and note it for authoring:

```bash
mkdir -p app/public/tomes
git show 8cc244b:public/images/tome.png > app/public/tomes/2026-03-mogmog-collection.png
file app/public/tomes/2026-03-mogmog-collection.png  # expect: PNG image data
```

- [ ] **Step 2: Write the failing test**

Create `app/src/lib/favicon.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { setFavicon } from "./favicon";

beforeEach(() => {
  document.querySelectorAll('link[rel="icon"]').forEach((l) => l.remove());
});

describe("setFavicon", () => {
  it("creates the icon link when missing", () => {
    setFavicon("/tomes/a.png");
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    expect(link?.getAttribute("href")).toBe("/tomes/a.png");
    expect(link?.type).toBe("image/png");
  });
  it("updates an existing icon link in place", () => {
    setFavicon("/tomes/a.png");
    setFavicon("/tomes/b.png");
    const links = document.querySelectorAll('link[rel="icon"]');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("/tomes/b.png");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `yarn workspace @tomelist/app run test src/lib/favicon.test.ts`
Expected: FAIL — module `./favicon` not found.

- [ ] **Step 4: Implement**

`app/src/lib/favicon.ts`:

```ts
export function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = href.endsWith(".svg") ? "image/svg+xml" : "image/png";
  link.href = href;
}
```

`app/src/components/EventShell.tsx` — swap the favicon to the viewed event's art:

```tsx
import { useEffect } from "react";
import { getEvent } from "@/lib/events";
import { setFavicon } from "@/lib/favicon";
// inside EventShell(), after useParams:
const event = getEvent(eventId);
useEffect(() => {
  if (event?.tomestone.icon) setFavicon(event.tomestone.icon);
}, [event]);
```

`data/events/2026-03-mogmog-collection.json` — add the icon to the tomestone:

```json
"tomestone": { "name": "Irregular Tomestone", "icon": "/tomes/2026-03-mogmog-collection.png" },
```

`app/index.html` — static default (latest event's art) in `<head>`:

```html
<link rel="icon" type="image/png" href="/tomes/2026-03-mogmog-collection.png" />
```

Regenerate the PWA icon set from the tome art (macOS `sips`; art is low-res in-game style, acceptable as placeholder until real art lands):

```bash
SRC=app/public/tomes/2026-03-mogmog-collection.png
sips -z 64 64   "$SRC" --out app/public/pwa-64x64.png
sips -z 192 192 "$SRC" --out app/public/pwa-192x192.png
sips -z 512 512 "$SRC" --out app/public/pwa-512x512.png
sips -z 180 180 "$SRC" --out app/public/apple-touch-icon-180x180.png
sips -z 512 512 "$SRC" --out app/public/maskable-icon-512x512.png
rm app/public/icon.svg
```

`app/vite.config.ts` — drop the SVG references in the `VitePWA` options:

```ts
includeAssets: ["tomes/*.png"],
// and in manifest.icons, remove the icon.svg entry, keeping:
icons: [
  { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
  { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
  { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
],
```

`scripts/README.md` — append to the per-event authoring flow:

```md
7. Add the event's tomestone art as `app/public/tomes/<eventId>.png` and set
   `tomestone.icon` to `/tomes/<eventId>.png` in the event JSON. For the newest
   event, also update the static favicon link in `app/index.html` and regenerate
   the PWA icons from it (`sips -z <size> <size> app/public/tomes/<eventId>.png
   --out app/public/pwa-<size>x<size>.png`, plus the 180px apple-touch and 512px
   maskable icons).
```

- [ ] **Step 5: Run everything**

Run: `yarn tsc && yarn test && yarn validate:data`
Expected: PASS (data validation covers the JSON edit — `tomestone.icon` is already in `eventSchema`).

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/favicon.ts app/src/lib/favicon.test.ts app/src/components/EventShell.tsx app/index.html app/vite.config.ts app/public data/events/2026-03-mogmog-collection.json scripts/README.md
git rm app/public/icon.svg  # if not already staged by the rm above
git commit -m "feat(app): per-event mogtome favicon + tome-art PWA icons

Co-Authored-By: …"
```

---

### Task 8: Full verification pass

**Files:** none new.

- [ ] **Step 1: Run the full CI-equivalent gate**

```bash
yarn tsc && yarn test && yarn build
```

Expected: all three PASS; `app/dist` builds with the PWA manifest referencing the tome-art PNGs.

- [ ] **Step 2: Manual smoke test in the dev server**

Run: `yarn workspace @tomelist/app run dev`, open the printed URL and verify against the spec:
- HUD visible on all four tabs; bar fills as you +10 the wallet on Overview after wanting an item on Exchanges.
- Buttons and exchange cards show `cursor: pointer`; cards highlight on hover; whole card toggles; stepper adjusts quantity without untoggling; over-budget wanted items go italic/dim.
- Event name in HUD opens the switcher (only one event exists — the list still opens and shows it).
- Settings: Grand Company + Mode pickers restyle the app live (crimson / yellow-green / gold primaries).
- Browser tab shows the tome-art favicon.

Report anything that fails as a bug to fix before closing out; do not skip this step.

- [ ] **Step 3: Wrap up**

Use the superpowers:finishing-a-development-branch skill (or report completion if executing on main per user instruction). **Do not push** — publishing is the user's call.
