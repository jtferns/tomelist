import { beforeEach, describe, expect, it } from "vitest";
import { setFavicon } from "./favicon";

beforeEach(() => {
  document.querySelectorAll('link[rel="icon"]').forEach((l) => l.remove());
});

describe("setFavicon", () => {
  it("creates the icon link when missing", () => {
    setFavicon("/tomes/a.png");
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    expect(link?.getAttribute("href")).toBe("/tomes/a.png");
    expect(link?.type).toBe("image/png");
  });
  it("updates an existing icon link in place", () => {
    setFavicon("/tomes/a.png");
    setFavicon("/tomes/b.png");
    const links = document.querySelectorAll('link[rel="icon"]');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("/tomes/b.png");
  });
});
