import { RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { emptyEventProgress } from "@tomelist/schema";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/store/useAppStore";
import { createAppRouter } from "@/router";

const E = "2026-03-mogmog-collection";
const EXCHANGE_ID = "miners-earring";
const COST = 100;

async function renderOverview() {
  const router = createAppRouter();
  await router.navigate({ to: "/$eventId/overview", params: { eventId: E } });
  render(<RouterProvider router={router} />);
  await screen.findByTestId("overview-page");
}

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ events: {} });
});

describe("BudgetSummary", () => {
  it("shows a hint when the wishlist is empty", async () => {
    await renderOverview();
    const summary = screen.getByTestId("budget-summary");
    expect(summary).toHaveTextContent("Add items to your wishlist to see affordability.");
  });

  it("shows Affordable now when the wallet covers a wanted item", async () => {
    const progress = emptyEventProgress();
    progress.tomestones = COST;
    progress.wishlist[EXCHANGE_ID] = { status: "wanted", tier: "must", quantity: 1 };
    useAppStore.setState({ events: { [E]: progress } });

    await renderOverview();
    const row = screen.getByTestId("budget-tier-must");
    expect(row).toHaveTextContent("Affordable now");
  });

  it("shows a weeks-needed estimate when the wallet can't cover a wanted item yet", async () => {
    const progress = emptyEventProgress();
    progress.tomestones = 0;
    progress.wishlist[EXCHANGE_ID] = { status: "wanted", tier: "must", quantity: 1 };
    useAppStore.setState({ events: { [E]: progress } });

    await renderOverview();
    const row = screen.getByTestId("budget-tier-must");
    // Event has no fixed end date, so weeklyRate income yields a weeks-needed
    // verdict rather than a definitive "Out of reach".
    expect(row).toHaveTextContent("~1 wk");
  });
});
