import { RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/store/useAppStore";
import { createAppRouter } from "@/router";

const E = "2026-03-mogmog-collection";

async function renderOverview() {
  const router = createAppRouter();
  // Navigate before mounting to avoid racing the index route's beforeLoad
  // redirect (see ObjectivesPage.test.tsx for the full explanation). This
  // route happens to share its destination with that redirect so the race
  // wasn't observable here, but resolving navigation first is the safe,
  // order-independent pattern.
  await router.navigate({ to: "/$eventId/overview", params: { eventId: E } });
  render(<RouterProvider router={router} />);
  await screen.findByTestId("overview-page");
}

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ events: {} });
});

describe("OverviewPage", () => {
  it("shows the wallet and event name", async () => {
    await renderOverview();
    expect(screen.getAllByText(/Mogmog Collection/).length).toBeGreaterThan(0);
    expect(screen.getByTestId("wallet-count")).toHaveTextContent("0");
  });
  it("steppers adjust the wallet", async () => {
    await renderOverview();
    await userEvent.click(screen.getByRole("button", { name: "Add 10 tomestones" }));
    await userEvent.click(screen.getByRole("button", { name: "Add 1 tomestone" }));
    expect(screen.getByTestId("wallet-count")).toHaveTextContent("11");
    await userEvent.click(screen.getByRole("button", { name: "Subtract 1 tomestone" }));
    expect(screen.getByTestId("wallet-count")).toHaveTextContent("10");
  });
  it("puts Run Next first once getting started is done, with a link to the full plan", async () => {
    useAppStore.getState().addTomestones(E, 10);
    useAppStore.getState().toggleWishlist(E, "fat-cat-parasol");
    useAppStore.getState().recordObjective(E, "obj-ultimog-msq", 50);
    await renderOverview();
    expect(screen.queryByTestId("first-run")).not.toBeInTheDocument();
    const page = screen.getByTestId("overview-page");
    expect(page.firstElementChild).toBe(screen.getByTestId("run-next"));
    expect(screen.getByTestId("see-full-plan")).toHaveAttribute("href", `/${E}/planner`);
  });
  it("shows a getting-started card to a new player and ticks steps off as they happen", async () => {
    await renderOverview();
    const card = screen.getByTestId("first-run");
    expect(card.querySelectorAll('[data-done="true"]')).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "Add 10 tomestones" }));
    expect(card.querySelectorAll('[data-done="true"]')).toHaveLength(1);
  });
  it("says what the wallet is saving for, or points to Exchanges when nothing is wanted", async () => {
    await renderOverview();
    expect(screen.getByTestId("saving-for")).toHaveTextContent("No goal yet. Pick items on Exchanges");
    useAppStore.getState().toggleWishlist(E, "fat-cat-parasol");
    expect(await screen.findByText(/Saving for Fat Cat Parasol/)).toBeInTheDocument();
  });
});
