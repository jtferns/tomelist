/**
 * Records whether each exchange item can be traded, from XIVAPI's Item.IsUntradable.
 * Usage: yarn dlx --quiet tsx scripts/fetch-tradeable.ts data/events/<id>.json [--force]
 * Items that already have `tradeable` are skipped unless --force is passed.
 * The JSON is edited in place as text, so its one-line-per-item layout survives.
 */
import { readFile, writeFile } from "node:fs/promises";

const API = "https://v2.xivapi.com/api";

type SearchResult = { results: { fields: { Name: string; IsUntradable: boolean } }[] };

async function findUntradable(name: string): Promise<boolean | null> {
  const params = new URLSearchParams({
    sheets: "Item",
    query: `Name="${name.replace(/"/g, '\\"')}"`,
    fields: "Name,IsUntradable",
  });
  const res = await fetch(`${API}/search?${params}`);
  if (!res.ok) throw new Error(`XIVAPI search returned ${res.status} for "${name}"`);
  const body = (await res.json()) as SearchResult;
  const hit = body.results.find((r) => r.fields.Name.toLowerCase() === name.toLowerCase());
  return hit ? hit.fields.IsUntradable : null;
}

// Sets `"tradeable": <value>` on the item's line, right after its `"type"` field, replacing any
// existing value on that line.
function setTradeable(text: string, id: string, value: boolean): string {
  const lines = text.split("\n");
  const index = lines.findIndex((line) => line.includes(`{ "id": "${id}",`));
  if (index === -1) throw new Error(`Can't find the "${id}" line to set tradeable`);
  const line = lines[index].replace(/, "tradeable": (?:true|false)/, "");
  const type = /(, "type": "(?:[^"\\]|\\.)*")/;
  if (!type.test(line)) throw new Error(`The "${id}" line has no "type" field`);
  lines[index] = line.replace(type, `$1, "tradeable": ${value}`);
  return lines.join("\n");
}

(async () => {
  const eventPath = process.argv[2];
  const force = process.argv.includes("--force");
  if (!eventPath) {
    console.error("Usage: tsx scripts/fetch-tradeable.ts data/events/<id>.json [--force]");
    process.exit(1);
  }

  let text = await readFile(eventPath, "utf8");
  const event = JSON.parse(text);
  const missing: string[] = [];

  for (const item of event.exchanges as { id: string; name: string; tradeable?: boolean }[]) {
    if (item.tradeable !== undefined && !force) continue;
    // Bundles such as "Magicked Prism (Job Mastery) x10" are listed under the single item's name.
    const untradable = await findUntradable(item.name.replace(/ x\d+$/, ""));
    if (untradable === null) {
      missing.push(item.name);
      continue;
    }
    text = setTradeable(text, item.id, !untradable);
    console.error(`${untradable ? "no   " : "yes  "} ${item.name}`);
  }

  await writeFile(eventPath, text);
  for (const name of missing) console.error(`miss  ${name} (no exact name match; set tradeable by hand)`);
})();
