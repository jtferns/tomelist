/**
 * Audits an event's exchanges against its Lodestone special page: items missing on either side,
 * and tome or token costs that differ. Read-only; fix what it reports by hand.
 * Usage: yarn dlx --quiet tsx scripts/check-lodestone.ts data/events/<id>.json <lodestone url>
 * The page has no objectives (those live only in the in-game Mogpendium); see fetch-duties.ts.
 */
import { readFile } from "node:fs/promises";

type LodestoneItem = { name: string; cost: number; tokenCost?: number };

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&#039;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();

// Lodestone lists "Magicked Prism (Job Mastery)" with a separate "x 10"; the event JSON writes it
// as one name, "Magicked Prism (Job Mastery) x10".
export function parseLodestone(html: string): LodestoneItem[] {
  const items: LodestoneItem[] = [];
  const row =
    /<p class="item__list__name">([^<]+)<\/p>(?:<p class="item__list__(?:notes|count)">([^<]*)<\/p>)*[\s\S]*?<span class="item__list__token">(\d+)<\/span>/g;
  for (const m of html.matchAll(row)) {
    const count = /x\s*(\d+)/.exec(m[0].match(/item__list__count">([^<]*)/)?.[1] ?? "");
    items.push({ name: decode(m[1]) + (count ? ` x${count[1]}` : ""), cost: Number(m[3]) });
  }
  // The featured item (e.g. a mount bought with tomes plus tokens) sits outside the table.
  const featured = /<p class="featured__item__name">([^<]+)<\/p>([\s\S]*?)<\/dl>/.exec(html);
  if (featured) {
    const costs = [...featured[2].matchAll(/<p><span>([^<]+)<\/span><span>(\d+)<\/span><\/p>/g)];
    const tome = costs.find((c) => /tomestone/i.test(c[1]));
    const token = costs.find((c) => !/tomestone/i.test(c[1]));
    if (tome) items.unshift({ name: decode(featured[1]), cost: Number(tome[2]), tokenCost: token ? Number(token[2]) : undefined });
  }
  return items;
}

(async () => {
  const [eventPath, url] = process.argv.slice(2);
  if (!eventPath || !url) {
    console.error("Usage: tsx scripts/check-lodestone.ts data/events/<id>.json <lodestone url>");
    process.exit(1);
  }
  const event = JSON.parse(await readFile(eventPath, "utf8"));
  const res = await fetch(url, { headers: { "User-Agent": "tomelist-authoring" } });
  if (!res.ok) throw new Error(`Lodestone returned ${res.status}`);
  const lodestone = parseLodestone(await res.text());
  if (lodestone.length === 0) throw new Error("Found no items on the page; has its markup changed?");

  const key = (s: string) => s.toLowerCase();
  const ours = new Map<string, { name: string; cost: number; tokenCost?: number }>(
    event.exchanges.map((e: { name: string }) => [key(e.name), e])
  );
  const problems: string[] = [];
  for (const item of lodestone) {
    const mine = ours.get(key(item.name));
    if (!mine) {
      problems.push(`missing here: ${item.name} (${item.cost})`);
      continue;
    }
    ours.delete(key(item.name));
    if (mine.cost !== item.cost) problems.push(`cost: ${item.name} is ${mine.cost} here, ${item.cost} on Lodestone`);
    if (item.tokenCost !== undefined && mine.tokenCost !== item.tokenCost) {
      problems.push(`token cost: ${item.name} is ${mine.tokenCost ?? "unset"} here, ${item.tokenCost} on Lodestone`);
    }
  }
  for (const extra of ours.values()) problems.push(`not on Lodestone: ${extra.name}`);

  console.error(`${lodestone.length} items on Lodestone, ${event.exchanges.length} in ${eventPath}`);
  for (const p of problems) console.log(p);
  if (problems.length > 0) process.exit(2);
  console.error("No differences.");
})();
