/**
 * Helpers shared by the authoring scripts in this folder.
 */

export const XIVAPI = "https://v2.xivapi.com/api";

// The requested fields of the Item whose name matches exactly (case-insensitive), or null.
export async function findItem<F extends { Name: string }>(name: string, fields: string): Promise<F | null> {
  const params = new URLSearchParams({
    sheets: "Item",
    query: `Name="${name.replace(/"/g, '\\"')}"`,
    fields: `Name,${fields}`,
  });
  const res = await fetch(`${XIVAPI}/search?${params}`);
  if (!res.ok) throw new Error(`XIVAPI search returned ${res.status} for "${name}"`);
  const body = (await res.json()) as { results: { fields: F }[] };
  const hit = body.results.find((r) => r.fields.Name.toLowerCase() === name.toLowerCase());
  return hit ? hit.fields : null;
}

// Event JSON keeps one objective or exchange per line, so edits rewrite that one line in place.
export function editEntryLine(text: string, id: string, field: string, edit: (line: string) => string): string {
  const lines = text.split("\n");
  const index = lines.findIndex((line) => line.includes(`{ "id": "${id}",`));
  if (index === -1) throw new Error(`Can't find the "${id}" line to set ${field}`);
  lines[index] = edit(lines[index]);
  return lines.join("\n");
}
