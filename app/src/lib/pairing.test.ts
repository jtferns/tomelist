import { describe, expect, it } from "vitest";
import { generateSyncToken, pairingUrl, readPairingHash, takePairingLink } from "./pairing";

describe("pairing", () => {
  it("generates distinct 22-char base64url tokens", () => {
    const a = generateSyncToken();
    const b = generateSyncToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(b).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(a).not.toBe(b);
  });

  it("builds a fragment link so the token never reaches the server", () => {
    expect(pairingUrl("https://tomelist.example", "AAAAAAAAAAAAAAAAAAAAAA")).toBe(
      "https://tomelist.example/#sync=AAAAAAAAAAAAAAAAAAAAAA"
    );
  });

  it("reads a token from the hash and rejects anything else", () => {
    expect(readPairingHash("#sync=AAAAAAAAAAAAAAAAAAAAAA")).toBe("AAAAAAAAAAAAAAAAAAAAAA");
    for (const hash of ["", "#", "#sync=", "#sync=short", "#other=AAAAAAAAAAAAAAAAAAAAAA", "#sync=AAAAAAAAAAAAAAAAAAAAA="]) {
      expect(readPairingHash(hash)).toBeNull();
    }
  });
});

describe("takePairingLink", () => {
  it("returns the token and strips the fragment, keeping the path", () => {
    history.replaceState(null, "", "/some/path?x=1#sync=AAAAAAAAAAAAAAAAAAAAAA");
    expect(takePairingLink()).toBe("AAAAAAAAAAAAAAAAAAAAAA");
    expect(location.hash).toBe("");
    expect(location.pathname + location.search).toBe("/some/path?x=1");
  });

  it("leaves unrelated fragments alone", () => {
    history.replaceState(null, "", "/#other");
    expect(takePairingLink()).toBeNull();
    expect(location.hash).toBe("#other");
  });
});
