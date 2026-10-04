# Tradeable items and asking friends: implementation plan

Status: draft, waiting on approval. Brief agreed 2026-10-04 (impeccable shape).

## Goal

Friends with spare tomes can buy tradeable exchange items and trade them over. Today players
coordinate by reading the exchange list and comparing tome counts by hand. After this change:

- every exchange item knows whether it is tradeable, and tradeable rows say so;
- a player can mark a wanted tradeable item as "Friend covering", which keeps it on the wishlist
  but takes it out of their own tome plan until it arrives;
- an "Ask a friend" panel lists the wanted tradeable items nobody is covering yet, with costs and
  a total, and copies them as plain text for Discord or chat.

Scope is the asking side only. Out of scope: share links, a view for the friend who offers, accounts.

## Decisions

- Mark tradeable items only. Untradeable rows show nothing extra.
- "Friend covering" applies to the whole wishlist entry (all units), not per unit.
- Receiving a covered item marks it exchanged without spending tomes or tokens.
- Covered items count toward nothing: tier costs, HUD goal, Run Next shortfall, Planner pace,
  token goals.

## 1. Data: fill `tradeable` from XIVAPI

`exchangeSchema.tradeable` (optional boolean) already exists; no Astronomy item sets it.

New script `scripts/fetch-tradeable.ts`, modelled on `scripts/fetch-icons.ts`:

- Usage: `yarn dlx --quiet tsx scripts/fetch-tradeable.ts data/events/<id>.json`.
- For each exchange, search XIVAPI `Item` by exact name with `fields=Name,IsUntradable`
  (verified 2026-10-04: Domakin returns `IsUntradable: false`). Set `tradeable` to
  `!IsUntradable`.
- Edit the JSON as text like fetch-icons does, inserting `"tradeable": true|false` after
  `"type"` so the one-line-per-item layout survives. Overwrite an existing value only with
  `--refresh`.
- Print items it could not find so they can be set by hand.
- Document it as a step in `scripts/README.md` next to fetch-icons.

Run it on `data/events/2026-09-astronomy-first-hunt.json` and commit the data.

Data test (`packages/schema/src/data.test.ts`): the newest event (by `starts`) has `tradeable`
set on every exchange, so future events don't ship without it.

## 2. Schema and store

`packages/schema/src/state.ts`: `wishlistEntrySchema.status` becomes
`z.enum(["wanted", "covering", "exchanged"])`. Existing saves stay valid; no migration.

`app/src/store/useAppStore.ts`, new actions:

```ts
setCovering(eventId, exchangeId, covering: boolean) // wanted <-> covering
markReceived(eventId, exchangeId)                   // covering -> exchanged, no balance change
undoReceived(eventId, exchangeId)                   // exchanged -> covering, no balance change
```

`markExchanged`/`undoExchanged` keep their current behaviour and only act on `wanted`.
`toggleWishlist` removes a `covering` entry the same way it removes a `wanted` one.

## 3. Planning math

Already correct by construction, because these all filter on `status === "wanted"`:
`computeTierCosts`, `computeTierTokenCosts` (`optimizer.ts`), `getWishlistTotal`,
`getWishlistTokenTotal` (`wishlist.ts`). Add tests that a `covering` entry is excluded from
each. Update the optimizer doc comment to say covered entries are excluded.

## 4. Exchanges page (`app/src/pages/ExchangesPage.tsx`)

- **Badge:** replace the existing lowercase `tradeable` badge with a "Tradeable" badge carrying a
  small icon (lucide `Handshake` or `Gift`, decorative, `aria-hidden`), same `gold-outline`
  variant and size as the other meta badges. Only when `item.tradeable === true`.
- **Filter:** add a "Tradeable" chip to the type filter row, after "Wanted". Shown only when the
  event has at least one tradeable item.
- **Row actions for a wanted tradeable item:** a secondary button "Friend's covering this" next to
  the Want/tier controls. It sets `covering`.
- **Covered row state:** keep the row at full strength, show a "Friend covering" badge in place of
  the quantity stepper and Log exchange, plus two actions: "Received" (`markReceived`, with an
  undo toast "Received <name> from a friend") and "Not covered" (`setCovering(false)`).
- **Received rows** look like today's exchanged rows ("Exchanged" badge).
- Sorting by tier: covered entries rank after wanted ones and before exchanged ones.

## 5. "Ask a friend" panel

- **Entry point:** a button "Ask a friend" in the Exchanges header area, shown when the event has
  tradeable items. Disabled with a hint ("Want a tradeable item first") when none are wanted.
- **Panel:** a bottom sheet on phone and a side panel or dialog on desktop, built on `Dialog` from the installed
  `radix-ui` package. No dialog component exists yet, so add `app/src/components/ui/dialog.tsx`
  in the same style as the other `ui/` components. Contents:
  - "Tradeable, not covered yet": each item with icon, name, cost (and token cost if any), and a
    total.
  - "Covered by friends": names only, so the player sees the whole picture.
  - "You'll need to earn these": wanted untradeable items, names only, muted.
  - **Copy** button. Copies plain text and confirms with "Copied" for two seconds. Uses
    `navigator.clipboard.writeText`; when that fails, select the text in a read-only textarea and
    say "Press Ctrl+C / Cmd+C to copy".
- **Copied text format:**

  ```
  Tomelist: The First Hunt for Astronomy
  Looking for help with (all tradeable):
  - Ramuh Crystal: 50 tomes
  - Toad Head: 30 tomes
  Total: 80 tomes
  ```

  Quantities above 1 read "Toad Head x2: 60 tomes". No URL, no personal data.

## 6. Overview

`BudgetSummary` adds a muted line under the tiers when any entry is covered:
"1 item a friend is covering" / "3 items friends are covering". `OverviewPage`'s "Saving for"
line lists only `wanted` items (unchanged behaviour, since it filters on `wanted`).

## Tests

- Script: unit-test the text-insertion helper on a sample JSON line (keep fetch logic thin).
- Schema: `covering` parses; data test for the newest event.
- Store: setCovering both ways; markReceived/undoReceived leave tomes and tokens untouched;
  toggleWishlist removes a covering entry; markExchanged ignores covering.
- Optimizer/wishlist: covering excluded from tier costs, token costs, wishlist totals.
- Exchanges: badge only on tradeable rows; Tradeable filter; covering flow (cover, received,
  undo, not covered); panel lists the three groups correctly; copy writes the exact text
  (mock `navigator.clipboard`); fallback path when clipboard rejects.
- Overview: covered-count line.
- A no-tradeable-data event (the March fixture) shows no badge, no chip, no Ask button.

## Verification

`yarn tsc && yarn test && yarn build`; preview at 375px and desktop in two palettes: mark an
item covering, check Budget and HUD drop it, open the panel, copy, paste somewhere and check the
text, mark received, undo.

## Order of work (one commit each)

1. fetch-tradeable script + README step + Astronomy data + data test.
2. Schema `covering` + store actions + tests.
3. Optimizer/wishlist exclusion tests + doc comment.
4. Exchanges badge, filter, covering states.
5. Ask a friend panel + copy.
6. Overview covered line.
