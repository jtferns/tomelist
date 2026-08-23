import { RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
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

describe("EventSwitcher", () => {
  it("stays on the planner tab when switching events from planner", async () => {
    const router = await renderAt("planner");
    await userEvent.click(screen.getByTestId("event-switcher-trigger"));
    await userEvent.click(screen.getByRole("option", { name: /mogmog collection/i }));
    expect(router.state.location.pathname).toBe(`/${E}/planner`);
  });

  it("falls back to overview when the current path has no known tab segment", async () => {
    const router = createAppRouter();
    await router.navigate({ to: "/$eventId", params: { eventId: E } });
    render(<RouterProvider router={router} />);
    await screen.findByTestId("event-switcher-trigger");
    await userEvent.click(screen.getByTestId("event-switcher-trigger"));
    await userEvent.click(screen.getByRole("option", { name: /mogmog collection/i }));
    expect(router.state.location.pathname).toBe(`/${E}/overview`);
  });
});
