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
  it("an unknown event id links back to the current event", async () => {
    const router = createAppRouter();
    await router.navigate({ to: "/$eventId/overview", params: { eventId: "no-such-event" } });
    render(<RouterProvider router={router} />);
    const page = await screen.findByTestId("overview-page");
    expect(page).toHaveTextContent("This event isn't in Tomelist.");
  });

  it("has no token stepper for an event without a token", async () => {
    await renderOverview();
    expect(screen.queryByTestId("token-count")).not.toBeInTheDocument();
  });

  it("token stepper edits the token balance by hand and floors at 0", async () => {
    const A = "2026-09-astronomy-first-hunt";
    const router = createAppRouter();
    await router.navigate({ to: "/$eventId/overview", params: { eventId: A } });
    render(<RouterProvider router={router} />);
    await screen.findByTestId("overview-page");
    await userEvent.click(screen.getByRole("button", { name: "Add 1 Uolon Horn Token" }));
    await userEvent.click(screen.getByRole("button", { name: "Add 1 Uolon Horn Token" }));
    expect(useAppStore.getState().events[A]?.tokens).toBe(2);
    await userEvent.click(screen.getByRole("button", { name: "Subtract 1 Uolon Horn Token" }));
    await userEvent.click(screen.getByRole("button", { name: "Subtract 1 Uolon Horn Token" }));
    await userEvent.click(screen.getByRole("button", { name: "Subtract 1 Uolon Horn Token" }));
    expect(useAppStore.getState().events[A]?.tokens).toBe(0);
  });

  it("lets a new player tick the wallet step while starting at 0 tomes", async () => {
    await renderOverview();
    const card = screen.getByTestId("first-run");
    const firstStep = card.querySelectorAll("li")[0];
    expect(firstStep).toHaveAttribute("data-done", "false");
    await userEvent.click(screen.getByRole("button", { name: "start at 0" }));
    expect(firstStep).toHaveAttribute("data-done", "true");
    expect(useAppStore.getState().events[E]?.tomestones).toBe(0);
  });
});
