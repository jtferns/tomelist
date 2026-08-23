import { RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { getEvent } from "@/lib/events";
import { useAppStore } from "@/store/useAppStore";
import { createAppRouter } from "@/router";

const E = "2026-03-mogmog-collection";

async function renderAt(tab: string) {
  const router = createAppRouter();
  await router.navigate({ to: `/$eventId/${tab}`, params: { eventId: E } });
  render(<RouterProvider router={router} />);
  await screen.findByTestId(`${tab}-page`);
  return router;
}

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ events: {} });
});

describe("ProgressHud", () => {
  it("shows wallet count and goal hint on every tab, including objectives", async () => {
    useAppStore.getState().addTomestones(E, 30);
    await renderAt("objectives");
    expect(screen.getByTestId("hud-count")).toHaveTextContent("30");
    expect(screen.queryByTestId("hud-total")).not.toBeInTheDocument();
    expect(
      screen.getByText("No goal yet — wishlist exchanges to set one"),
    ).toBeInTheDocument();
  });

  it("shows progress toward the wishlist total", async () => {
    useAppStore.getState().addTomestones(E, 25);
    useAppStore.getState().toggleWishlist(E, "fat-cat-parasol"); // 50 tomes
    await renderAt("overview");
    expect(screen.getByTestId("hud-count")).toHaveTextContent("25");
    expect(screen.getByTestId("hud-total")).toHaveTextContent("50");
    expect(screen.getByTestId("hud-pct")).toHaveTextContent("50%");
    expect(screen.getByTestId("hud-bar")).toHaveStyle({ width: "50%" });
  });

  it("switches events keeping the current tab", async () => {
    const router = await renderAt("exchanges");
    await userEvent.click(screen.getByTestId("event-switcher-trigger"));
    await userEvent.click(screen.getByRole("option", { name: /mogmog collection/i }));
    expect(router.state.location.pathname).toBe(`/${E}/exchanges`);
  });

  it("shows the tomestone label and gold tabular-nums count", async () => {
    useAppStore.getState().addTomestones(E, 30);
    await renderAt("objectives");
    const event = getEvent(E);
    expect(screen.getByText(event!.tomestone.name)).toBeInTheDocument();
    const count = screen.getByTestId("hud-count");
    expect(count).toHaveTextContent("30");
    expect(count.className).toMatch(/tabular-nums/);
    expect(count.className).toMatch(/text-gold/);
  });

  it("shows the exact empty-goal copy and no percent span", async () => {
    useAppStore.getState().addTomestones(E, 30);
    await renderAt("objectives");
    expect(
      screen.getByText("No goal yet — wishlist exchanges to set one"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("hud-pct")).not.toBeInTheDocument();
  });

  it("clamps pct at 100 when tomestones exceed the total", async () => {
    useAppStore.getState().addTomestones(E, 999);
    useAppStore.getState().toggleWishlist(E, "fat-cat-parasol"); // 50 tomes
    await renderAt("overview");
    expect(screen.getByTestId("hud-pct")).toHaveTextContent("100%");
    expect(screen.getByTestId("hud-bar")).toHaveStyle({ width: "100%" });
  });

  it("renders without an img when the event has no tomestone icon", async () => {
    const event = getEvent(E);
    const originalIcon = event!.tomestone.icon;
    event!.tomestone.icon = undefined;
    try {
      useAppStore.getState().addTomestones(E, 10);
      await renderAt("objectives");
      expect(screen.getByTestId("hud-count")).toHaveTextContent("10");
      const link = screen.getByLabelText("Open wallet on Overview");
      expect(link.querySelector("img")).not.toBeInTheDocument();
    } finally {
      event!.tomestone.icon = originalIcon;
    }
  });
});
