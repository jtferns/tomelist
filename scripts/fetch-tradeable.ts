/**
 * Records whether each exchange item can be traded, from XIVAPI's Item.IsUntradable.
 * Usage: yarn dlx --quiet tsx scripts/fetch-tradeable.ts data/events/<id>.json [--refresh]
 * Items that already have `tradeable` are skipped unless --refresh is passed.
 * The JSON is edited in place as text, so its one-line-per-item layout survives.
 */
import { readFile, writeFile } from "node:fs/promises";
import { editEntryLine, findItem } from "./lib";

async function findUntradable(name: string): Promise<boolean | null> {
  const item = await findItem<{ Name: string; IsUntradable: boolean }>(name, "IsUntradable");
  return item ? item.IsUntradable : null;
}

// Sets `"tradeable": <value>` on the item's line, right after its `"type"` field, replacing any
// existing value on that line.
function setTradeable(text: string, id: string, value: boolean): string {
  return editEntryLine(text, id, "tradeable", (original) => {
    const line = original.replace(/, "tradeable": (?:true|false)/, "");
    const type = /(, "type": "(?:[^"\\]|\\.)*")/;
    if (!type.test(line)) throw new Error(`The "${id}" line has no "type" field`);
    return line.replace(type, `$1, "tradeable": ${value}`);
  });
}

void (async () => {
  const eventPath = process.argv[2];
  const refresh = process.argv.includes("--refresh");
  if (!eventPath) {
    console.error("Usage: tsx scripts/fetch-tradeable.ts data/events/<id>.json [--refresh]");
    process.exit(1);
  }

  let text = await readFile(eventPath, "utf8");
  const event = JSON.parse(text);
  const missing: string[] = [];

  for (const item of event.exchanges as { id: string; name: string; tradeable?: boolean }[]) {
    if (item.tradeable !== undefined && !refresh) continue;
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
