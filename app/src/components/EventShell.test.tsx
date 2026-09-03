import { RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createAppRouter } from "@/router";
import { useAppStore } from "@/store/useAppStore";

const E = "2026-03-mogmog-collection";

async function renderAt(eventId: string, tab: string) {
  const router = createAppRouter();
  await router.navigate({ to: `/$eventId/${tab}`, params: { eventId } });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ events: {} });
});

describe("EventShell", () => {
  it("renders the TOMELIST wordmark and it is not a link", async () => {
    await renderAt(E, "overview");
    await screen.findByTestId("overview-page");
    const wordmark = screen.getByText("TOMELIST");
    expect(wordmark.closest("a")).toBeNull();
  });

  it("renders 5 desktop text links and 5 mobile tab links with correct hrefs", async () => {
    await renderAt(E, "overview");
    await screen.findByTestId("overview-page");
    const navs = screen.getAllByRole("navigation");
    const links = navs.flatMap((nav) => Array.from(nav.querySelectorAll("a")));
    // 5 desktop + 5 mobile = 10
    expect(links).toHaveLength(10);
    for (const link of links) {
      expect(link.getAttribute("href")).toContain(E);
    }
  });

  it("marks the active route link with aria-current or active class", async () => {
    await renderAt(E, "objectives");
    await screen.findByTestId("objectives-page");
    const links = screen.getAllByRole("link", { name: /objectives/i });
    const active = links.filter(
      (l) => l.getAttribute("aria-current") === "page" || l.classList.contains("active")
    );
    expect(active.length).toBeGreaterThan(0);
  });

  it("aligns the desktop header gutter to the content column (px-4)", async () => {
    await renderAt(E, "overview");
    await screen.findByTestId("overview-page");
    const desktopNav = screen
      .getAllByRole("navigation")
      .find((nav) => nav.className.includes("top-0"));
    const inner = desktopNav?.firstElementChild;
    expect(inner?.className).toMatch(/(^|\s)px-4(\s|$)/);
  });

  it("hides the brand Diamond from accessibility tree", async () => {
    await renderAt(E, "overview");
    await screen.findByTestId("overview-page");
    const diamonds = document.querySelectorAll('[data-slot="diamond"]');
    expect(diamonds.length).toBeGreaterThan(0);
    diamonds.forEach((d) => expect(d.getAttribute("aria-hidden")).toBe("true"));
  });

  it("does not crash for an unknown eventId and still shows nav", async () => {
    await renderAt("unknown-event", "overview");
    await screen.findByTestId("overview-page");
    expect(screen.getAllByRole("link").length).toBeGreaterThan(0);
  });
});
