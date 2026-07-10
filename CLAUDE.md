# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Tomelist is a React PWA that helps FFXIV (Final Fantasy XIV) players track tomestone farming
progress during seasonal "Moogle Treasure Trove" events. Users select which duties (dungeons/
instances) they've cleared and which items they want to exchange for, and the app tracks running
totals against event goals. The app supports multiple events: each event lives at its own route
(`/$eventId/...`) and keeps independent progress, so past and current events can coexist. State
persists to `localStorage` so progress survives reloads.

This is a Yarn workspaces monorepo:

- `app/` (`@tomelist/app`) — the Vite + React app that gets built and deployed.
- `packages/schema/` (`@tomelist/schema`) — Zod schemas for event content and user state, shared by
  the app and by the data-validation tests.
- `data/` — event content JSON (`manifest.json` + `data/events/*.json`), bundled into the app at
  build time.
- `scripts/` — standalone authoring aids (not part of the built app or CI); see `scripts/README.md`.

## Commands

Run from the repo root unless noted:

- `yarn workspace @tomelist/app run dev` — Vite dev server for the app
- `yarn tsc` — typecheck all workspaces (`yarn workspaces foreach -A --topological run tsc`)
- `yarn test` — run all workspace test suites (`yarn workspaces foreach -A run test`, Vitest);
  this includes the `@tomelist/schema` tests, which validate everything under `data/`
- `yarn build` — production build across workspaces, outputs `app/dist`
- `yarn validate:data` — just the data-validation tests (`yarn workspace @tomelist/schema run
  validate:data`), useful when authoring events without rebuilding everything

Package manager is Yarn 4 (Berry, `nodeLinker: node-modules`, see `.yarnrc.yml`). Node version is
pinned in `.nvmrc`. CI (`.github/workflows/node.js.yml`) runs `yarn tsc`, `yarn test`, and
`yarn build` on every push/PR, and on `main` additionally deploys `app/dist` to a Cloudflare Worker
(`wrangler.jsonc`, assets-only, SPA fallback) via `cloudflare/wrangler-action`, gated on the
`CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` secrets.

## Architecture

**Data flow is one-way and bundled at build time (no more runtime Gist fetch):**

1. Event content lives in `data/events/<id>.json`, listed in `data/manifest.json`, and typed by
   `eventSchema` in `packages/schema/src/event.ts`.
2. `app/src/lib/events.ts` glob-imports every file under `data/events/*.json` with
   `import.meta.glob`, parses each through `eventSchema`, and exposes `getAllEvents`, `getEvent`,
   `getActiveEvent`, and `isEventEnded`. Adding an event means adding a JSON file + manifest entry
   and rebuilding — not shipping new app code.
3. `app/src/router.tsx` (TanStack Router) redirects `/` to the currently-active event's overview
   route, and defines the per-event routes `/$eventId/{overview,objectives,exchanges,settings}`,
   rendered inside `EventShell`/`Layout` (`app/src/components/`).
4. `app/src/store/useAppStore.ts` is a Zustand store (with `persist` middleware) that owns all
   mutable user state — tomestone totals, completed objectives, wishlist/exchange status, and
   settings — keyed per event (`events: Record<eventId, EventProgress>`), and syncs to
   `localStorage` under the key `"tomelist:v2"`. Event content itself is never mutated; this store
   is the only place user progress is written. `EventProgress`/`WishlistEntry` types come from
   `packages/schema/src/state.ts`. Settings also hold a palette×mode theme (`{ palette:
   maelstrom|adder|flames, mode: dark|light }`), which `Layout` applies to the document as
   `data-palette`/`data-theme` attributes; the persisted state uses zustand-persist `version: 2`,
   with a `migrate` step that upgrades the legacy single-string theme/quantity-less format.
   `EventShell` additionally swaps the page favicon to the currently viewed event's
   `tomestone.icon`.
5. The pages under `app/src/pages/` (`OverviewPage`, `ObjectivesPage`, `ExchangesPage`,
   `SettingsPage`) read event content via `getEvent(eventId)` and cross-reference it against
   `useAppStore`'s per-event progress to render and update progress.

**Schemas** (`packages/schema/src/event.ts`, `state.ts`) are the single source of truth for both
event-content shape and persisted-state shape, consumed by both `app/` and the data-validation
tests (`packages/schema/src/data.test.ts`, run via `yarn validate:data`).

**Authoring script** (`scripts/fetch-rewards.ts`) is a standalone aid for drafting exchange-item
data for a new event; it is not wired into any build/test/CI step. See `scripts/README.md` for the
full per-event authoring flow (draft exchanges → transcribe objectives → add
`data/events/<id>.json` → register in `data/manifest.json` → `yarn validate:data`).

## Task tracking

Backlog items are tracked as **draft items in the "Tomelist Backlog" GitHub Project** (project #1,
owner `jtferns`), not as repo issues. When asked to capture or track a task, add it directly with
`gh project item-create 1 --owner jtferns --title "..." --body "..."` rather than
`gh issue create`. Only file an actual repo issue if explicitly asked to.
