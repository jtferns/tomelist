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
2. **Any file importing `@/lib/events`** (`router.tsx`, `EventShell.tsx`, `EventSwitcher.tsx`,
   `ProgressHud.tsx`, `ObjectivesPage.tsx`, `ExchangesPage.tsx`, `OverviewPage.tsx`,
   `SettingsPage.tsx`) — `lib/events.ts` calls `import.meta.glob(...)` at module top level, which
   throws under esbuild's IIFE output format. Because everything lands in ONE bundle, this throw
   killed `window.TomelistApp` assignment for **all** components, not just these files — the
   original symptom was `[BUNDLE_EXPORT] 22/22 not a component on window.TomelistApp`.

The fork excludes both classes of file from the synth-entry barrel via a `BOOTSTRAP_RX` regex
(see the file's header comment) and `cfg.componentSrcMap` nulls out the same names so
`deriveComponentsFromSrc` (which scans ALL src files, not just the barrel) doesn't reintroduce
them as phantom "components" with no corresponding bundle export.

**Consequence: 8 real Tomelist pieces are excluded from this sync entirely** (not even floor
cards) — `EventShell`, `EventSwitcher`, `ProgressHud`, `ObjectivesPage`, `ExchangesPage`,
`OverviewPage`, `SettingsPage`, plus `router.tsx`/`main.tsx` which were never "components." They
all depend on live TanStack Router params and/or real event JSON data loaded via
`import.meta.glob`, neither of which exists in this static bundle.

## Re-sync risks / future work

- **To bring the excluded 7 components in**: would need (a) a working stand-in for
  `getEvent`/`getAllEvents`/`isEventEnded` that doesn't rely on `import.meta.glob` under IIFE —
  e.g. an esbuild `define` swap for `import.meta.glob` itself (returns `{}`), which was
  considered but not implemented because `lib/bundle.mjs` is off-limits to fork per the skill's
  own guidance ("don't fork those; use config overrides") and no config surface exists for
  arbitrary esbuild defines — and (b) a fake `RouterProvider` wrapping `ThemeRoot` with a route
  matching `/$eventId` for the `useParams` calls in `EventShell`/`ProgressHud`/pages.
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
- **8 of 11 synced components are unauthored floor cards** (Card sub-parts, Layout,
  WalletStepper). `CardAction`/`CardContent`/`CardDescription`/`CardFooter`/`CardHeader`/
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

## Fonts

No `@font-face` rules in the compiled CSS — Tomelist uses Tailwind's default system font stack
(`font-sans`). No `cfg.extraFonts`/`runtimeFontPrefixes` needed.
