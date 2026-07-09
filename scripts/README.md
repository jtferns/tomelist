# Event authoring

Per new event:
1. Find the irregular tomestone's name (Lodestone event page / in-game).
2. `yarn dlx tsx scripts/fetch-rewards.ts "<Tomestone Name>" > draft-exchanges.json`
3. Audit the draft against the in-game exchange shop; fix costs/names; remove non-event items.
4. Transcribe objectives from the in-game Mogpendium into the event JSON by hand
   (kinds: standard | weekly | minimog | ultimog; assign effort: quick | medium | long).
5. Create `data/events/<id>.json`, add the event to `data/manifest.json`.
6. `yarn validate:data` must pass. Open a PR; merging deploys.
