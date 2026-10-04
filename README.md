# Tomelist

Tomelist helps FFXIV players plan tomestone farming during Moogle Treasure Trove events. Log the
duties you clear and wishlist the items you want, and it tells you what to run next and whether
you'll afford everything before the event ends.

There are no accounts and no backend. Progress stays in your browser (`localStorage`), each event
keeps its own progress, and the app installs as an offline-capable PWA.

## What it does

- **Overview**: your tomestone wallet, a Run Next list ranked by tomes per effort, and a budget
  verdict for each wishlist tier (Must, Nice, Maybe).
- **Objectives**: log clears with undo. Weekly Minimogs are tied to their event week, and
  multi-clear objectives such as "Clear Aloalo Island 6 times" count up to their reward.
- **Planner**: this week's Minimog and weeklies, plus a pace line against your Must-haves.
- **Exchanges**: search and filter the event's items, wishlist them by tier and quantity, and log
  exchanges with undo.
- **Settings**: five palettes (three Grand Companies, Ishgard, the Crystarium) in dark and light,
  ornament and density options, and progress export, import and reset.

Events with a second currency, such as the Uolon Horn Tokens in The First Hunt for Astronomy, get a
token balance and token costs alongside tomes.

## How this was built

[jtferns](https://github.com/jtferns) built v1 by hand in 2021 (Create React App). v2, the current
codebase, was rebuilt in 2026 with Claude, an AI coding assistant. Claude wrote most of the code,
tests and docs, and drafted the event data from the wiki. jtferns directed the work: product and
design decisions, scope, and review. Every change is typechecked, tested and built before it is
committed.

## Repo layout

Yarn workspaces monorepo:

- `app/` (`@tomelist/app`): the Vite + React 19 PWA. TanStack Router for routes, Zustand for
  state, Tailwind CSS 4 and Radix UI for the interface, Vitest and Testing Library for tests.
  This is what gets deployed.
- `packages/schema/` (`@tomelist/schema`): Zod schemas for event content and saved progress,
  shared by the app and the data tests.
- `data/`: event content. `manifest.json` lists the events, and each event lives in
  `data/events/<id>.json`. It is bundled into the app at build time (`app/src/lib/events.ts`).
- `scripts/`: authoring aids for new events. Not part of the build or CI. See
  [`scripts/README.md`](scripts/README.md).
- `docs/`: design specs and implementation plans.
- `surge-redirect/`: the page that sends visitors from the old `tomelist.surge.sh` to the new site.
- `wrangler.jsonc`: Cloudflare Worker config for hosting.

## Getting started

Requirements: Node 22.14.0 (pinned in `.nvmrc`) and any `yarn` on your PATH. The repo checks in
Yarn 4.17.1 under `.yarn/releases/` and points to it with `yarnPath` in `.yarnrc.yml`, so every
`yarn` command runs that version.

```sh
yarn install
yarn dev
```

Commands, run from the repo root:

| Command | What it does |
| --- | --- |
| `yarn dev` | Vite dev server for the app |
| `yarn tsc` | Typecheck every workspace |
| `yarn test` | Run every workspace's Vitest suite, including the data tests |
| `yarn build` | Production build into `app/dist` |
| `yarn validate:data` | Only the tests that validate `data/` |

To try the production build locally, run `yarn build`, then `yarn vite preview` inside `app/`.

## How the app fits together

1. `app/src/lib/events.ts` loads every `data/events/*.json` file, validates it against the event
   schema, and finds the active event.
2. `app/src/router.tsx` sends `/` to the active event and serves each event at
   `/<eventId>/overview`, `/objectives`, `/planner`, `/exchanges` and `/settings`.
3. `app/src/store/useAppStore.ts` holds all user progress, per event, and saves it to
   `localStorage` under `tomelist:v2`. Event content is never edited at runtime.
4. `app/src/lib/optimizer.ts` is the pure planning logic behind Run Next, the budget verdicts and
   the Planner.

## Adding an event

[`scripts/README.md`](scripts/README.md) has the full flow: draft the exchange list with
`scripts/fetch-rewards.ts`, transcribe the objectives, add `data/events/<id>.json`, register it
in `data/manifest.json`, download item icons with `scripts/fetch-icons.ts`, then run
`yarn validate:data`.

## Deployment

The site is a Cloudflare Worker that serves `app/dist` as static assets, with a single-page-app
fallback (`wrangler.jsonc`).

CI (`.github/workflows/node.js.yml`) runs `yarn tsc`, `yarn test` and `yarn build` on every push
and pull request to `main`. On a push to `main`, a second job builds again and deploys with
`cloudflare/wrangler-action`, using the wrangler version pinned in `package.json`. That job needs
the `CLOUDFLARE_API_TOKEN` (Workers Scripts: Edit) and `CLOUDFLARE_ACCOUNT_ID` repository secrets,
and fails without them. The first deploy creates the `tomelist` Worker.

Workflows from forked pull requests get no secrets and a read-only token, and the deploy job only
runs on pushes to `main`.

### Retiring the old Surge site

Tomelist used to live at `tomelist.surge.sh`. Once the Worker URL is live, replace both
`REPLACE_WITH_DEPLOYED_URL` placeholders in `surge-redirect/index.html` with it, then publish the
redirect page by hand:

```sh
cp surge-redirect/index.html surge-redirect/200.html && npx surge ./surge-redirect https://tomelist.surge.sh
```

Progress saved on the old site stays there: browsers keep `localStorage` per domain.

## License and credits

MIT, see [`LICENSE`](LICENSE).

FINAL FANTASY XIV © SQUARE ENIX CO., LTD. Item icons come from the game via XIVAPI. Tomelist is a
fan project and is not affiliated with Square Enix.
