/**
 * Drafts each exchange's FFXIV Collect reference (`collect: { kind, id }`) for the character import.
 * Usage: yarn dlx --quiet tsx scripts/fetch-collect.ts data/events/<id>.json [--refresh]
 * Only a unique exact name match is written; everything else is listed to set by hand.
 * Items that already have `collect` are skipped unless --refresh is passed.
 * The JSON is edited in place as text, so its one-line-per-item layout survives.
 */
import { readFile, writeFile } from "node:fs/promises";

const API = "https://ffxivcollect.com/api";
const KINDS = ["mount", "minion", "orchestrion", "barding", "hairstyle"] as const;
type Kind = (typeof KINDS)[number];
const PATHS: Record<Kind, string> = {
  mount: "mounts",
  minion: "minions",
  orchestrion: "orchestrions",
  barding: "bardings",
  hairstyle: "hairstyles",
};
const KINDS_BY_TYPE: Record<string, Kind[]> = {
  Mount: ["mount"],
  Minion: ["minion"],
  Music: ["orchestrion"],
  "Mount Equipment": ["barding"],
  Hairstyle: ["hairstyle"],
};
// Item names wrap the collectable's name: "Dhalmel Whistle" gives mount "Dhalmel".
const WRAPPERS = [/ Whistle$/, / Horn$/, / Orchestrion Roll$/, /^Modern Aesthetics - /];

// Exchange types that never give a collectable the import can check.
const SKIP_TYPES = new Set(["Armor", "Head Gear", "Furnishing", "Map", "Item", "Cosmetic", "Collectible", "Accessory", "Instrument"]);

async function search(kind: Kind, name: string): Promise<{ id: number; name: string }[]> {
  const res = await fetch(`${API}/${PATHS[kind]}?name_en_cont=${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`FFXIV Collect returned ${res.status} for ${kind} "${name}"`);
  return ((await res.json()) as { results: { id: number; name: string }[] }).results;
}

function setCollect(text: string, id: string, kind: Kind, collectId: number): string {
  const lines = text.split("\n");
  const index = lines.findIndex((line) => line.includes(`{ "id": "${id}",`));
  if (index === -1) throw new Error(`Can't find the "${id}" line to set collect`);
  const line = lines[index].replace(/, "collect": \{[^}]*\}/, "");
  lines[index] = line.replace(/ \}(,?)$/, `, "collect": { "kind": "${kind}", "id": ${collectId} } }$1`);
  return lines.join("\n");
}

(async () => {
  const eventPath = process.argv[2];
  const refresh = process.argv.includes("--refresh");
  if (!eventPath) {
    console.error("Usage: tsx scripts/fetch-collect.ts data/events/<id>.json [--refresh]");
    process.exit(1);
  }

  let text = await readFile(eventPath, "utf8");
  const event = JSON.parse(text);
  const review: string[] = [];

  for (const item of event.exchanges as { id: string; name: string; type: string; collect?: unknown }[]) {
    if (item.collect !== undefined && !refresh) continue;
    if (SKIP_TYPES.has(item.type)) continue;
    const name = WRAPPERS.reduce((n, wrapper) => n.replace(wrapper, ""), item.name);
    const matches: { kind: Kind; id: number }[] = [];
    for (const kind of KINDS_BY_TYPE[item.type] ?? KINDS) {
      for (const hit of await search(kind, name)) {
        if (hit.name.toLowerCase() === name.toLowerCase()) matches.push({ kind, id: hit.id });
      }
    }
    if (matches.length !== 1) {
      review.push(`${matches.length === 0 ? "miss " : "many "} ${item.name} (searched "${name}")`);
      continue;
    }
    text = setCollect(text, item.id, matches[0].kind, matches[0].id);
    console.error(`set   ${item.name} -> ${matches[0].kind} ${matches[0].id}`);
  }

  await writeFile(eventPath, text);
  for (const line of review) console.error(`${line}; set collect by hand if it gives a collectable`);
})();
