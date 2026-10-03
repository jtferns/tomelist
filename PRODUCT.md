# Product

<!-- impeccable:product-schema 1 -->

> Provisional, pending Janoo review. Answers were relayed by the supe session on 2026-10-03
> while Janoo was away.

## Platform

web

## Users

FFXIV players during a Moogle Treasure Trove event. They check in between duties, often on a
phone or a second monitor, to log clears, see their tomestone totals, and decide what to run next
so they can afford the items on their wishlist. It is a solo personal tool with no accounts.

## Product Purpose

Track tomestone farming for each Treasure Trove event: what you've earned, what you still want,
and whether you'll get there before the event ends. Success is a player who knows at a glance
what to run next and never misses an item they wanted.

## Positioning

Wiki tables and spreadsheets list the numbers. Tomelist does the math: per-event progress, budget
verdicts per wishlist tier, weekly pace, and a run-next ranking. It works offline from
localStorage, with past and current events side by side.

## Operating Context

- Used mid-session, in short glances between duty queues.
- Event content comes from the in-game Mogpendium and the wiki, transcribed into
  `data/events/<id>.json` and bundled at build time.
- Each event lives at `/$eventId/{overview,objectives,exchanges,planner,settings}`.

## Capabilities and Constraints

- Event content is bundled JSON. There is no backend.
- User progress is stored offline in localStorage (`tomelist:v2`) and kept separately for each event.
- Installable as a PWA and deployed as a static Cloudflare Worker.
- Undecided: live mode (`/impeccable live`) is deferred until Janoo can use it interactively.

## Brand Commitments

- Name: Tomelist.
- Current visual identity is the shipped FFXIV dark-fantasy look: Cinzel and Alegreya Sans, gold
  accents, Grand Company palettes (maelstrom, adder, flames) in dark and light, plus ornament and
  density settings. It is open to redesign, but the FFXIV tone should stay recognizable.

## Evidence on Hand

- Real event data: `data/events/2026-09-astronomy-first-hunt.json`, audited against the wiki.
- Tome art in `app/public/tomes/` is a placeholder upscale and should not be treated as final.
- There are no testimonials, user counts, or press. Do not fabricate them.

## Product Principles

1. Answer "what should I run next?" faster than opening the wiki.
2. Event data is the source of truth; the app never edits it.
3. Work offline and keep every event's progress separate.
4. Fit a quick glance on a phone between queues.

## Accessibility & Inclusion

WCAG 2.2 AA. Colour contrast is enforced by `app/src/index.contrast.test.ts`.
