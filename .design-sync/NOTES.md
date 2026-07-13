# design-sync notes for Tomelist

## Repo shape

`@tomelist/app` is an SPA (`vite build` → `dist/index.html` + hashed assets), not a packaged
component library — there's no `dist/index.es.js` with named exports. The converter falls back to
synth-entry mode (reads `app/src` directly via esbuild + ts-morph), which is why `cfg.shape` is
pinned to `"package"` and no `buildCmd`-driven library build exists.

## Why `.design-sync/overrides/source-kit.mjs` is forked

Package-shape synth-entry bundles EVERY `.tsx`/`.jsx` under `srcRoot` into one `export * from`
barrel, which then compiles into a single IIFE (`_ds_bundle.js`). Two classes of file break that:

1. **`app/src/main.tsx`** — the Vite bootstrap: imports global `index.css` (which the esbuild IIFE
   can't resolve — `tailwindcss` v4's package.json isn't resolvable outside the Vite/PostCSS
   plugin) and calls `createRoot().render()` as a module-level side effect.
2. **`router.tsx`** — the route table + `createAppRouter` factory, not a component.

The fork excludes those via `BOOTSTRAP_RX` (see the file's header comment).

## Router + event-data shim (2026-07-12)

The formerly excluded event-data/router components (`EventShell`, `EventSwitcher`,
`ProgressHud`, `ObjectivesPage`, `ExchangesPage`, `OverviewPage`, `SettingsPage`, plus the
newer `PlannerPage`/`BudgetSummary`/`RunNext`) are **now synced with real previews**, via:

- **`app/src/lib/events.ts`** wraps its `import.meta.glob` call in try/catch (throws under the
  esbuild IIFE, where it's replaced by the literal under Vite) and parses events **lazily at
  first accessor call**, falling back to `globalThis.__tomelistEventModules` when the glob
  produced nothing. Lazy matters: module evaluation order inside the IIFE barrel is
  alphabetical, so the registry module may evaluate after events.ts.
- **`app/src/design-sync/preview-data.tsx`** (design-sync-only, auto-included in the barrel)
  statically imports `data/events/2026-03-mogmog-collection.json` and assigns the registry.
- **`app/src/design-sync/preview-router.tsx`** exports `PreviewRouter` — a memory-history
  TanStack router whose `/$eventId` route renders the preview children (+ an Outlet feeding a
  `$` splat that renders null), navigated to `/{eventId}/{tab}`. Every router-dependent preview
  wraps its component in it. `PreviewRouter` is nulled in `componentSrcMap` (bundle export, not
  a synced component).
- **EventShell is `cardMode: "single"`** (cfg.overrides) — its fixed-position nav overflows
  grid cells.
- Preview store seeds are guarded/delta-style AND **shared across previews** (one localStorage
  per capture run): the sample event ends with miners-earring (must) + fat-cat-parasol (want)
  wanted and wallet 80, so e.g. the HUD shows 80/150.

## Re-sync risks / future work
- **`cfg.cssEntry` points at `app/dist/tomelist-compiled.css`**, a copy of the Vite-built,
  content-hashed CSS chunk (`app/dist/assets/index-*.css`) made stable by `cfg.buildCmd`'s `cp`
  step. `app/dist/` is gitignored and rebuilt fresh each time — **always re-run `cfg.buildCmd`
  before a re-sync** (`resync.mjs` doesn't run it for you), or `cssEntry` points at a stale/missing
  file.
- **`ThemeRoot` (`app/src/design-sync/theme-root.tsx`)** is a design-sync-only file (not used by
  the real app) that sets `data-theme`/`data-palette` on `<html>` via `useLayoutEffect` and wraps
  children in `bg-background text-foreground` — without it every component renders against
  unresolved CSS custom properties (browser-default colors) since Tomelist's whole token system
  is scoped to `:root[data-theme][data-palette]`. If this file is ever deleted, the render check
  will show near-black/blank previews with no obvious tag — this note is the only trace.
- **Synced set is now 21 components** (general: Badge/Button/Card family/Layout/WalletStepper/
  EventShell/EventSwitcher/ProgressHud/BudgetSummary/RunNext; pages: Overview/Objectives/
  Planner/Exchanges/Settings). Only Layout and the Card sub-parts remain floor cards. `CardAction`/`CardContent`/`CardDescription`/`CardFooter`/`CardHeader`/
  `CardTitle` render legitimately blank on the floor card (no children by default) —
  `[RENDER_BLANK]` warnings for these are expected, not a regression to chase.
- **Tabs was dropped 2026-07-12**: `app/src/components/ui/tabs.tsx` was scaffolded but never
  imported and had no planned use, so the source, its authored preview, and its 4 synced
  components (Tabs/TabsList/TabsTrigger/TabsContent) were deleted to keep the designed set tight.
- `Badge`, `Button`, `Card` (as a family), and `WalletStepper` have rich authored previews.
- **Layout stays on the floor card permanently**: it renders only a router `<Outlet />` — its
  entire visible job is applying theme attributes as a side effect — so an authored preview
  would have to invent content the component doesn't render. Don't author one.
- **`useAppStore` is in `cfg.extraEntries`** (`./src/store/useAppStore.ts`) so previews can
  import it from `@tomelist/app` — the synth-entry barrel only includes `.tsx`/`.jsx` files, so
  without this the store hook isn't a bundle export and imports come back undefined.
- **WalletStepper's preview seeds the store delta-style** (targets an absolute 240): the zustand
  store persists to localStorage across capture page loads, so a plain `addTomestones(+240)`
  accumulates run over run and the screenshot drifts (first symptom: 720 in the sheet).

## Known render warns

- `[RENDER_BLANK]` on `CardAction`/`CardContent`/`CardDescription`/`CardFooter`/`CardHeader`/
  `CardTitle` — expected (see above), not new.

- Layout's floor card logs `TypeError: Cannot read properties of null (reading 'stores')` —
  its `<Outlet/>` mounts outside any RouterProvider. Expected; the floor-card text still
  renders and Layout is deliberately unauthored.

## Fonts

No `@font-face` rules in the compiled CSS — Tomelist uses Tailwind's default system font stack
(`font-sans`). No `cfg.extraFonts`/`runtimeFontPrefixes` needed.
