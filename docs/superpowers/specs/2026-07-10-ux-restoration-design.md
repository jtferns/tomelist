# Tomelist v2 UX Restoration — Design

**Date:** 2026-07-10
**Status:** Draft, pending approval

## Problem

The v2 rebuild lost the core interaction loop of v1 (tomelist.surge.sh): *pick wants →
a total appears → grind duties → watch the progress bar fill*. V1 kept a persistent
header on every screen showing progress bar, current tomestone count, and total
required tomes. V2 scattered these across tabs (wallet on Overview, wishlist total
only on Exchanges, nothing on Objectives), so marking a wishlist item has no visible
consequence anywhere else.

Additional regressions:

- **Cursor affordance:** Tailwind v4 preflight gives `<button>` `cursor: default`
  (v3 gave pointer); nothing in `index.css` restores it, so nothing looks clickable.
- **Exchange rows:** the click target is an inner `<button>` inside the Card
  (`ExchangesPage.tsx`), not the whole card; no hover state; no indication that
  clicking toggles wanted on/off; v1's sufficient/insufficient styling
  (can-I-afford-this vs current tomes) is gone.
- **Favicon:** v1 shipped the newest event's mogtome PNG art as the favicon,
  updated each event. V2 replaced it with a generic geometric SVG.
- **Themes:** generic purple/pink dark+light, no FFXIV flavor.
- **Event switching:** buried in Settings with no other entry point.

## Decisions (user-confirmed)

| Topic | Decision |
| --- | --- |
| Progress display | Compact sticky HUD bar on every event tab; Overview keeps the big WalletStepper |
| Event switching | Event name in the HUD opens a switcher dropdown; Settings list stays as secondary path |
| Exchange rows | Whole card toggles wanted; clear hover/selected affordances; restore sufficient/insufficient tint; Mark exchanged stays a distinct button |
| Themes | Grand Company palettes (Maelstrom, Twin Adder, Immortal Flames), modeled as palette × mode (dark/light); default Maelstrom dark |
| Favicon | Dynamic: swaps to the viewed event's tome art at runtime; static fallback + PWA icons use the latest event's art |

## Design

### 1. Progress HUD in `EventShell`

New `ProgressHud` component rendered sticky above page content on every event route
(below top nav on desktop, top of screen on mobile):

- **Event name** (left) — tappable, opens the event switcher (§2), with a compact
  countdown ("ends in 12d") beside/under it.
- **Progress bar** (center, flexible) — wallet ÷ wishlist total with a `%` label.
  Empty wishlist: show wallet count alone plus a hint ("pick exchanges to set a goal").
- **`{wallet} / {total}` + tome icon** (right) — tapping the wallet number navigates
  to Overview where the `WalletStepper` lives.

The wishlist-total calculation currently inlined in `ExchangesPage.tsx` moves to a
shared selector (store helper or `lib/`) used by both the HUD and the Exchanges page.

### 2. Event switcher

Tapping the event name opens a dropdown (shadcn `DropdownMenu`) listing
`getAllEvents()` with "Ended" badges; selecting navigates to that event's same tab.

### 3. Exchange rows

- Whole card is the toggle target: tap toggles `none ↔ wanted`.
- Affordances: `cursor: pointer`, `hover:bg-accent`, visible selection indicator
  (empty circle → filled check), primary-tinted border when selected.
- Sufficient/insufficient: wanted items costing more than the current wallet render
  muted/italic ("not yet affordable"); affordable ones render solid.
- "Mark exchanged" remains a distinct button (no event bubbling into the toggle);
  exchanged items keep the badge and leave the toggle cycle.

### 4. Global click affordances

Base-layer rule in `index.css`: `button:not(:disabled) { cursor: pointer }`.
Add hover/active transitions to the nav tabs (currently only `.active` changes).

### 5. Grand Company themes (palette × mode)

- Store: `settings.theme: "dark" | "light"` →
  `settings.theme: { palette: "maelstrom" | "adder" | "flames", mode: "dark" | "light" }`,
  with a Zustand `persist` version bump and migration
  (`"dark"` → `{ palette: "maelstrom", mode: "dark" }`).
- `Layout` sets both `data-palette` and `data-theme` on `<html>`.
- `index.css` defines 6 token blocks (3 palettes × 2 modes) over the existing oklch
  variables: Maelstrom crimson/storm-grey, Twin Adder yellow-green/forest,
  Immortal Flames gold/obsidian.
- Settings UI: two control groups — Grand Company picker, dark/light toggle.
- Default: Maelstrom dark.

### 6. Favicon + PWA icons (mogtome art)

- `eventSchema` gains an optional `icon` field (public path, e.g.
  `/tomes/<eventId>.png`); art lives in `app/public/tomes/`.
- Past-event art recoverable from v1 git history (`public/images/*.png` at
  `8cc244b`); current event needs its Irregular Tomestone art added — documented as
  an authoring step in `scripts/README.md`.
- Runtime effect in `EventShell` swaps `<link rel="icon">` to the viewed event's
  tome art.
- Static fallback favicon + PWA manifest icons (installed-app icons cannot be
  dynamic) become the latest event's tome art, replacing the generic SVG.

## Testing

Extend existing Vitest suites: HUD wallet/total rendering and reactivity to wishlist
changes; event-switcher navigation; whole-card toggle + affordable/unaffordable
rendering; theme persistence migration from the old string shape; favicon link swap.
Gate: `yarn tsc && yarn test`.

## Out of scope

- Per-item quantities on exchanges (v1 had them; deferred).
- Any push/deploy — publishing remains the user's call.
