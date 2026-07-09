# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Tomelist is a single-page React app that helps FFXIV (Final Fantasy XIV) players track tomestone
farming progress during seasonal "Treasure Trove" / tomestone events. Users select which duties
(dungeons/instances) they've cleared and which items they want to exchange for, and the app tracks
running totals against event goals. State persists to `localStorage` so progress survives reloads.

## Commands

- `yarn start` — run the dev server (CRA, http://localhost:3000)
- `yarn build` — production build to `build/`
- `yarn run tsc` — typecheck (this is what CI runs instead of `yarn test`)
- `yarn test` — CRA/Jest test runner in watch mode (not currently run in CI — see `.github/workflows/node.js.yml`)
- `yarn deploy` — build, rename `index.html` to `200.html` (SPA fallback for Surge), and publish to
  `tomelist.surge.sh` via `surge`. Requires `SURGE_LOGIN`/`SURGE_TOKEN`; in CI this only runs on `main`
  after build+typecheck succeed.

Package manager is Yarn 4 (Berry, `nodeLinker: node-modules`, see `.yarnrc.yml`). Node version is
pinned in `.nvmrc` (v20.11.1).

## Architecture

**Data flow is one-way and event-data-driven:**

1. `useGetEventData` (`src/hooks/useGetEventData.tsx`) fetches the current event's data at runtime
   from a public GitHub Gist JSON URL (not bundled with the app). This is how event content
   (objectives, exchange items, start/end dates) gets updated without a redeploy — swapping events
   each season means updating the Gist and the `DATA_KEY` constant in this file, not shipping new code.
2. `App.tsx` calls this hook once and passes `eventData` down through `NavHeader` and `Info`.
3. `Info.tsx` (`src/pages/Info.tsx`) owns the user's mutable state via `usePersistReducer`
   (`src/hooks/usePersistReducer.tsx`), a `useReducer` wrapped to sync every state change to
   `localStorage` (key `"tomelist"`) through `react-use`'s `useLocalStorage`. This is the only place
   user progress is written; event data itself is never mutated.
4. Two routes under `Info` (`/objectives` and `/exchanges`) render `EventItem`/`ExchangeItem` lists
   built from `eventData`, cross-referenced against the reducer's `state.exchangeSelections` and
   `state.currentTomestones` to compute progress (e.g. `totalRequiredTomes` in `Info.tsx`).

**Content scraping script** (`script/parse.ts`) is a standalone jQuery-style scraper (not part of the
built app or CI) used to help generate the objectives/exchange JSON that gets published to the Gist
consumed by `useGetEventData`. It is not wired into any yarn script — it's a manual authoring aid.

**Styling** uses `theme-ui` (`ThemeUIProvider` in `App.tsx`, theme defined in `src/theme.ts`) with
`@theme-ui/components` (`Box`, `Flex`, `Container`, `Text`, `Link`) rather than plain CSS/className
styling for most components.

**Versioning**: the app displays its own version (footer in `Info.tsx`, document title in
`useUpdateTitle.tsx`) by importing `package.json` directly — bump `version` in `package.json` when
cutting a new release/event.
