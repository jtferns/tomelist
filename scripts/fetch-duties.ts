/**
 * Fills each moogle-marked objective's `duties` from the event's wiki page, so the Objectives page
 * can pick one at random.
 * Usage: yarn dlx --quiet tsx scripts/fetch-duties.ts data/events/<id>.json "<wiki page title>"
 * e.g. "Moogle Treasure Trove: The First Hunt for Astronomy". Reads the "Standard/Weekly
 * Objectives" table from the raw wikitext and matches its Duty Type to the objective's category.
 * Duties named in another objective's title (The Praetorium) are left out. Existing lists are
 * replaced. The JSON is edited in place as text, so its one-line-per-item layout survives.
 */
import { readFile, writeFile } from "node:fs/promises";

const WIKI = "https://ffxiv.consolegameswiki.com/mediawiki/index.php";

// Wiki duty type to the event JSON's objective category.
const CATEGORY: Record<string, string> = {
  Dungeon: "Dungeons",
  Trial: "Trials",
  Raid: "Raids",
  "Alliance Raid": "Alliance Raids",
  PvP: "PvP",
};

export function parseDuties(wikitext: string): { name: string; type: string }[] {
  const start = wikitext.indexOf("==Standard/Weekly Objectives==");
  if (start === -1) throw new Error('No "Standard/Weekly Objectives" section on the page');
  const table = wikitext.slice(start, wikitext.indexOf("|}", start));
  const duties: { name: string; type: string }[] = [];
  for (const m of table.matchAll(/^\|\{\{i\|([^}]+)\}\}\s*\|\|\s*\[\[([^\]|]+)/gm)) {
    duties.push({ name: m[1].trim(), type: m[2].trim() });
  }
  return duties;
}

// Sets `"duties": [...]` at the end of the objective's line, replacing any existing list.
function setDuties(text: string, id: string, duties: string[]): string {
  const lines = text.split("\n");
  const index = lines.findIndex((line) => line.includes(`{ "id": "${id}",`));
  if (index === -1) throw new Error(`Can't find the "${id}" line to set duties`);
  const line = lines[index].replace(/, "duties": \[[^\]]*\]/, "");
  lines[index] = line.replace(/ \}(,?)$/, `, "duties": ${JSON.stringify(duties).replace(/","/g, '", "')} }$1`);
  return lines.join("\n");
}

(async () => {
  const [eventPath, title] = process.argv.slice(2);
  if (!eventPath || !title) {
    console.error('Usage: tsx scripts/fetch-duties.ts data/events/<id>.json "<wiki page title>"');
    process.exit(1);
  }
  const res = await fetch(`${WIKI}?${new URLSearchParams({ title, action: "raw" })}`);
  if (!res.ok) throw new Error(`The wiki returned ${res.status} for "${title}"`);
  const duties = parseDuties(await res.text());
  if (duties.length === 0) throw new Error("Found no duties in the table; has the page layout changed?");

  let text = await readFile(eventPath, "utf8");
  const objectives = JSON.parse(text).objectives as { id: string; title: string; category: string }[];
  const ownObjective = (name: string) => objectives.some((o) => o.title.includes(name));
  const unplaced: string[] = [];

  for (const objective of objectives.filter((o) => /moogle-marked/i.test(o.title))) {
    const names = duties
      .filter((d) => CATEGORY[d.type] === objective.category && !ownObjective(d.name))
      .map((d) => d.name);
    if (names.length === 0) continue;
    text = setDuties(text, objective.id, names);
    console.error(`${String(names.length).padStart(3)}  ${objective.id}`);
  }
  for (const d of duties) {
    const category = CATEGORY[d.type];
    const placed = objectives.some((o) => o.category === category && /moogle-marked/i.test(o.title));
    if (!placed && !ownObjective(d.name)) unplaced.push(`${d.name} (${d.type})`);
  }

  await writeFile(eventPath, text);
  if (unplaced.length > 0) {
    console.error(`\nNo moogle-marked objective for ${unplaced.length} duties (GATEs, fishing, or a new type):`);
    for (const u of unplaced) console.error(`  ${u}`);
  }
})();
