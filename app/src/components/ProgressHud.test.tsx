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
  it("shows wallet count and a Set a goal link on every tab, including objectives", async () => {
    useAppStore.getState().addTomestones(E, 30);
    await renderAt("objectives");
    expect(screen.getByTestId("hud-count")).toHaveTextContent("30");
    expect(screen.queryByTestId("hud-total")).not.toBeInTheDocument();
    expect(screen.getByTestId("hud-set-goal")).toHaveAttribute("href", `/${E}/exchanges`);
  });

  it("shows progress toward the wishlist total", async () => {
    useAppStore.getState().addTomestones(E, 25);
    useAppStore.getState().toggleWishlist(E, "fat-cat-parasol"); // 50 tomes
    await renderAt("overview");
    expect(screen.getByTestId("hud-count")).toHaveTextContent("25");
    expect(screen.getByTestId("hud-total")).toHaveTextContent("50");
    expect(screen.getByTestId("hud-bar")).toHaveStyle({ transform: "scaleX(0.5)" });
  });

  it("switches events keeping the current tab", async () => {
    const router = await renderAt("exchanges");
    await userEvent.click(screen.getByTestId("event-switcher-trigger"));
    await userEvent.click(screen.getByRole("option", { name: /mogmog collection/i }));
    expect(router.state.location.pathname).toBe(`/${E}/exchanges`);
  });

  it("names the tomestone on the wallet link and shows a gold tabular-nums count", async () => {
    useAppStore.getState().addTomestones(E, 30);
    await renderAt("objectives");
    const event = getEvent(E);
    expect(screen.getByLabelText(new RegExp(event!.tomestone.name))).toBeInTheDocument();
    const count = screen.getByTestId("hud-count");
    expect(count).toHaveTextContent("30");
    expect(count.className).toMatch(/tabular-nums/);
    expect(count.className).toMatch(/text-gold/);
  });

  it("clamps the bar at full when tomestones exceed the total", async () => {
    useAppStore.getState().addTomestones(E, 999);
    useAppStore.getState().toggleWishlist(E, "fat-cat-parasol"); // 50 tomes
    await renderAt("overview");
    expect(screen.getByTestId("hud-bar")).toHaveStyle({ transform: "scaleX(1)" });
  });

  it("renders without an img when the event has no tomestone icon", async () => {
    const event = getEvent(E);
    const originalIcon = event!.tomestone.icon;
    event!.tomestone.icon = undefined;
    try {
      useAppStore.getState().addTomestones(E, 10);
      await renderAt("objectives");
      expect(screen.getByTestId("hud-count")).toHaveTextContent("10");
      const link = screen.getByLabelText(/open wallet on Overview/);
      expect(link.querySelector("img")).not.toBeInTheDocument();
    } finally {
      event!.tomestone.icon = originalIcon;
    }
  });
});
