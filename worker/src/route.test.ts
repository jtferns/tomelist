import { describe, expect, it } from "vitest";
import { routeApi } from "./route";

const token = "AAAAAAAAAAAAAAAAAAAAAA";

describe("routeApi", () => {
  it("matches a sync path with a 22-char base64url token", () => {
    expect(routeApi("/api/sync/" + token)).toEqual({ kind: "sync", token });
    const mixed = "abc-_DEF0123456789xyzA";
    expect(routeApi("/api/sync/" + mixed)).toEqual({ kind: "sync", token: mixed });
  });

  it("rejects malformed tokens", () => {
    for (const bad of ["", "short", token + "A", token.slice(1) + "=", token.slice(1) + "/"]) {
      expect(routeApi("/api/sync/" + bad)).toEqual({ kind: "not-found" });
    }
  });

  it("rejects other api paths", () => {
    expect(routeApi("/api/other")).toEqual({ kind: "not-found" });
    expect(routeApi("/api/sync/" + token + "/extra")).toEqual({ kind: "not-found" });
  });
});
