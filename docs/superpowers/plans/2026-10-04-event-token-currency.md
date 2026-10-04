# Event token currency: implementation plan

Ticket: "Model event token currency (Uolon Horn Tokens etc.)" (GitHub Project #1).
Status: draft, waiting on approval.

## Goal

Some events have a second currency next to tomestones. The Astronomy event (Sep 2026) has
Uolon Horn Tokens: +1 per weekly Minimog, +5 for the Aloalo Ultimog, and the Uolon Horn mount
costs 100 tomes plus 10 tokens. Today tokens live only in free-text `notes`, so the app calls
the mount affordable with 100 tomes and 0 tokens.

After this change the app tracks a token balance per event, adjusts it when clears are logged
or undone and when items are exchanged, lets the player edit it by hand, and checks both
currencies wherever it checks affordability.

## Constraint: the currency may not last

Tokens may be specific to the pre-expansion Mogtome events (phase 1 + phase 2) and may never
come back. So:

- Every new field is optional. An event without `token` looks and behaves exactly as today:
  no token UI, no token math, no extra copy.
- No persisted-state migration. The progress field is optional and read as `?? 0`.
- Name things generically (`token`, `tokens`, `tokenCost`), never "Uolon". The event data
  supplies the display name.
- If tokens never return, the feature sits idle. Removing it later means deleting the
  optional fields and the code paths guarded by `event.token`.

## Data model

### Event content (`packages/schema/src/event.ts`)

```ts
// eventSchema
token: z.object({ name: z.string().min(1), icon: z.string().optional() }).optional(),

// objectiveSchema
tokens: z.number().int().positive().optional(),   // tokens awarded per clear

// exchangeSchema
tokenCost: z.number().int().positive().optional(), // tokens per unit, on top of `cost`
```

Data validation (`packages/schema/src/data.test.ts`): add a test that any event using
`tokens` or `tokenCost` also defines `token`.

### Saved progress (`packages/schema/src/state.ts`)

```ts
// eventProgressSchema
tokens: z.number().int().min(0).optional(),
```

`emptyEventProgress()` stays unchanged. Everywhere reads `progress.tokens ?? 0`. Export and
import keep working because the field is optional.

### Astronomy data (`data/events/2026-09-astronomy-first-hunt.json`)

- Event: `"token": { "name": "Uolon Horn Token" }`.
- `obj-minimog-w1` .. `w6`: `"tokens": 1`; drop "+1 Uolon Horn Token." from `notes` (delete
  `notes` if it becomes empty; keep the week 4 location and week 6 Rokkon note).
- `obj-ultimog-aloalo`: `"tokens": 5`; drop the token text from `notes`.
- `uolon-horn`: `"tokenCost": 10`; drop the token sentence from `notes`, keep the rest.

## Store (`app/src/store/useAppStore.ts`)

Changed signatures. Callers pass the objective or exchange values they already have.

```ts
recordObjective(eventId, objectiveId, points, tokens = 0)
undoObjective(eventId, objectiveId, points, tokens = 0)
markExchanged(eventId, exchangeId, cost, tokenCost = 0)
undoExchanged(eventId, exchangeId, cost, tokenCost = 0)
addTokens(eventId, delta)          // new: manual edit, floors at 0 like addTomestones
```

Rules:

- `recordObjective` adds `tokens` to `p.tokens`.
- `undoObjective` refuses (no-op) when `tomestones < points` OR `tokens < objective tokens`,
  same as the tome rule from a36e9c4. Otherwise it subtracts both.
- `markExchanged` refuses when either balance is short; otherwise subtracts both.
- `undoExchanged` refunds both.
- `addTokens` is the manual edit. It floors at 0 and does not touch clears, same as the tome
  stepper.

## Shared helpers (`app/src/lib/format.ts`)

- `tokenCount(n, name)`: "1 Uolon Horn Token" / "10 Uolon Horn Tokens". Appending "s" works
  for the current name; a test pins it.
- `undoClearBlockedReason(wallet, points, tokens = 0, tokenAward = 0, tokenName?)`: extend the
  existing helper. When tokens are the short side, say e.g.
  "2 Uolon Horn Tokens from this clear already went to exchanges. Undo an exchange first."
  When both are short, mention tomes first, then tokens, in one sentence.

## UI

All token UI renders only when `event.token` is set.

1. **Overview** (`app/src/pages/OverviewPage.tsx`, `app/src/components/WalletStepper.tsx`):
   a second, smaller stepper under the tome wallet, labelled with the token name, with −1 and
   +1 buttons (44px targets, same classes) and an `AnimatedCount`. `data-testid="token-count"`.
   Calls `addTokens`.
2. **HUD** (`app/src/components/ProgressHud.tsx`): a compact token count beside the tome
   count, e.g. "4 tokens" with the full name in `aria-label`. Keep the one-line phone layout
   (GL-2); check at 375px.
3. **Objectives** (`app/src/pages/ObjectivesPage.tsx`): a "+1 token" badge next to the tome
   badge for objectives with `tokens`. The row undo uses the extended blocked reason.
4. **Log clear toast** (`app/src/lib/useLogClear.ts`): message
   `+10 tomes, +1 token · <title>`; pass `objective.tokens` to record, undo and the blocked
   reason.
5. **Exchanges** (`app/src/pages/ExchangesPage.tsx`):
   - Cost reads "100 tomes + 10 tokens" where `tokenCost` is set.
   - The short note covers both: "20 short", "3 tokens short", or "20 + 3 tokens short".
   - "Log exchange" is disabled unless both balances cover one unit.
   - Exchange toast and undo pass `tokenCost`.
6. **Planner** (`app/src/pages/PlannerPage.tsx`): when the Must-have tier has a token cost,
   add a second line under the pace line:
   - "Tokens: 4 of 10. 7 left to earn." when reachable.
   - "Tokens: 4 of 10. Only 3 left to earn, so the Must-haves can't all be reached." in the
     destructive style when not.
   The "Covered" state from 2f26b59 requires tokens to be covered too.

## Optimizer (`app/src/lib/optimizer.ts`)

Add token fields beside the tome ones; tome math is unchanged.

- `computeTierTokenCosts`: cumulative must/want/maybe of `tokenCost × quantity` over wanted
  entries, same shape as `computeTierCosts`.
- `tokensRemaining(event, progress, now)`: tokens still earnable. Sum `tokens` over
  objectives that can still be cleared: week-tagged minimogs with `week >= eventWeek` and not
  completed, `repeatable: false` objectives not completed, and weekly objectives once per
  remaining week. Repeatable-true objectives with tokens count as unbounded: return `null`
  (meaning "no cap").
- `BudgetReport` gains `tokens` (balance) and `tokensRemaining`.
- `TierVerdict` gains `tokenCost`, and:
  - `affordableNow` requires `tokens >= tokenCost` too.
  - `affordableByEnd` is false when `tokensRemaining !== null` and
    `tokens + tokensRemaining < tokenCost`.
  - `weeksNeeded` stays tome-only. Tokens come from fixed weekly drops, not grind, so a
    weeks estimate adds noise. The token line on the Planner covers it.
- `weeklyPlan`: `neededPerWeek === 0` (covered) only when the must tier's token cost is also
  covered by `tokens + (tokensRemaining ?? Infinity)`. Expose `mustTokenCost`, `tokens` and
  `tokensRemaining` for the Planner line.
- Update the doc comment at the top of the file with the token rules.

Run Next ranking is unchanged: it ranks by tomes per effort. See "Out of scope".

## Tests

- Schema: event with `token` + `tokens` + `tokenCost` parses; data test rejects `tokens`
  without `token`.
- Store (`useAppStore.test.ts`): record adds tokens; undo removes them; undo refused when
  tokens were spent; markExchanged refused when tokens short; undoExchanged refunds tokens;
  addTokens floors at 0; old progress without `tokens` reads as 0.
- Optimizer (`optimizer.test.ts`): tier token costs; tokensRemaining skips past weeks and
  completed objectives and returns null for an unbounded token grind; affordableNow false
  when tomes suffice but tokens don't; affordableByEnd false when tokens can't be reached.
- Pages: Overview token stepper only when `event.token` is set; Exchanges cost text, short
  note and disabled button; Objectives "+1 token" badge; Planner token line in both states;
  toast text. Use the Astronomy event with fake timers at `2026-10-04T12:00:00Z` (week 4),
  as the existing week test does.
- A no-token event (the March fixture) renders with no token UI anywhere.

## Verification

1. `yarn tsc && yarn test && yarn build`.
2. `yarn vite preview --port 4173` in `app/`; at 375px and desktop, in at least two
   palettes: log a Minimog, see +1 token and toast; undo; edit tokens by hand; wishlist the
   Uolon Horn as Must; check Exchanges cost, short note and button; check the Planner line.
3. Check that the March fixture event still shows no token UI.

## Order of work (one commit each)

1. Schema + data + data test.
2. Store actions + tests.
3. Optimizer + tests.
4. Overview stepper + HUD.
5. Objectives badge + toast + undo reason.
6. Exchanges.
7. Planner line.

## Out of scope (flag, don't build)

- Run Next does not favour token objectives. Worth revisiting if players miss Minimogs
  because they score low on tomes per effort.
- More than one secondary currency per event.
- A separate token field in Settings export. Tokens already ride along in saved progress.
