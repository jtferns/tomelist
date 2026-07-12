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

describe("RunNext", () => {
  it("shows the top 3 ranked objectives for the real event data", async () => {
    await renderOverview();
    const card = screen.getByTestId("run-next");
    // Highest score is the one-time ultimog (50/1), then the weekly (30/2=15), then the
    // minimog-fishing (20/4=5) which beats the tied-score dungeon/gates objectives on points.
    expect(card).toHaveTextContent("Ultimog: Complete the event quest");
    expect(card).toHaveTextContent("Weekly objective (randomly assigned)");
    expect(card).toHaveTextContent("Minimog: Ocean fishing voyage");
  });

  it("shows the hint when a must-tier wanted item is seeded and the wallet is short", async () => {
    const progress = emptyEventProgress();
    progress.tomestones = 0;
    progress.wishlist[EXCHANGE_ID] = { status: "wanted", tier: "must", quantity: 1 };
    useAppStore.setState({ events: { [E]: progress } });

    await renderOverview();
    const hint = screen.getByTestId("runs-to-goal");
    expect(hint).toHaveTextContent(/runs to reach your Must goal|Weekly income can't reach/);
  });

  it("does not show the hint when the wishlist has no must-tier cost", async () => {
    await renderOverview();
    expect(screen.queryByTestId("runs-to-goal")).not.toBeInTheDocument();
  });
});
