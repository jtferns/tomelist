# Event authoring

Per new event:
1. Find the irregular tomestone's name (Lodestone event page / in-game).
2. `yarn dlx --quiet tsx scripts/fetch-rewards.ts "<Tomestone Name>" > draft-exchanges.json`
3. Audit the draft against the in-game exchange shop; fix costs/names; remove non-event items.
4. Transcribe objectives from the in-game Mogpendium into the event JSON by hand
   (kinds: standard | weekly | minimog | ultimog; assign effort: quick | medium | long).
5. Create `data/events/<id>.json`, add the event to `data/manifest.json`.
6. `yarn dlx --quiet tsx scripts/fetch-icons.ts data/events/<id>.json` downloads item icons from
   XIVAPI into `app/public/items/` and adds an `icon` to each exchange. Find any item it reports as
   a miss by hand.
7. `yarn dlx --quiet tsx scripts/fetch-tradeable.ts data/events/<id>.json` records whether each
   exchange can be traded (`tradeable`), from XIVAPI. Set any reported miss by hand. Add `--refresh`
   to refresh values already set. The data tests require it on the newest event.
8. `yarn dlx --quiet tsx scripts/fetch-collect.ts data/events/<id>.json` links mounts, minions,
   orchestrion rolls, bardings and hairstyles to FFXIV Collect (`collect`), so the character
   import can mark them Owned. It writes only unique exact name matches; check what it lists
   and set those by hand (e.g. "The Legendary Beast" roll is "The Legendary Beast
   (Shadowbringers)" there).
9. `yarn dlx --quiet tsx scripts/check-lodestone.ts data/events/<id>.json <lodestone url>` compares
   the exchanges with the event's Lodestone page and lists items missing on either side and tome
   or token costs that differ. It changes nothing; fix what it reports by hand.
10. `yarn dlx --quiet tsx scripts/fetch-duties.ts data/events/<id>.json "<wiki page title>"` fills
    `duties` on each moogle-marked objective from the wiki's objectives table, for the Objectives
    page's "Pick one" button. It lists duties with no matching objective (GATEs, usually).
11. `yarn validate:data` must pass. Open a PR; merging deploys.
12. Add the event's tomestone art as `app/public/tomes/<eventId>.png` and set
    `tomestone.icon` to `/tomes/<eventId>.png` in the event JSON. For the newest
    event, also update the static favicon link in `app/index.html` and regenerate
    the PWA icons from it (`sips -z <size> <size> app/public/tomes/<eventId>.png
    --out app/public/pwa-<size>x<size>.png`, plus the 180px apple-touch and 512px
    maskable icons).
