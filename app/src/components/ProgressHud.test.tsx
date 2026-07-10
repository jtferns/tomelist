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

describe("ProgressHud", () => {
  it("shows wallet count and goal hint on every tab, including objectives", async () => {
    useAppStore.getState().addTomestones(E, 30);
    await renderAt("objectives");
    expect(screen.getByTestId("hud-count")).toHaveTextContent("30");
    expect(screen.queryByTestId("hud-total")).not.toBeInTheDocument();
    expect(screen.getByText(/pick exchanges to set a goal/i)).toBeInTheDocument();
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
});
