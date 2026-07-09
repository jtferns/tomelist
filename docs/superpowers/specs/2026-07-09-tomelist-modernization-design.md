# Tomelist Modernization — Design Spec

**Date:** 2026-07-09
**Status:** Approved design, pending implementation plan

## Background & Goals

Tomelist is a tracker for FFXIV Moogle Treasure Trove ("mogtome") events. The current app
(CRA + ThemeUI, deployed to Surge, event data fetched from a Gist at runtime) is outdated, and
two external changes force a rethink:

1. **FFXIV moved event objectives in-game.** The Lodestone still publishes the reward/exchange
   table, but per-duty objectives and yields now live only in the in-game "Mogpendium." The event
   structure also changed: standard objectives (repeatable), one random weekly objective, two
   selectable weekly "Minimog" challenges, and one-time "Ultimog" challenges.
   Reference: <https://na.finalfantasyxiv.com/lodestone/special/mogmog-collection/202603/lba1j4i815>
2. **The app should become an optimizer**, not just a tally: given a wishlist and limited play
   time, tell the user what to run next, what they can afford, and how to plan their week.

**Constraints:** cost-free to operate (Cloudflare free tier only), mobile-friendly "second screen"
use while FFXIV runs fullscreen, no user accounts / no PII.

**Non-goals:** precise duty-duration math (queue times, tomes/minute), backfilling pre-rebuild
events, CRDT-grade sync.

## Decisions Summary

| Concern | Decision |
|---|---|
| Rebuild strategy | Fresh rewrite in this repo; old app retires when Phase 1 ships |
| Build | Vite + React + TypeScript; yarn workspaces (no Nx/Turborepo) |
| Styling | Tailwind v4 + shadcn/ui (vendored components); themes = CSS variable sets |
| Routing | TanStack Router (type-safe event-scoped routes) |
| State | Zustand + persist middleware (localStorage) |
| Validation | Zod, shared schema package used by app, worker, and CI |
| Data fetching | No TanStack Query — event data is bundled; sync is WebSocket push |
| Event data | Audited JSON bundled in-repo (`data/events/`), one file per event + manifest |
| Data authoring | Scripts scrape Lodestone rewards + FFXIV Collect API → draft JSON, human-audited |
| Hosting | Single Cloudflare Worker: static assets + `/api/sync/*`; deploy via wrangler in CI |
| Sync | Durable Object per anonymous 128-bit token; WebSocket live updates; QR/link pairing |
| Mobile | PWA (vite-plugin-pwa): installable, offline-first, standalone display |
| Old URL | Final Surge deploy = redirect page to the new Cloudflare home |
| Task tracking | Existing private GitHub Project (Tomelist-scoped only) |

Also: date-fns (countdowns, Tuesday weekly resets), qrcode lib (Phase 3). Dropped: lodash,
ThemeUI, react-use, CRA, Gist fetch, forms/chart/websocket-client libs.

## Architecture

```
┌───────────────────── Cloudflare Worker ("tomelist") ─────────────────────┐
│  Static assets: Vite-built React SPA (PWA)    /api/sync/* : sync API     │
│                                                   │                      │
│                                      Durable Object per sync token       │
│                                      (state blob + WebSocket fan-out)    │
└──────────────────────────────────────────────────────────────────────────┘
        ▲                                  ▲
  PC browser tab  ◄──── live updates ────► Phone (installed PWA)
  (localStorage)                           (localStorage)
```

**Repo layout:** `app/` (SPA), `worker/` (Worker + DO), `data/` (event JSON + manifest),
`scripts/` (authoring scrapers), `packages/schema/` (shared Zod schemas + types).

**Offline-first:** localStorage is always the local source of truth. Without a sync token the app
never talks to the network beyond loading itself. Event data is bundled at build time — no runtime
fetch, no Gist.

**Multi-event:** routes are event-scoped (`/:eventSlug/...`); root redirects to the active event
per the manifest's date ranges. Past events remain browsable (badged "ended"), and per-event user
state is preserved across seasons.

## Event Data Model

One JSON file per event in `data/events/`, validated by Zod in CI (a bad file fails the build):

```ts
{
  id: "2026-03-<slug>",
  name: string,
  tomestone: { name: string, icon?: string },
  starts: string,                 // ISO
  ends: string | null,            // null = open-ended
  endsLabel?: string,             // e.g. "Release of Patch 7.5"
  objectives: [{
    id: string,
    kind: "standard" | "weekly" | "minimog" | "ultimog",
    title: string,
    category: string,             // "Dungeons", "GATEs", "Ocean Fishing", ...
    points: number,
    effort: "quick" | "medium" | "long",   // hand-authored tier, powers ranking
    repeatable: boolean | "weekly",        // once-ever | endless | weekly reset
    requirement?: string,         // free-text caveat, e.g. "min 2,000 points"
    notes?: string
  }],
  exchanges: [{
    id: string,
    name: string,
    cost: number,
    type: string,                 // Mount, Minion, Emote, Hairstyle, Card, ... (FFXIV Collect taxonomy)
    tradeable?: boolean,          // buyable on Market Board
    altSources?: [{ type: string, text: string }],  // alternate acquisition routes
    collectId?: number,           // FFXIV Collect id (linking, later character import)
    limited?: boolean,
    icon?: string
  }]
}
```

**Authoring pipeline (per event):** scripts pull the Lodestone rewards table and
`ffxivcollect.com/api/tomestones` (type, cost cross-check, tradeable, altSources, collectId),
emit draft JSON; the maintainer transcribes objectives from the in-game Mogpendium and audits the
merge; CI validation catches schema errors. First few post-launch commits are expected typo fixes —
merge-to-main auto-deploys them.

## User State & Sync

### Client state (Zustand persist → localStorage, versioned)

```ts
{
  schemaVersion: 1,
  syncToken?: string,
  settings: { theme: string, ... },
  events: {
    [eventId]: {
      tomestones: number,
      completedObjectives: { [objectiveId]: { count: number, lastDoneAt: string } },
      minimogPicks: string[],
      wishlist: { [exchangeId]: {
        status: "wanted" | "exchanged",
        tier: "must" | "want" | "maybe"
      }}
    }
  },
  updatedAt: string
}
```

- Counts (not booleans) for objectives — repeatables and weekly resets need them.
- Wishlist is two-state (wanted → exchanged) with a priority tier; absent = not wanted.
- Marking "exchanged" deducts the item's cost from the wallet.
- The full shape ships in Phase 1 even where UI lands later, to avoid migrations.

### Sync protocol (Phase 3)

1. Enabling sync generates a 128-bit random token, shown as QR + link (`…/#sync=<token>`);
   opening the link on another device adopts the token. No accounts, no PII.
2. Devices hold a WebSocket to `/api/sync/<token>`; a Durable Object per token validates payloads
   (Zod schema, ~64 KB size cap), persists the latest blob, broadcasts to peers. DO hibernation
   keeps idle connections free.
3. **Conflict policy: last-write-wins on the whole blob**, debounced ~1 s. Updates are single-field
   taps; newest `updatedAt` wins on reconnect. No CRDTs.
4. Abuse guards: unguessable tokens (kills enumeration), schema validation + size cap (kills
   free-file-hosting abuse), per-IP write rate limits, 90-day idle TTL via DO alarm.
5. Settings expose disconnect-device and rotate-token (new token; old DO expires).

Free-tier fit: 100k req/day shared account-wide, DOs on free plan (SQLite-backed, 5 GB total);
a few KB per token is negligible.

## Optimizer (Phase 2)

Pure deterministic functions over `(eventData, userState, now)` — no server, unit-tested,
recomputed on every state change. Effort weights (quick=1, medium=2, long=4) live in one
constants file.

1. **Budget & affordability:** wishlist costs cumulate by tier (Must → +Want → +Maybe) against
   projected income (wallet + remaining repeatable/weekly capacity × weeks left + unclaimed
   Ultimogs). Verdict per tier, e.g. "Must-haves affordable now; Wants need ~3 more weeks."
   Tradeable/alt-source items get a "also obtainable elsewhere" badge to aid deprioritizing.
2. **What to run next:** non-exhausted objectives (respecting repeatability, weekly resets,
   one-time completion) ranked by points ÷ effort weight; category filters; "~N quick objectives
   to reach your Must-have goal."
3. **Weekly planner:** suggested 2 Minimog picks by points/effort, weekly-objective claimed flag,
   pace tracking (needed/week vs. earned this week, ahead/behind indicator).

## UI / UX

Event-scoped views; bottom tab bar on mobile (thumb-reachable), sidebar/top-nav on desktop:

1. **Overview** — the second-screen view: wallet with large +/− steppers, countdown, pace,
   budget verdict, top-3 run-next. Fits one phone screen without scrolling.
2. **Objectives** — grouped by kind; large tap-target rows (title, points, effort badge); one-tap
   "did it" increments count + wallet together. Category filters.
3. **Exchanges** — reward grid with tier chips (Must/Want/Maybe), cost, tradeable/alt-source
   badges; tap cycles state; affordable wanted items offer "Mark exchanged" (deducts wallet).
   Sort by tier/cost/category.
4. **Planner** — weekly view (Phase 2).
5. **Settings** — theme picker, sync management (Phase 3), event switcher.

**Mobile-first:** designed at 390 px and expanded up; ≥44 px touch targets; steppers over text
inputs; PWA standalone display; offline/sync status indicators, never blocking spinners.

**Theming:** all themes are CSS-variable sets (shadcn convention). Dark default; light + 2–3
presets at launch. Visual character: warm, whimsical, FFXIV-event — not generic SaaS; use the
frontend-design skill during implementation.

**Accessibility:** Radix-based shadcn primitives; contrast checked across all themes.

## Phasing

- **Phase 1 — Rebuilt tracker (ships, old app retires):** scaffold (Vite/TS/Tailwind/shadcn),
  schema package + CI validation, authoring scripts, multi-event routing, full state shape,
  Overview/Objectives/Exchanges, basic wishlist (want/exchanged), PWA, dark+light themes,
  Cloudflare Worker hosting + CI deploy, Surge redirect.
- **Phase 2 — Optimizer:** budget verdicts, tier chips, run-next ranking, planner view, badges.
- **Phase 3 — Live sync:** DO, QR/link pairing, device management, abuse guards, DO tests.
- **Phase 4 — Extras:** FFXIV Collect character import (opt-in, greys out owned rewards;
  graceful when their API is down), preset theme gallery, post-launch learnings.

## Testing & CI

- **Vitest unit tests:** optimizer functions (highest-value target), state migrations, Zod
  validation of every `data/events/` file.
- **Component tests** (Testing Library): steppers, wishlist cycling, event switcher.
- **Phase 3:** `@cloudflare/vitest-pool-workers` for DO behavior (validation, LWW, size caps).
- **CI (PRs):** typecheck + tests + build + event-data validation (fixes the old repo's
  typecheck-only gap). **Merge to main:** `wrangler deploy`.

## Error Handling Notes

- Bad event JSON cannot ship (CI gate); at runtime the bundled data is trusted.
- Sync failures degrade to local-only silently (status dot, no blocking UI); reconnect applies LWW.
- Worker rejects invalid/oversized sync payloads with 4xx; client keeps local state authoritative.
- Character import (Phase 4) is opt-in and non-critical: failures show a toast, never block.
