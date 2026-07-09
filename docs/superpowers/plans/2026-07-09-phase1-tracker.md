# Tomelist Phase 1 — Rebuilt Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the CRA/ThemeUI app with a Vite + Tailwind + shadcn PWA tracker for the new Mogpendium-era event structure, hosted on Cloudflare, with bundled multi-event data.

**Architecture:** Yarn 4 workspaces monorepo: `packages/schema` (shared Zod schemas), `data/` (bundled event JSON), `app/` (Vite React SPA/PWA), `scripts/` (authoring aids). No backend in Phase 1 — the Cloudflare Worker is assets-only. State lives in localStorage via Zustand persist.

**Tech Stack:** TypeScript, React 19, Vite, Tailwind CSS v4, shadcn/ui, TanStack Router (code-based routes), Zustand v5, Zod, date-fns, vite-plugin-pwa, Vitest + Testing Library, wrangler.

## Global Constraints

- Package manager: Yarn 4 (Berry) with `nodeLinker: node-modules` (existing `.yarnrc.yml` stays).
- Node: bump `.nvmrc` to `v22.14.0`.
- All new code is TypeScript with `strict: true`.
- Spec: `docs/superpowers/specs/2026-07-09-tomelist-modernization-design.md`. Phase 1 only — no sync, no optimizer, no character import.
- State schema ships FULL shape from the spec (wishlist tiers included) even where UI is Phase 2.
- Theme = CSS variables on `:root[data-theme="..."]`; dark is default.
- Weekly reset: Tuesdays 08:00 UTC.
- Sample event data is clearly marked `"SAMPLE"` in `notes` fields; the maintainer audits it before launch.
- Install commands use `@latest`; if a peer-dependency conflict occurs, prefer the version the error suggests and note it in the commit message.
- Every task ends with `yarn tsc` (workspace typecheck) and that task's tests passing before commit.

---

### Task 1: Retire old app, scaffold workspaces root

**Files:**
- Delete: `src/`, `public/` (CRA app), `script/parse.ts`, `tsconfig.json` (CRA one)
- Modify: `package.json` (root), `.nvmrc`, `.github/workflows/node.js.yml`
- Create: `tsconfig.base.json`

**Interfaces:**
- Produces: workspace root where `yarn workspaces foreach` runs `tsc`/`test`/`build` in `packages/*`, `app`.

- [ ] **Step 1: Delete the old app**

```bash
git rm -r src public script tsconfig.json
```

- [ ] **Step 2: Replace root package.json**

Replace the entire contents of `package.json` with:

```json
{
  "name": "tomelist-monorepo",
  "private": true,
  "version": "2.0.0-dev",
  "workspaces": ["packages/*", "app"],
  "scripts": {
    "tsc": "yarn workspaces foreach -A --topological run tsc",
    "test": "yarn workspaces foreach -A run test",
    "build": "yarn workspaces foreach -A --topological run build",
    "validate:data": "yarn workspace @tomelist/schema run validate:data"
  },
  "packageManager": "yarn@4.7.0"
}
```

(Keep the `packageManager` line matching the existing value in the current file if it differs.)

- [ ] **Step 3: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  }
}
```

- [ ] **Step 4: Update `.nvmrc`** to contain exactly `v22.14.0`.

- [ ] **Step 5: Gut CI to a placeholder** (rebuilt in Task 13). Replace `.github/workflows/node.js.yml` contents with:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  noop:
    runs-on: ubuntu-latest
    steps:
      - run: echo "CI rebuilt in Task 13"
```

- [ ] **Step 6: Verify and commit**

Run: `yarn install && yarn tsc`
Expected: succeeds trivially (no workspaces have a `tsc` script yet — foreach completes with no work).

```bash
git add -A && git commit -m "chore!: retire CRA app, scaffold yarn workspaces root"
```

---

### Task 2: Schema package — event data schema

**Files:**
- Create: `packages/schema/package.json`, `packages/schema/tsconfig.json`, `packages/schema/src/index.ts`, `packages/schema/src/event.ts`
- Test: `packages/schema/src/event.test.ts`

**Interfaces:**
- Produces (imported as `@tomelist/schema`):
  - `eventSchema: z.ZodType` and inferred `type EventData`
  - `manifestSchema` and `type EventManifest = { events: { id: string; name: string; starts: string; ends: string | null }[] }`
  - `type Objective`, `type Exchange` (element types of `EventData["objectives"]` / `EventData["exchanges"]`)

- [ ] **Step 1: Create package files**

`packages/schema/package.json`:

```json
{
  "name": "@tomelist/schema",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "tsc": "tsc -p .",
    "test": "vitest run",
    "validate:data": "vitest run src/data.test.ts"
  }
}
```

`packages/schema/tsconfig.json`:

```json
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
```

Install deps: `yarn workspace @tomelist/schema add zod@latest && yarn workspace @tomelist/schema add -D typescript@latest vitest@latest`

- [ ] **Step 2: Write the failing test** — `packages/schema/src/event.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { eventSchema, manifestSchema } from "./event";

const validEvent = {
  id: "2026-03-mogmog-collection",
  name: "Mogmog Collection",
  tomestone: { name: "Irregular Tomestone" },
  starts: "2026-03-31T08:00:00Z",
  ends: null,
  endsLabel: "Release of Patch 7.5",
  objectives: [
    {
      id: "obj-sample-dungeon",
      kind: "standard",
      title: "Sample Dungeon",
      category: "Dungeons",
      points: 10,
      effort: "quick",
      repeatable: true,
    },
  ],
  exchanges: [
    { id: "fat-cat-parasol", name: "Fat Cat Parasol", cost: 50, type: "Fashion" },
  ],
};

describe("eventSchema", () => {
  it("accepts a valid event", () => {
    expect(eventSchema.parse(validEvent).id).toBe("2026-03-mogmog-collection");
  });
  it("rejects unknown objective kind", () => {
    const bad = structuredClone(validEvent);
    bad.objectives[0].kind = "bogus";
    expect(() => eventSchema.parse(bad)).toThrow();
  });
  it("rejects negative cost", () => {
    const bad = structuredClone(validEvent);
    bad.exchanges[0].cost = -1;
    expect(() => eventSchema.parse(bad)).toThrow();
  });
  it("accepts repeatable weekly literal", () => {
    const ok = structuredClone(validEvent);
    ok.objectives[0].repeatable = "weekly";
    expect(eventSchema.parse(ok).objectives[0].repeatable).toBe("weekly");
  });
});

describe("manifestSchema", () => {
  it("accepts a manifest", () => {
    const m = { events: [{ id: "x", name: "X", starts: "2026-03-31T08:00:00Z", ends: null }] };
    expect(manifestSchema.parse(m).events).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `yarn workspace @tomelist/schema run test`
Expected: FAIL — cannot resolve `./event`.

- [ ] **Step 4: Implement** — `packages/schema/src/event.ts`:

```ts
import { z } from "zod";

export const objectiveSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["standard", "weekly", "minimog", "ultimog"]),
  title: z.string().min(1),
  category: z.string().min(1),
  points: z.number().int().positive(),
  effort: z.enum(["quick", "medium", "long"]),
  repeatable: z.union([z.boolean(), z.literal("weekly")]),
  requirement: z.string().optional(),
  notes: z.string().optional(),
});

export const exchangeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  cost: z.number().int().positive(),
  type: z.string().min(1),
  tradeable: z.boolean().optional(),
  altSources: z.array(z.object({ type: z.string(), text: z.string() })).optional(),
  collectId: z.number().int().optional(),
  limited: z.boolean().optional(),
  icon: z.string().optional(),
  notes: z.string().optional(),
});

export const eventSchema = z.object({
  id: z.string().regex(/^\d{4}-\d{2}-[a-z0-9-]+$/),
  name: z.string().min(1),
  tomestone: z.object({ name: z.string().min(1), icon: z.string().optional() }),
  starts: z.string().datetime({ offset: true }).or(z.string().datetime()),
  ends: z.string().datetime({ offset: true }).or(z.string().datetime()).nullable(),
  endsLabel: z.string().optional(),
  objectives: z.array(objectiveSchema).min(1),
  exchanges: z.array(exchangeSchema).min(1),
});

export const manifestSchema = z.object({
  events: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      starts: z.string(),
      ends: z.string().nullable(),
    })
  ),
});

export type Objective = z.infer<typeof objectiveSchema>;
export type Exchange = z.infer<typeof exchangeSchema>;
export type EventData = z.infer<typeof eventSchema>;
export type EventManifest = z.infer<typeof manifestSchema>;
```

`packages/schema/src/index.ts`:

```ts
export * from "./event";
export * from "./state";
```

So the `./state` re-export compiles before Task 3 exists, create `packages/schema/src/state.ts` containing exactly:

```ts
export {};
```

- [ ] **Step 5: Verify pass and commit**

Run: `yarn workspace @tomelist/schema run test && yarn tsc`
Expected: 5 tests PASS; typecheck clean.

```bash
git add packages/schema && git commit -m "feat(schema): event + manifest zod schemas"
```

---

### Task 3: Schema package — user state schema

**Files:**
- Modify: `packages/schema/src/state.ts`
- Test: `packages/schema/src/state.test.ts`

**Interfaces:**
- Produces: `userStateSchema`, `type UserState`, `type EventProgress`, `type WishlistEntry = { status: "wanted" | "exchanged"; tier: "must" | "want" | "maybe" }`, and `emptyEventProgress(): EventProgress`.

- [ ] **Step 1: Write the failing test** — `packages/schema/src/state.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { emptyEventProgress, userStateSchema } from "./state";

describe("userStateSchema", () => {
  it("accepts a minimal state", () => {
    const s = {
      schemaVersion: 1,
      settings: { theme: "dark" },
      events: {},
      updatedAt: "2026-07-09T00:00:00Z",
    };
    expect(userStateSchema.parse(s).schemaVersion).toBe(1);
  });
  it("accepts full event progress", () => {
    const s = {
      schemaVersion: 1,
      settings: { theme: "light" },
      events: {
        "2026-03-mogmog-collection": {
          tomestones: 42,
          completedObjectives: { "obj-x": { count: 3, lastDoneAt: "2026-07-01T00:00:00Z" } },
          minimogPicks: ["obj-a", "obj-b"],
          wishlist: { "fat-cat-parasol": { status: "wanted", tier: "must" } },
        },
      },
      updatedAt: "2026-07-09T00:00:00Z",
    };
    expect(userStateSchema.parse(s).events["2026-03-mogmog-collection"].tomestones).toBe(42);
  });
  it("rejects invalid wishlist tier", () => {
    const s = {
      schemaVersion: 1,
      settings: { theme: "dark" },
      events: { e: { tomestones: 0, completedObjectives: {}, minimogPicks: [], wishlist: { x: { status: "wanted", tier: "top" } } } },
      updatedAt: "2026-07-09T00:00:00Z",
    };
    expect(() => userStateSchema.parse(s)).toThrow();
  });
  it("emptyEventProgress returns zeroed progress", () => {
    expect(emptyEventProgress()).toEqual({ tomestones: 0, completedObjectives: {}, minimogPicks: [], wishlist: {} });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `yarn workspace @tomelist/schema run test`
Expected: FAIL — `state.ts` exports nothing.

- [ ] **Step 3: Implement** — replace `packages/schema/src/state.ts` with:

```ts
import { z } from "zod";

export const wishlistEntrySchema = z.object({
  status: z.enum(["wanted", "exchanged"]),
  tier: z.enum(["must", "want", "maybe"]),
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
  schemaVersion: z.literal(1),
  syncToken: z.string().optional(),
  settings: z.object({ theme: z.string() }),
  events: z.record(z.string(), eventProgressSchema),
  updatedAt: z.string(),
});

export type WishlistEntry = z.infer<typeof wishlistEntrySchema>;
export type EventProgress = z.infer<typeof eventProgressSchema>;
export type UserState = z.infer<typeof userStateSchema>;

export function emptyEventProgress(): EventProgress {
  return { tomestones: 0, completedObjectives: {}, minimogPicks: [], wishlist: {} };
}
```

- [ ] **Step 4: Verify pass and commit**

Run: `yarn workspace @tomelist/schema run test && yarn tsc`
Expected: all tests PASS.

```bash
git add packages/schema && git commit -m "feat(schema): user state schema + emptyEventProgress"
```

---

### Task 4: Bundled event data + CI validation

**Files:**
- Create: `data/manifest.json`, `data/events/2026-03-mogmog-collection.json`
- Test: `packages/schema/src/data.test.ts`

**Interfaces:**
- Produces: `data/manifest.json` (matches `manifestSchema`) and one sample event file (matches `eventSchema`). The `validate:data` root script fails CI on any invalid file.

- [ ] **Step 1: Write the failing validation test** — `packages/schema/src/data.test.ts`:

```ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { eventSchema, manifestSchema } from "./event";

const dataDir = join(__dirname, "../../../data");

describe("bundled event data", () => {
  it("manifest is valid", () => {
    const manifest = manifestSchema.parse(JSON.parse(readFileSync(join(dataDir, "manifest.json"), "utf8")));
    expect(manifest.events.length).toBeGreaterThan(0);
  });
  it("every event file is valid and listed in the manifest", () => {
    const manifest = manifestSchema.parse(JSON.parse(readFileSync(join(dataDir, "manifest.json"), "utf8")));
    const files = readdirSync(join(dataDir, "events")).filter((f) => f.endsWith(".json"));
    expect(files.length).toBe(manifest.events.length);
    for (const f of files) {
      const event = eventSchema.parse(JSON.parse(readFileSync(join(dataDir, "events", f), "utf8")));
      expect(f).toBe(`${event.id}.json`);
      expect(manifest.events.map((e) => e.id)).toContain(event.id);
    }
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `yarn workspace @tomelist/schema run validate:data`
Expected: FAIL — `data/manifest.json` does not exist.

- [ ] **Step 3: Create the data files**

`data/manifest.json`:

```json
{
  "events": [
    {
      "id": "2026-03-mogmog-collection",
      "name": "Mogmog Collection (Mar 2026)",
      "starts": "2026-03-31T08:00:00Z",
      "ends": null
    }
  ]
}
```

`data/events/2026-03-mogmog-collection.json` — sample data flagged for audit; objectives/exchanges below are illustrative and the maintainer replaces them via the Task 15 authoring script + Mogpendium transcription:

```json
{
  "id": "2026-03-mogmog-collection",
  "name": "Mogmog Collection (Mar 2026)",
  "tomestone": { "name": "Irregular Tomestone" },
  "starts": "2026-03-31T08:00:00Z",
  "ends": null,
  "endsLabel": "Release of Patch 7.5",
  "objectives": [
    { "id": "obj-moogle-dungeons", "kind": "standard", "title": "Complete a moogle-marked dungeon", "category": "Dungeons", "points": 10, "effort": "medium", "repeatable": true, "notes": "SAMPLE — audit against Mogpendium" },
    { "id": "obj-gates", "kind": "standard", "title": "Earn 2,000+ points in GATEs", "category": "GATEs", "points": 5, "effort": "quick", "repeatable": true, "requirement": "min 2,000 points", "notes": "SAMPLE — audit against Mogpendium" },
    { "id": "obj-weekly-random", "kind": "weekly", "title": "Weekly objective (randomly assigned)", "category": "Weekly", "points": 30, "effort": "medium", "repeatable": "weekly", "notes": "SAMPLE — audit against Mogpendium" },
    { "id": "obj-minimog-fishing", "kind": "minimog", "title": "Minimog: Ocean fishing voyage", "category": "Ocean Fishing", "points": 20, "effort": "long", "repeatable": "weekly", "notes": "SAMPLE — audit against Mogpendium" },
    { "id": "obj-ultimog-msq", "kind": "ultimog", "title": "Ultimog: Complete the event quest", "category": "Quests", "points": 50, "effort": "quick", "repeatable": false, "notes": "SAMPLE — audit against Mogpendium" }
  ],
  "exchanges": [
    { "id": "miners-earring", "name": "Miner's Earring", "cost": 100, "type": "Gear", "notes": "SAMPLE — audit against Lodestone" },
    { "id": "fat-cat-parasol", "name": "Fat Cat Parasol", "cost": 50, "type": "Fashion", "tradeable": false, "notes": "SAMPLE — audit against Lodestone" },
    { "id": "magicked-prism-bundle", "name": "Magicked Prism (bundle)", "cost": 1, "type": "Other", "notes": "SAMPLE — audit against Lodestone" }
  ]
}
```

- [ ] **Step 4: Verify pass and commit**

Run: `yarn validate:data && yarn workspace @tomelist/schema run test`
Expected: PASS.

```bash
git add data packages/schema && git commit -m "feat(data): bundled sample event + manifest with CI validation test"
```

---

### Task 5: App scaffold — Vite + React + Tailwind v4 + themes + Vitest

**Files:**
- Create: `app/package.json`, `app/tsconfig.json`, `app/vite.config.ts`, `app/index.html`, `app/src/main.tsx`, `app/src/index.css`, `app/src/vitest.setup.ts`

**Interfaces:**
- Produces: `app` workspace with scripts `dev`, `build`, `test`, `tsc`; path alias `@/*` → `app/src/*`; themes `dark` (default) and `light` via `:root[data-theme]` CSS variables consumed by Tailwind/shadcn (`--background`, `--foreground`, `--primary`, `--muted`, `--accent`, `--border`, `--card`).

- [ ] **Step 1: Create the workspace**

`app/package.json`:

```json
{
  "name": "@tomelist/app",
  "private": true,
  "version": "2.0.0-dev",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "tsc": "tsc -p ."
  }
}
```

Install:

```bash
yarn workspace @tomelist/app add react@latest react-dom@latest zustand@latest @tanstack/react-router@latest date-fns@latest @tomelist/schema@workspace:*
yarn workspace @tomelist/app add tailwindcss@latest @tailwindcss/vite@latest
yarn workspace @tomelist/app add -D typescript@latest vite@latest @vitejs/plugin-react@latest vitest@latest jsdom@latest @testing-library/react@latest @testing-library/user-event@latest @testing-library/jest-dom@latest @types/react@latest @types/react-dom@latest @types/node@latest
```

- [ ] **Step 2: Config files**

`app/tsconfig.json`:

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "@testing-library/jest-dom"],
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "vite.config.ts"]
}
```

`app/vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/vitest.setup.ts"],
    globals: true,
  },
});
```

`app/index.html`:

```html
<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Tomelist</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`app/src/index.css`:

```css
@import "tailwindcss";

:root[data-theme="dark"] {
  --background: oklch(0.18 0.02 280);
  --foreground: oklch(0.95 0.01 280);
  --card: oklch(0.23 0.02 280);
  --primary: oklch(0.75 0.15 330);
  --primary-foreground: oklch(0.15 0.02 280);
  --muted: oklch(0.3 0.02 280);
  --muted-foreground: oklch(0.7 0.02 280);
  --accent: oklch(0.35 0.05 330);
  --border: oklch(0.32 0.02 280);
}

:root[data-theme="light"] {
  --background: oklch(0.98 0.005 280);
  --foreground: oklch(0.2 0.02 280);
  --card: oklch(1 0 0);
  --primary: oklch(0.55 0.18 330);
  --primary-foreground: oklch(0.98 0 0);
  --muted: oklch(0.93 0.01 280);
  --muted-foreground: oklch(0.45 0.02 280);
  --accent: oklch(0.9 0.04 330);
  --border: oklch(0.88 0.01 280);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-border: var(--border);
}

body {
  background-color: var(--color-background);
  color: var(--color-foreground);
}
```

`app/src/vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

`app/src/main.tsx` (placeholder until Task 9 wires the router):

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <h1 className="p-4 text-2xl font-bold">Tomelist</h1>
  </StrictMode>
);
```

- [ ] **Step 3: Verify and commit**

Run: `yarn tsc && yarn workspace @tomelist/app run build`
Expected: typecheck clean; `app/dist/` produced.
Also sanity-check dev server: `yarn workspace @tomelist/app run dev` → open http://localhost:5173, see "Tomelist" on a dark background, then stop it.

```bash
git add -A && git commit -m "feat(app): vite + react + tailwind v4 scaffold with dark/light theme variables"
```

---

### Task 6: shadcn/ui setup

**Files:**
- Create: `app/components.json`, `app/src/lib/utils.ts`, `app/src/components/ui/*` (generated)

**Interfaces:**
- Produces: `cn()` helper at `@/lib/utils`; shadcn components `Button`, `Card`, `Badge`, `Tabs` under `@/components/ui/*`.

- [ ] **Step 1: Create `app/components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": { "config": "", "css": "src/index.css", "baseColor": "zinc", "cssVariables": true },
  "aliases": { "components": "@/components", "utils": "@/lib/utils", "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks" },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 2: Install helpers and add components**

```bash
yarn workspace @tomelist/app add clsx@latest tailwind-merge@latest class-variance-authority@latest lucide-react@latest
cd app && yarn dlx shadcn@latest add button card badge tabs -y -o && cd ..
```

If the generator did not create it, create `app/src/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

If generated components reference CSS variables not defined in `index.css` (e.g. `--ring`, `--secondary`, `--destructive`), add them to BOTH theme blocks in `app/src/index.css` and to the `@theme inline` block, copying the `--muted`/`--accent` pattern with sensible values (destructive: a red oklch like `oklch(0.6 0.2 25)`).

- [ ] **Step 3: Verify and commit**

Run: `yarn tsc && yarn workspace @tomelist/app run build`
Expected: clean.

```bash
git add app && git commit -m "feat(app): shadcn/ui with button, card, badge, tabs"
```

---

### Task 7: Event data loading module

**Files:**
- Create: `app/src/lib/events.ts`
- Test: `app/src/lib/events.test.ts`

**Interfaces:**
- Consumes: `@tomelist/schema` (`EventData`), `data/*.json` via Vite glob import.
- Produces:
  - `getAllEvents(): EventData[]` (sorted newest `starts` first)
  - `getEvent(id: string): EventData | undefined`
  - `getActiveEvent(now: Date): EventData | undefined` — event where `starts <= now` and (`ends` is null or `ends >= now`); if none, the most recent past event.
  - `isEventEnded(event: EventData, now: Date): boolean`

- [ ] **Step 1: Write the failing test** — `app/src/lib/events.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getActiveEvent, getAllEvents, getEvent, isEventEnded } from "./events";

describe("event loading", () => {
  it("loads all bundled events", () => {
    const events = getAllEvents();
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].id).toBe("2026-03-mogmog-collection");
  });
  it("getEvent finds by id", () => {
    expect(getEvent("2026-03-mogmog-collection")?.name).toContain("Mogmog");
    expect(getEvent("nope")).toBeUndefined();
  });
  it("active event: within window", () => {
    expect(getActiveEvent(new Date("2026-07-09T00:00:00Z"))?.id).toBe("2026-03-mogmog-collection");
  });
  it("active event: before any event starts falls back to most recent", () => {
    expect(getActiveEvent(new Date("2020-01-01T00:00:00Z"))?.id).toBe("2026-03-mogmog-collection");
  });
  it("open-ended event is not ended", () => {
    const e = getEvent("2026-03-mogmog-collection")!;
    expect(isEventEnded(e, new Date("2026-07-09T00:00:00Z"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `yarn workspace @tomelist/app run test`
Expected: FAIL — `./events` missing.

- [ ] **Step 3: Implement** — `app/src/lib/events.ts`:

```ts
import { eventSchema, type EventData } from "@tomelist/schema";

const modules = import.meta.glob("../../../data/events/*.json", { eager: true }) as Record<
  string,
  { default: unknown }
>;

const events: EventData[] = Object.values(modules)
  .map((m) => eventSchema.parse(m.default))
  .sort((a, b) => (a.starts < b.starts ? 1 : -1));

export function getAllEvents(): EventData[] {
  return events;
}

export function getEvent(id: string): EventData | undefined {
  return events.find((e) => e.id === id);
}

export function isEventEnded(event: EventData, now: Date): boolean {
  return event.ends !== null && new Date(event.ends) < now;
}

export function getActiveEvent(now: Date): EventData | undefined {
  const live = events.find(
    (e) => new Date(e.starts) <= now && (e.ends === null || new Date(e.ends) >= now)
  );
  return live ?? events[0];
}
```

- [ ] **Step 4: Verify pass and commit**

Run: `yarn workspace @tomelist/app run test && yarn tsc`
Expected: PASS.

```bash
git add app/src/lib && git commit -m "feat(app): bundled event data loader with active-event resolution"
```

---

### Task 8: Zustand store with persistence

**Files:**
- Create: `app/src/store/useAppStore.ts`
- Test: `app/src/store/useAppStore.test.ts`

**Interfaces:**
- Consumes: `@tomelist/schema` (`EventProgress`, `WishlistEntry`, `emptyEventProgress`).
- Produces: `useAppStore` (Zustand hook, persisted to localStorage key `"tomelist:v2"`) with state `{ schemaVersion: 1, settings: { theme: string }, events: Record<string, EventProgress>, updatedAt: string }` and actions:
  - `setTheme(theme: string): void`
  - `addTomestones(eventId: string, delta: number): void` (floors at 0)
  - `recordObjective(eventId: string, objectiveId: string, points: number): void` (count+1, adds points)
  - `undoObjective(eventId: string, objectiveId: string, points: number): void` (count−1 floored at 0, subtracts points floored at 0)
  - `cycleWishlist(eventId: string, exchangeId: string): void` (absent → wanted/want → removed)
  - `setWishlistTier(eventId: string, exchangeId: string, tier: WishlistEntry["tier"]): void`
  - `markExchanged(eventId: string, exchangeId: string, cost: number): void` (status → exchanged, deduct cost floored at 0)
  - `getProgress(eventId: string): EventProgress` (selector helper, returns empty progress if absent)

- [ ] **Step 1: Write the failing test** — `app/src/store/useAppStore.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `yarn workspace @tomelist/app run test`
Expected: FAIL — `./useAppStore` missing.

- [ ] **Step 3: Implement** — `app/src/store/useAppStore.ts`:

```ts
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
```

- [ ] **Step 4: Verify pass and commit**

Run: `yarn workspace @tomelist/app run test && yarn tsc`
Expected: PASS.

```bash
git add app/src/store && git commit -m "feat(app): persisted zustand store with objective/wishlist/wallet actions"
```

---

### Task 9: Router shell, layout, theme application

**Files:**
- Create: `app/src/router.tsx`, `app/src/components/Layout.tsx`, `app/src/components/EventShell.tsx`
- Modify: `app/src/main.tsx`
- Test: `app/src/router.test.tsx`

**Interfaces:**
- Consumes: `getActiveEvent`, `getEvent`, `useAppStore`.
- Produces: routes `/` (redirect to active event overview), `/$eventId/overview`, `/$eventId/objectives`, `/$eventId/exchanges`, `/$eventId/settings`. `EventShell` provides bottom tab nav (mobile) / top nav (sm+) and renders children via `<Outlet />`. Placeholder page components are defined inline here and replaced by Tasks 10–12 (`OverviewPage`, `ObjectivesPage`, `ExchangesPage`, `SettingsPage` — each exported from `app/src/pages/<Name>.tsx` starting in their tasks; until then this task creates stub files).

- [ ] **Step 1: Create stub pages** — create these four files, each following this pattern (replace Name accordingly):

`app/src/pages/OverviewPage.tsx` (same pattern for `ObjectivesPage.tsx`, `ExchangesPage.tsx`, `SettingsPage.tsx`):

```tsx
export function OverviewPage() {
  return <div data-testid="overview-page">Overview</div>;
}
```

(Test ids: `overview-page`, `objectives-page`, `exchanges-page`, `settings-page`.)

- [ ] **Step 2: Write the failing test** — `app/src/router.test.tsx`:

```tsx
import { RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createAppRouter } from "./router";

describe("router", () => {
  it("root redirects to the active event overview", async () => {
    const router = createAppRouter();
    await router.navigate({ to: "/" });
    render(<RouterProvider router={router} />);
    expect(await screen.findByTestId("overview-page")).toBeInTheDocument();
    expect(router.state.location.pathname).toContain("/2026-03-mogmog-collection/overview");
  });
  it("renders objectives route", async () => {
    const router = createAppRouter();
    render(<RouterProvider router={router} />);
    await router.navigate({ to: "/$eventId/objectives", params: { eventId: "2026-03-mogmog-collection" } });
    expect(await screen.findByTestId("objectives-page")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `yarn workspace @tomelist/app run test`
Expected: FAIL — `./router` missing.

- [ ] **Step 4: Implement**

`app/src/components/Layout.tsx`:

```tsx
import { Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

export function Layout() {
  const theme = useAppStore((s) => s.settings.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return <Outlet />;
}
```

`app/src/components/EventShell.tsx`:

```tsx
import { Link, Outlet, useParams } from "@tanstack/react-router";
import { ListChecks, Home, Settings, ShoppingBag } from "lucide-react";

const tabs = [
  { to: "overview", label: "Overview", Icon: Home },
  { to: "objectives", label: "Objectives", Icon: ListChecks },
  { to: "exchanges", label: "Exchanges", Icon: ShoppingBag },
  { to: "settings", label: "Settings", Icon: Settings },
] as const;

export function EventShell() {
  const { eventId } = useParams({ from: "/$eventId" });
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <main className="flex-1 p-4 pb-20 sm:pb-4 sm:pt-16">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 border-t border-border bg-card sm:bottom-auto sm:top-0 sm:border-b sm:border-t-0">
        <div className="mx-auto flex max-w-3xl justify-around">
          {tabs.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={`/$eventId/${to}`}
              params={{ eventId }}
              className="flex min-h-14 min-w-14 flex-col items-center justify-center gap-0.5 px-3 text-xs text-muted-foreground [&.active]:text-primary"
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
```

`app/src/router.tsx`:

```tsx
import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { EventShell } from "@/components/EventShell";
import { Layout } from "@/components/Layout";
import { getActiveEvent } from "@/lib/events";
import { ExchangesPage } from "@/pages/ExchangesPage";
import { ObjectivesPage } from "@/pages/ObjectivesPage";
import { OverviewPage } from "@/pages/OverviewPage";
import { SettingsPage } from "@/pages/SettingsPage";

const rootRoute = createRootRoute({ component: Layout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    const active = getActiveEvent(new Date());
    if (active) {
      throw redirect({ to: "/$eventId/overview", params: { eventId: active.id } });
    }
  },
});

const eventRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/$eventId",
  component: EventShell,
});

const overviewRoute = createRoute({ getParentRoute: () => eventRoute, path: "/overview", component: OverviewPage });
const objectivesRoute = createRoute({ getParentRoute: () => eventRoute, path: "/objectives", component: ObjectivesPage });
const exchangesRoute = createRoute({ getParentRoute: () => eventRoute, path: "/exchanges", component: ExchangesPage });
const settingsRoute = createRoute({ getParentRoute: () => eventRoute, path: "/settings", component: SettingsPage });

const routeTree = rootRoute.addChildren([
  indexRoute,
  eventRoute.addChildren([overviewRoute, objectivesRoute, exchangesRoute, settingsRoute]),
]);

export function createAppRouter() {
  return createRouter({ routeTree });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
```

Replace `app/src/main.tsx`:

```tsx
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createAppRouter } from "./router";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={createAppRouter()} />
  </StrictMode>
);
```

- [ ] **Step 5: Verify pass and commit**

Run: `yarn workspace @tomelist/app run test && yarn tsc && yarn workspace @tomelist/app run build`
Expected: PASS. Also verify visually with `yarn workspace @tomelist/app run dev`: navigating to `/` lands on `/2026-03-mogmog-collection/overview` with a bottom tab bar on a narrow window.

```bash
git add app/src && git commit -m "feat(app): tanstack router shell with event-scoped routes and tab nav"
```

---

### Task 10: Overview page — wallet steppers + countdown

**Files:**
- Replace: `app/src/pages/OverviewPage.tsx`
- Create: `app/src/components/WalletStepper.tsx`
- Test: `app/src/pages/OverviewPage.test.tsx`

**Interfaces:**
- Consumes: `useAppStore` (`addTomestones`, `getProgress`), `getEvent`, `isEventEnded`, shadcn `Button`/`Card`.
- Produces: `OverviewPage` reading `eventId` from route params; `WalletStepper` props `{ eventId: string }`.

- [ ] **Step 1: Write the failing test** — `app/src/pages/OverviewPage.test.tsx`:

```tsx
import { RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/store/useAppStore";
import { createAppRouter } from "@/router";

const E = "2026-03-mogmog-collection";

async function renderOverview() {
  const router = createAppRouter();
  render(<RouterProvider router={router} />);
  await router.navigate({ to: "/$eventId/overview", params: { eventId: E } });
  await screen.findByTestId("overview-page");
}

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ events: {} });
});

describe("OverviewPage", () => {
  it("shows the wallet and event name", async () => {
    await renderOverview();
    expect(screen.getByText(/Mogmog Collection/)).toBeInTheDocument();
    expect(screen.getByTestId("wallet-count")).toHaveTextContent("0");
  });
  it("steppers adjust the wallet", async () => {
    await renderOverview();
    await userEvent.click(screen.getByRole("button", { name: "+10" }));
    await userEvent.click(screen.getByRole("button", { name: "+1" }));
    expect(screen.getByTestId("wallet-count")).toHaveTextContent("11");
    await userEvent.click(screen.getByRole("button", { name: "-1" }));
    expect(screen.getByTestId("wallet-count")).toHaveTextContent("10");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `yarn workspace @tomelist/app run test`
Expected: OverviewPage tests FAIL (stub has no wallet).

- [ ] **Step 3: Implement**

`app/src/components/WalletStepper.tsx`:

```tsx
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";

export function WalletStepper({ eventId }: { eventId: string }) {
  const tomestones = useAppStore((s) => (s.events[eventId] ?? { tomestones: 0 }).tomestones);
  const addTomestones = useAppStore((s) => s.addTomestones);
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="flex flex-col gap-1">
        <Button variant="outline" size="lg" onClick={() => addTomestones(eventId, -10)}>-10</Button>
        <Button variant="outline" size="lg" onClick={() => addTomestones(eventId, -1)}>-1</Button>
      </div>
      <div data-testid="wallet-count" className="min-w-24 text-center text-5xl font-bold tabular-nums">
        {tomestones}
      </div>
      <div className="flex flex-col gap-1">
        <Button variant="outline" size="lg" onClick={() => addTomestones(eventId, 10)}>+10</Button>
        <Button variant="outline" size="lg" onClick={() => addTomestones(eventId, 1)}>+1</Button>
      </div>
    </div>
  );
}
```

Replace `app/src/pages/OverviewPage.tsx`:

```tsx
import { useParams } from "@tanstack/react-router";
import { formatDistanceToNowStrict } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletStepper } from "@/components/WalletStepper";
import { getEvent, isEventEnded } from "@/lib/events";

export function OverviewPage() {
  const { eventId } = useParams({ from: "/$eventId" });
  const event = getEvent(eventId);
  if (!event) return <div data-testid="overview-page">Unknown event.</div>;
  const now = new Date();
  const ended = isEventEnded(event, now);
  return (
    <div data-testid="overview-page" className="flex flex-col gap-4">
      <header className="text-center">
        <h1 className="text-xl font-bold">{event.name}</h1>
        <p className="text-sm text-muted-foreground">
          {ended
            ? "Event ended"
            : event.ends
              ? `Ends in ${formatDistanceToNowStrict(new Date(event.ends))}`
              : (event.endsLabel ?? "Ongoing")}
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-sm text-muted-foreground">
            {event.tomestone.name}s
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WalletStepper eventId={eventId} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Verify pass and commit**

Run: `yarn workspace @tomelist/app run test && yarn tsc`
Expected: PASS.

```bash
git add app/src && git commit -m "feat(app): overview page with wallet steppers and event countdown"
```

---

### Task 11: Objectives page

**Files:**
- Replace: `app/src/pages/ObjectivesPage.tsx`
- Test: `app/src/pages/ObjectivesPage.test.tsx`

**Interfaces:**
- Consumes: `getEvent`, `useAppStore` (`recordObjective`, `undoObjective`), shadcn `Badge`/`Button`/`Card`.
- Produces: `ObjectivesPage` — objectives grouped by `kind` in order standard → weekly → minimog → ultimog; each row shows title, points, effort badge, current count, a "Did it" button (`recordObjective`) and an undo button (aria-label `Undo <title>`); non-repeatable objectives with count ≥ 1 show "Done" and disable "Did it".

- [ ] **Step 1: Write the failing test** — `app/src/pages/ObjectivesPage.test.tsx`:

```tsx
import { RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/store/useAppStore";
import { createAppRouter } from "@/router";

const E = "2026-03-mogmog-collection";

async function renderObjectives() {
  const router = createAppRouter();
  render(<RouterProvider router={router} />);
  await router.navigate({ to: "/$eventId/objectives", params: { eventId: E } });
  await screen.findByTestId("objectives-page");
}

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ events: {} });
});

describe("ObjectivesPage", () => {
  it("renders kind group headers", async () => {
    await renderObjectives();
    expect(screen.getByRole("heading", { name: /Standard/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Ultimog/i })).toBeInTheDocument();
  });
  it("did-it increments count and wallet", async () => {
    await renderObjectives();
    const row = screen.getByTestId("objective-obj-moogle-dungeons");
    await userEvent.click(within(row).getByRole("button", { name: /did it/i }));
    expect(useAppStore.getState().getProgress(E).tomestones).toBe(10);
    expect(within(row).getByTestId("objective-count")).toHaveTextContent("1");
  });
  it("one-time objective disables after completion", async () => {
    await renderObjectives();
    const row = screen.getByTestId("objective-obj-ultimog-msq");
    await userEvent.click(within(row).getByRole("button", { name: /did it/i }));
    expect(within(row).getByRole("button", { name: /done/i })).toBeDisabled();
  });
});
```

Add `import { within } from "@testing-library/react";` merged into the existing import line.

- [ ] **Step 2: Run to verify failure**

Run: `yarn workspace @tomelist/app run test`
Expected: ObjectivesPage tests FAIL.

- [ ] **Step 3: Implement** — replace `app/src/pages/ObjectivesPage.tsx`:

```tsx
import { useParams } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getEvent } from "@/lib/events";
import { useAppStore } from "@/store/useAppStore";
import type { Objective } from "@tomelist/schema";

const kindOrder = ["standard", "weekly", "minimog", "ultimog"] as const;
const kindLabels: Record<(typeof kindOrder)[number], string> = {
  standard: "Standard Objectives",
  weekly: "Weekly Objective",
  minimog: "Minimog Challenges",
  ultimog: "Ultimog Challenges",
};

function ObjectiveRow({ eventId, objective }: { eventId: string; objective: Objective }) {
  const count = useAppStore(
    (s) => s.events[eventId]?.completedObjectives[objective.id]?.count ?? 0
  );
  const recordObjective = useAppStore((s) => s.recordObjective);
  const undoObjective = useAppStore((s) => s.undoObjective);
  const exhausted = objective.repeatable === false && count >= 1;
  return (
    <Card data-testid={`objective-${objective.id}`}>
      <CardContent className="flex items-center gap-3 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{objective.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant="secondary">{objective.points} tomes</Badge>
            <Badge variant="outline">{objective.effort}</Badge>
            <span>{objective.category}</span>
            {objective.requirement ? <span>· {objective.requirement}</span> : null}
          </div>
        </div>
        <span data-testid="objective-count" className="text-lg font-bold tabular-nums">
          {count}
        </span>
        <Button
          size="sm"
          disabled={exhausted}
          onClick={() => recordObjective(eventId, objective.id, objective.points)}
        >
          {exhausted ? "Done" : "Did it"}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Undo ${objective.title}`}
          disabled={count === 0}
          onClick={() => undoObjective(eventId, objective.id, objective.points)}
        >
          <RotateCcw className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

export function ObjectivesPage() {
  const { eventId } = useParams({ from: "/$eventId" });
  const event = getEvent(eventId);
  if (!event) return <div data-testid="objectives-page">Unknown event.</div>;
  return (
    <div data-testid="objectives-page" className="flex flex-col gap-6">
      {kindOrder.map((kind) => {
        const group = event.objectives.filter((o) => o.kind === kind);
        if (group.length === 0) return null;
        return (
          <section key={kind} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {kindLabels[kind]}
            </h2>
            {group.map((o) => (
              <ObjectiveRow key={o.id} eventId={eventId} objective={o} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Verify pass and commit**

Run: `yarn workspace @tomelist/app run test && yarn tsc`
Expected: PASS.

```bash
git add app/src && git commit -m "feat(app): objectives page with grouped one-tap tracking"
```

---

### Task 12: Exchanges page

**Files:**
- Replace: `app/src/pages/ExchangesPage.tsx`
- Test: `app/src/pages/ExchangesPage.test.tsx`

**Interfaces:**
- Consumes: `getEvent`, `useAppStore` (`cycleWishlist`, `markExchanged`), shadcn components.
- Produces: `ExchangesPage` — each exchange row shows name, cost, type; tapping the row body toggles wishlist (`cycleWishlist`); wanted items show a "Mark exchanged" button (`markExchanged`); exchanged items show an "Exchanged" badge. A summary line shows total cost of wanted items.

- [ ] **Step 1: Write the failing test** — `app/src/pages/ExchangesPage.test.tsx`:

```tsx
import { RouterProvider } from "@tanstack/react-router";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/store/useAppStore";
import { createAppRouter } from "@/router";

const E = "2026-03-mogmog-collection";

async function renderExchanges() {
  const router = createAppRouter();
  render(<RouterProvider router={router} />);
  await router.navigate({ to: "/$eventId/exchanges", params: { eventId: E } });
  await screen.findByTestId("exchanges-page");
}

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ events: {} });
});

describe("ExchangesPage", () => {
  it("lists exchange items with costs", async () => {
    await renderExchanges();
    expect(screen.getByText("Fat Cat Parasol")).toBeInTheDocument();
    expect(screen.getByTestId("exchange-fat-cat-parasol")).toHaveTextContent("50");
  });
  it("tapping an item wants it and updates the summary", async () => {
    await renderExchanges();
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    expect(screen.getByTestId("wanted-total")).toHaveTextContent("50");
  });
  it("mark exchanged deducts wallet", async () => {
    useAppStore.getState().addTomestones(E, 60);
    await renderExchanges();
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    const row = screen.getByTestId("exchange-fat-cat-parasol");
    await userEvent.click(within(row).getByRole("button", { name: /mark exchanged/i }));
    expect(useAppStore.getState().getProgress(E).tomestones).toBe(10);
    expect(within(row).getByText(/exchanged/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `yarn workspace @tomelist/app run test`
Expected: ExchangesPage tests FAIL.

- [ ] **Step 3: Implement** — replace `app/src/pages/ExchangesPage.tsx`:

```tsx
import { useParams } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getEvent } from "@/lib/events";
import { useAppStore } from "@/store/useAppStore";
import type { Exchange } from "@tomelist/schema";

function ExchangeRow({ eventId, item }: { eventId: string; item: Exchange }) {
  const entry = useAppStore((s) => s.events[eventId]?.wishlist[item.id]);
  const cycleWishlist = useAppStore((s) => s.cycleWishlist);
  const markExchanged = useAppStore((s) => s.markExchanged);
  return (
    <Card data-testid={`exchange-${item.id}`}>
      <CardContent className="flex items-center gap-3 p-3">
        <button
          type="button"
          aria-label={`Want ${item.name}`}
          onClick={() => cycleWishlist(eventId, item.id)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate font-medium">{item.name}</p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant="secondary">{item.cost} tomes</Badge>
            <span>{item.type}</span>
            {item.tradeable ? <Badge variant="outline">tradeable</Badge> : null}
          </div>
        </button>
        {entry?.status === "exchanged" ? (
          <Badge>Exchanged</Badge>
        ) : entry?.status === "wanted" ? (
          <Button size="sm" onClick={() => markExchanged(eventId, item.id, item.cost)}>
            Mark exchanged
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ExchangesPage() {
  const { eventId } = useParams({ from: "/$eventId" });
  const event = getEvent(eventId);
  const wishlist = useAppStore((s) => s.events[eventId]?.wishlist ?? {});
  if (!event) return <div data-testid="exchanges-page">Unknown event.</div>;
  const wantedTotal = event.exchanges
    .filter((e) => wishlist[e.id]?.status === "wanted")
    .reduce((sum, e) => sum + e.cost, 0);
  return (
    <div data-testid="exchanges-page" className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Wishlist total: <span data-testid="wanted-total" className="font-bold text-foreground">{wantedTotal}</span> tomes
      </p>
      {event.exchanges.map((item) => (
        <ExchangeRow key={item.id} eventId={eventId} item={item} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Verify pass and commit**

Run: `yarn workspace @tomelist/app run test && yarn tsc`
Expected: PASS.

```bash
git add app/src && git commit -m "feat(app): exchanges page with wishlist + mark-exchanged wallet deduction"
```

---

### Task 13: Settings page (theme picker + event switcher) and CI

**Files:**
- Replace: `app/src/pages/SettingsPage.tsx`
- Modify: `.github/workflows/node.js.yml`
- Test: `app/src/pages/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `useAppStore.setTheme`, `getAllEvents`, `isEventEnded`, TanStack `Link`.
- Produces: SettingsPage with theme buttons (`dark`, `light`) and a list of all events linking to their overview (ended ones badged "Ended"); real CI.

- [ ] **Step 1: Write the failing test** — `app/src/pages/SettingsPage.test.tsx`:

```tsx
import { RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/store/useAppStore";
import { createAppRouter } from "@/router";

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ settings: { theme: "dark" } });
});

describe("SettingsPage", () => {
  it("switches theme", async () => {
    const router = createAppRouter();
    render(<RouterProvider router={router} />);
    await router.navigate({ to: "/$eventId/settings", params: { eventId: "2026-03-mogmog-collection" } });
    await screen.findByTestId("settings-page");
    await userEvent.click(screen.getByRole("button", { name: /light/i }));
    expect(useAppStore.getState().settings.theme).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
  it("lists events", async () => {
    const router = createAppRouter();
    render(<RouterProvider router={router} />);
    await router.navigate({ to: "/$eventId/settings", params: { eventId: "2026-03-mogmog-collection" } });
    await screen.findByTestId("settings-page");
    expect(screen.getByRole("link", { name: /Mogmog Collection/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure, then implement** — replace `app/src/pages/SettingsPage.tsx`:

```tsx
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAllEvents, isEventEnded } from "@/lib/events";
import { useAppStore } from "@/store/useAppStore";

export function SettingsPage() {
  const theme = useAppStore((s) => s.settings.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const now = new Date();
  return (
    <div data-testid="settings-page" className="flex flex-col gap-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Theme</h2>
        <div className="flex gap-2">
          {(["dark", "light"] as const).map((t) => (
            <Button key={t} variant={theme === t ? "default" : "outline"} onClick={() => setTheme(t)}>
              {t}
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

Run: `yarn workspace @tomelist/app run test` — expect PASS.

- [ ] **Step 3: Real CI** — replace `.github/workflows/node.js.yml`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
      - run: corepack enable
      - run: yarn install --immutable
      - run: yarn tsc
      - run: yarn test
      - run: yarn build
  deploy:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
      - run: corepack enable
      - run: yarn install --immutable
      - run: yarn build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

(The deploy job will fail until Task 14 adds `wrangler.jsonc` and the user adds repo secrets — acceptable on this branch; do not merge to main before Task 14.)

- [ ] **Step 4: Commit**

```bash
git add app/src .github && git commit -m "feat(app): settings page with theme + event switcher; rebuild CI"
```

---

### Task 14: PWA + Cloudflare Worker hosting

**Files:**
- Modify: `app/vite.config.ts`, `app/package.json`
- Create: `app/public/icon.svg`, `wrangler.jsonc`

**Interfaces:**
- Produces: installable PWA (autoUpdate service worker); `wrangler.jsonc` serving `app/dist` as a single-page app.

- [ ] **Step 1: PWA plugin**

```bash
yarn workspace @tomelist/app add -D vite-plugin-pwa@latest
```

Create `app/public/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#2a2438"/>
  <circle cx="256" cy="230" r="120" fill="#e37fbe"/>
  <circle cx="256" cy="110" r="34" fill="#f2c14e"/>
  <rect x="252" y="130" width="8" height="60" fill="#f2c14e"/>
  <text x="256" y="430" font-family="sans-serif" font-size="72" font-weight="bold" fill="#f5f2fa" text-anchor="middle">TOMELIST</text>
</svg>
```

In `app/vite.config.ts`, add to imports: `import { VitePWA } from "vite-plugin-pwa";` and extend `plugins`:

```ts
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Tomelist",
        short_name: "Tomelist",
        description: "FFXIV Moogle Treasure Trove tracker",
        theme_color: "#2a2438",
        background_color: "#2a2438",
        display: "standalone",
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
```

Generate PNG icons:

```bash
yarn workspace @tomelist/app add -D @vite-pwa/assets-generator
cd app && yarn dlx @vite-pwa/assets-generator --preset minimal public/icon.svg && cd ..
```

If the generator emits differently named files, update the manifest `icons` array to the actual filenames in `app/public/`.

- [ ] **Step 2: Wrangler config** — create `wrangler.jsonc` at repo root:

```jsonc
{
  "name": "tomelist",
  "compatibility_date": "2026-07-01",
  "assets": {
    "directory": "./app/dist",
    "not_found_handling": "single-page-application"
  }
}
```

- [ ] **Step 3: Verify build + local preview**

Run: `yarn build && yarn dlx wrangler@latest dev`
Expected: build emits service worker (`app/dist/sw.js`); wrangler serves the app at http://localhost:8787 and deep links like `/2026-03-mogmog-collection/objectives` load (SPA fallback works). Stop wrangler.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: PWA manifest/service worker + cloudflare assets worker config"
```

**Manual step for the user (flag in the PR description):** create a Cloudflare API token (Workers deploy permissions) and add `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` repo secrets before merging.

---

### Task 15: Authoring scripts (Lodestone + FFXIV Collect → draft JSON)

**Files:**
- Create: `scripts/fetch-rewards.ts`, `scripts/README.md`

**Interfaces:**
- Consumes: `@tomelist/schema` types; `https://ffxivcollect.com/api/tomestones` (public, no key).
- Produces: `scripts/fetch-rewards.ts` runnable via `yarn dlx tsx scripts/fetch-rewards.ts <tomestone-name> > draft.json` emitting a draft `exchanges` array for manual audit.

- [ ] **Step 1: Write the script** — `scripts/fetch-rewards.ts`:

```ts
/**
 * Draft-generates the `exchanges` array for an event from FFXIV Collect.
 * Usage: yarn dlx tsx scripts/fetch-rewards.ts "Aphorism" > draft-exchanges.json
 * Output requires manual audit against the in-game shop / Lodestone table.
 */
type CollectRow = {
  id: number;
  name: string;
  type: string;
  cost: number;
  tomestone: string;
  tradeable: boolean;
  sources: { type: string; text: string }[];
};

const tomestone = process.argv[2];
if (!tomestone) {
  console.error("Usage: tsx scripts/fetch-rewards.ts <tomestone-name>");
  process.exit(1);
}

const res = await fetch("https://ffxivcollect.com/api/tomestones");
if (!res.ok) throw new Error(`FFXIV Collect returned ${res.status}`);
const body = (await res.json()) as { results: { collectables: CollectRow[] } };

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const seen = new Set<string>();
const exchanges = body.results.collectables
  .filter((r) => r.tomestone.toLowerCase() === tomestone.toLowerCase())
  .filter((r) => (seen.has(slug(r.name)) ? false : (seen.add(slug(r.name)), true)))
  .map((r) => ({
    id: slug(r.name),
    name: r.name,
    cost: r.cost,
    type: r.type,
    tradeable: r.tradeable,
    ...(r.sources.filter((s) => s.type !== "Event").length > 0
      ? { altSources: r.sources.filter((s) => s.type !== "Event").map(({ type, text }) => ({ type, text })) }
      : {}),
    collectId: r.id,
    notes: "DRAFT — audit against in-game shop",
  }));

console.log(JSON.stringify(exchanges, null, 2));
console.error(`\n${exchanges.length} items for tomestone "${tomestone}"`);
```

- [ ] **Step 2: Write `scripts/README.md`**

```markdown
# Event authoring

Per new event:
1. Find the irregular tomestone's name (Lodestone event page / in-game).
2. `yarn dlx tsx scripts/fetch-rewards.ts "<Tomestone Name>" > draft-exchanges.json`
3. Audit the draft against the in-game exchange shop; fix costs/names; remove non-event items.
4. Transcribe objectives from the in-game Mogpendium into the event JSON by hand
   (kinds: standard | weekly | minimog | ultimog; assign effort: quick | medium | long).
5. Create `data/events/<id>.json`, add the event to `data/manifest.json`.
6. `yarn validate:data` must pass. Open a PR; merging deploys.
```

- [ ] **Step 3: Verify and commit**

Run: `yarn dlx tsx scripts/fetch-rewards.ts "Tenfold Pageantry" | head -20`
Expected: JSON array of items (Fat Cat Parasol among them); count on stderr.

```bash
git add scripts && git commit -m "feat(scripts): FFXIV Collect draft-exchanges authoring script"
```

---

### Task 16: README, CLAUDE.md refresh, Surge retirement page

**Files:**
- Modify: `README.md`, `CLAUDE.md`
- Create: `surge-redirect/index.html`

**Interfaces:**
- Produces: docs matching the new architecture; a redirect page the user deploys to Surge once the Cloudflare URL exists.

- [ ] **Step 1: Rewrite `README.md`** — describe: what Tomelist is, the workspace layout (`app`, `packages/schema`, `data`, `scripts`), commands (`yarn dev` note: `yarn workspace @tomelist/app run dev`, `yarn tsc`, `yarn test`, `yarn build`, `yarn validate:data`), the event authoring flow (link `scripts/README.md`), and deployment (CI on main → Cloudflare Worker). Remove all CRA/Surge-era instructions.

- [ ] **Step 2: Update `CLAUDE.md`** — rewrite the Commands and Architecture sections to match the new monorepo (workspaces, bundled data flow: `data/` → `app/src/lib/events.ts` → routes; state in `app/src/store/useAppStore.ts`; schemas in `packages/schema`). Keep the "What this is" intro, updated for multi-event support.

- [ ] **Step 3: Create `surge-redirect/index.html`** (deployed manually by the user AFTER the Cloudflare URL is known; replace `REPLACE_WITH_DEPLOYED_URL` at deploy time):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Tomelist has moved</title>
    <meta http-equiv="refresh" content="3;url=REPLACE_WITH_DEPLOYED_URL" />
  </head>
  <body style="font-family: sans-serif; text-align: center; padding-top: 4rem; background: #2a2438; color: #f5f2fa">
    <h1>Tomelist has moved, kupo!</h1>
    <p><a style="color: #e37fbe" href="REPLACE_WITH_DEPLOYED_URL">Take me to the new Tomelist</a></p>
  </body>
</html>
```

User deploy command (documented in README, run manually): `cp surge-redirect/index.html surge-redirect/200.html && npx surge ./surge-redirect https://tomelist.surge.sh`

- [ ] **Step 4: Final verification and commit**

Run: `yarn tsc && yarn test && yarn build && yarn validate:data`
Expected: all PASS.

```bash
git add -A && git commit -m "docs: README/CLAUDE.md for v2 monorepo + surge retirement page"
```

---

## Post-plan notes (for the session driving execution)

- Execute on a branch (e.g. `rebuild/phase-1`), PR to main only when Tasks 1–14 are done and the user has added the Cloudflare secrets, since main-merge triggers deploy.
- After merge: user runs the surge redirect deploy (Task 16 step 3) with the real workers.dev URL.
- File each task as an issue in the "Tomelist Backlog" project with Phase = "Phase 1 — Tracker".
