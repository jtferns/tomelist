import { afterEach, describe, expect, it, vi } from "vitest";
import { CollectError, fetchOwned, ownedKey, parseCharacterId } from "./collect";

afterEach(() => vi.unstubAllGlobals());

function stubFetch(routes: Record<string, { status: number; body: unknown } | Error>) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(url);
      const route = routes[url.replace("https://ffxivcollect.com/api", "")];
      if (!route) throw new Error(`unexpected ${url}`);
      if (route instanceof Error) throw route;
      return new Response(JSON.stringify(route.body), { status: route.status });
    })
  );
  return calls;
}

describe("parseCharacterId", () => {
  it("accepts a bare id or a Lodestone profile URL", () => {
    expect(parseCharacterId(" 12345678 ")).toBe("12345678");
    expect(parseCharacterId("https://na.finalfantasyxiv.com/lodestone/character/12345678/")).toBe("12345678");
    expect(parseCharacterId("eu.finalfantasyxiv.com/lodestone/character/987/class_job/")).toBe("987");
  });

  it("rejects anything else", () => {
    for (const bad of ["", "abc", "12a", "https://example.com/42"]) expect(parseCharacterId(bad)).toBeNull();
  });
});

describe("fetchOwned", () => {
  const now = new Date("2026-10-11T12:00:00.000Z");

  it("reads the summary and only the kinds asked for", async () => {
    const calls = stubFetch({
      "/characters/42": { status: 200, body: { id: 42, name: "Tome Lister", server: "Aegis" } },
      "/characters/42/mounts/owned": { status: 200, body: [{ id: 208 }, { id: 1 }] },
      "/characters/42/bardings/owned": { status: 200, body: [{ id: 78 }] },
    });
    const result = await fetchOwned("42", ["mount", "barding"], now);
    expect(calls).toHaveLength(3);
    expect(result).toEqual({
      characterId: "42",
      name: "Tome Lister",
      server: "Aegis",
      owned: ["mount:208", "mount:1", "barding:78"],
      fetchedAt: now.toISOString(),
    });
    expect(ownedKey({ kind: "mount", id: 208 })).toBe("mount:208");
  });

  it("reports an unknown character", async () => {
    stubFetch({ "/characters/42": { status: 404, body: { status: 404, error: "Not found" } } });
    await expect(fetchOwned("42", ["mount"], now)).rejects.toEqual(new CollectError("not-found"));
  });

  it("reports a private collection", async () => {
    stubFetch({
      "/characters/42": { status: 200, body: { id: 42, name: "A", server: "B" } },
      "/characters/42/mounts/owned": { status: 403, body: { status: 403, error: "Collection is set to private" } },
    });
    await expect(fetchOwned("42", ["mount"], now)).rejects.toEqual(new CollectError("private"));
  });

  it("reports the service as unavailable on network or server errors", async () => {
    stubFetch({ "/characters/42": new TypeError("Failed to fetch") });
    await expect(fetchOwned("42", ["mount"], now)).rejects.toEqual(new CollectError("unavailable"));
    stubFetch({ "/characters/42": { status: 502, body: {} } });
    await expect(fetchOwned("42", ["mount"], now)).rejects.toEqual(new CollectError("unavailable"));
  });
});
