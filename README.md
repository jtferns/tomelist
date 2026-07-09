# Tomelist

Tomelist is a web app that helps FFXIV (Final Fantasy XIV) players track tomestone farming
progress during seasonal "Moogle Treasure Trove" events. Pick the event, log the duties you've
cleared and the items you want to exchange for, and Tomelist tracks your running tomestone totals
against event goals. Progress is saved to `localStorage`, and the app supports multiple events
(past and current) side by side — each event's progress is tracked independently.

## Workspace layout

This is a Yarn workspaces monorepo:

- `app/` — the Vite + React PWA (TanStack Router, Zustand, Tailwind). This is what gets deployed.
- `packages/schema/` (`@tomelist/schema`) — Zod schemas shared between the app and the data
  authoring tooling, plus the tests that validate `data/`.
- `data/` — event content: `manifest.json` (list of known events) and `data/events/*.json` (one
  file per event: objectives, exchange items, start/end dates). This is bundled into the app at
  build time — see `app/src/lib/events.ts`.
- `scripts/` — authoring aids for producing event JSON (not part of the built app or CI). See
  [`scripts/README.md`](scripts/README.md) for the event authoring flow.

## Commands

Run these from the repo root.

- `yarn workspace @tomelist/app run dev` — run the app's Vite dev server
- `yarn tsc` — typecheck all workspaces
- `yarn test` — run all workspace test suites (Vitest)
- `yarn build` — production build (outputs `app/dist`)
- `yarn validate:data` — validate every file under `data/` against the `@tomelist/schema` schemas

Package manager is Yarn 4 (Berry, `nodeLinker: node-modules`, see `.yarnrc.yml`). Node version is
pinned in `.nvmrc`.

## Adding or updating an event

See [`scripts/README.md`](scripts/README.md) for the full authoring flow: drafting exchange data
with `scripts/fetch-rewards.ts`, transcribing objectives, adding a new `data/events/<id>.json`, and
registering it in `data/manifest.json`. Run `yarn validate:data` before opening a PR.

## Deployment

The app is a Cloudflare Worker serving static assets (see `wrangler.jsonc`). CI
(`.github/workflows/node.js.yml`) runs typecheck, tests, and build on every push and PR; on pushes
to `main`, after those checks pass, it builds again and deploys to Cloudflare via
`cloudflare/wrangler-action`. Deploying requires the `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` repository secrets to be configured.

### Retiring the old Surge deployment

Tomelist previously deployed to `tomelist.surge.sh`. That deployment isn't torn down automatically
— once the Cloudflare Worker URL is live, manually point the old Surge site at a redirect page.
`surge-redirect/index.html` is a small HTML page that redirects visitors to the new deployed URL;
replace the `REPLACE_WITH_DEPLOYED_URL` placeholders in it with the real URL, then run:

```
cp surge-redirect/index.html surge-redirect/200.html && npx surge ./surge-redirect https://tomelist.surge.sh
```
