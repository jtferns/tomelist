/**
 * Downloads item icons for an event's exchanges from XIVAPI and records them in the event JSON.
 * Usage: yarn dlx --quiet tsx scripts/fetch-icons.ts data/events/<id>.json
 * Icons land in app/public/items/<item-id>.png. Items that already have an icon are skipped.
 * The JSON is edited in place as text, so its one-line-per-item layout survives.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const API = "https://v2.xivapi.com/api";
const OUT_DIR = "app/public/items";

type SearchResult = { results: { fields: { Name: string; Icon: { path: string; path_hr1: string } } }[] };

async function findIconPath(name: string): Promise<string | null> {
  const params = new URLSearchParams({
    sheets: "Item",
    query: `Name="${name.replace(/"/g, '\\"')}"`,
    fields: "Name,Icon",
  });
  const res = await fetch(`${API}/search?${params}`);
  if (!res.ok) throw new Error(`XIVAPI search returned ${res.status} for "${name}"`);
  const body = (await res.json()) as SearchResult;
  const hit = body.results.find((r) => r.fields.Name.toLowerCase() === name.toLowerCase());
  return hit ? hit.fields.Icon.path_hr1 : null;
}

(async () => {
  const eventPath = process.argv[2];
  if (!eventPath) {
    console.error("Usage: tsx scripts/fetch-icons.ts data/events/<id>.json");
    process.exit(1);
  }

  let text = await readFile(eventPath, "utf8");
  const event = JSON.parse(text);
  await mkdir(OUT_DIR, { recursive: true });
  const missing: string[] = [];

  for (const item of event.exchanges as { id: string; name: string; icon?: string }[]) {
    if (item.icon) continue;
    // Bundles such as "Magicked Prism (Job Mastery) x10" are listed under the single item's name.
    const iconPath = await findIconPath(item.name.replace(/ x\d+$/, ""));
    if (!iconPath) {
      missing.push(item.name);
      continue;
    }
    const res = await fetch(`${API}/asset?path=${encodeURIComponent(iconPath)}&format=png`);
    if (!res.ok) throw new Error(`XIVAPI asset returned ${res.status} for "${item.name}"`);
    await writeFile(join(OUT_DIR, `${item.id}.png`), Buffer.from(await res.arrayBuffer()));
    const nameField = new RegExp(`("id": "${item.id}", "name": "(?:[^"\\\\]|\\\\.)*")`);
    if (!nameField.test(text)) throw new Error(`Can't find the "${item.id}" line to add its icon`);
    text = text.replace(nameField, `$1, "icon": "/items/${item.id}.png"`);
    console.error(`ok    ${item.name}`);
  }

  await writeFile(eventPath, text);
  for (const name of missing) console.error(`miss  ${name} (no exact name match; find it by hand)`);
})();
