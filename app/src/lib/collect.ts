import type { CollectKind, Exchange } from "@tomelist/schema";

const API = "https://ffxivcollect.com/api";
const PATHS: Record<CollectKind, string> = {
  mount: "mounts",
  minion: "minions",
  orchestrion: "orchestrions",
  barding: "bardings",
  hairstyle: "hairstyles",
};

export interface OwnedImport {
  characterId: string;
  name: string;
  server: string;
  // "kind:id" for every owned collectable of the kinds that were fetched.
  owned: string[];
  fetchedAt: string;
}

export type CollectErrorReason = "not-found" | "private" | "unavailable";

export class CollectError extends Error {
  constructor(public reason: CollectErrorReason) {
    super(reason);
  }
}

export function ownedKey(collect: NonNullable<Exchange["collect"]>): string {
  return `${collect.kind}:${collect.id}`;
}

// A Lodestone character ID, or a profile URL containing one.
export function parseCharacterId(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  return /lodestone\/character\/(\d+)/.exec(trimmed)?.[1] ?? null;
}

async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`);
  } catch {
    throw new CollectError("unavailable");
  }
  if (res.status === 404) throw new CollectError("not-found");
  if (res.status === 403) throw new CollectError("private");
  if (!res.ok) throw new CollectError("unavailable");
  return (await res.json()) as T;
}

export async function fetchOwned(characterId: string, kinds: CollectKind[], now = new Date()): Promise<OwnedImport> {
  const summary = await get<{ name: string; server: string }>(`/characters/${characterId}`);
  const lists = await Promise.all(
    kinds.map(async (kind) => {
      const rows = await get<{ id: number }[]>(`/characters/${characterId}/${PATHS[kind]}/owned`);
      return rows.map((row) => `${kind}:${row.id}`);
    })
  );
  return {
    characterId,
    name: summary.name,
    server: summary.server,
    owned: lists.flat(),
    fetchedAt: now.toISOString(),
  };
}
