# Event authoring

Per new event:
1. Find the irregular tomestone's name (Lodestone event page / in-game).
2. `yarn dlx --quiet tsx scripts/fetch-rewards.ts "<Tomestone Name>" > draft-exchanges.json`
3. Audit the draft against the in-game exchange shop; fix costs/names; remove non-event items.
4. Transcribe objectives from the in-game Mogpendium into the event JSON by hand
   (kinds: standard | weekly | minimog | ultimog; assign effort: quick | medium | long).
5. Create `data/events/<id>.json`, add the event to `data/manifest.json`.
6. `yarn validate:data` must pass. Open a PR; merging deploys.
7. Add the event's tomestone art as `app/public/tomes/<eventId>.png` and set
   `tomestone.icon` to `/tomes/<eventId>.png` in the event JSON. For the newest
   event, also update the static favicon link in `app/index.html` and regenerate
   the PWA icons from it (`sips -z <size> <size> app/public/tomes/<eventId>.png
   --out app/public/pwa-<size>x<size>.png`, plus the 180px apple-touch and 512px
   maskable icons).
