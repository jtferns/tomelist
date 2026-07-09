/**
 * Draft-generates the `exchanges` array for an event from FFXIV Collect.
 * Usage: yarn dlx --quiet tsx scripts/fetch-rewards.ts "Aphorism" > draft-exchanges.json
 * Output requires manual audit against the in-game shop / Lodestone table.
 */
type CollectRow = {
  id: number;
  name: string;
  type: string;
  cost: number;
  tomestone: string;
  tradeable: boolean;
  sources: { type: string; text: string }[];
};

(async () => {
  const tomestone = process.argv[2];
  if (!tomestone) {
    console.error("Usage: tsx scripts/fetch-rewards.ts <tomestone-name>");
    process.exit(1);
  }

  const res = await fetch("https://ffxivcollect.com/api/tomestones");
  if (!res.ok) throw new Error(`FFXIV Collect returned ${res.status}`);
  const body = (await res.json()) as { results: { collectables: CollectRow[] } };

  const slug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const seen = new Set<string>();
  const exchanges = body.results.collectables
    .filter((r) => r.tomestone.toLowerCase() === tomestone.toLowerCase())
    .filter((r) => (seen.has(slug(r.name)) ? false : (seen.add(slug(r.name)), true)))
    .map((r) => ({
      id: slug(r.name),
      name: r.name,
      cost: r.cost,
      type: r.type,
      tradeable: r.tradeable,
      ...(r.sources.filter((s) => s.type !== "Event").length > 0
        ? { altSources: r.sources.filter((s) => s.type !== "Event").map(({ type, text }) => ({ type, text })) }
        : {}),
      collectId: r.id,
      notes: "DRAFT — audit against in-game shop",
    }));

  console.log(JSON.stringify(exchanges, null, 2));
  console.error(`\n${exchanges.length} items for tomestone "${tomestone}"`);
})();
