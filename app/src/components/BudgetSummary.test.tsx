import { RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { emptyEventProgress } from "@tomelist/schema";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

afterEach(() => {
  vi.useRealTimers();
});

describe("BudgetSummary", () => {
  it("shows a hint when the wishlist is empty", async () => {
    await renderOverview();
    const summary = screen.getByTestId("budget-summary");
    expect(summary).toHaveTextContent("Nothing wishlisted yet.");
  });

  it("renders a Browse exchanges link to this event's exchanges route when empty", async () => {
    await renderOverview();
    const link = screen.getByRole("link", { name: /Browse exchanges/ });
    expect(link).toHaveAttribute("href", expect.stringContaining(`/${E}/exchanges`));
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
    // The Astronomy event still has runway (future end date + weekly income), so
    // an unaffordable Must item yields a weeks-needed verdict, not "Out of reach".
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
    const futureEvent = "2026-09-astronomy-first-hunt";
    const progress = emptyEventProgress();
    progress.tomestones = 0;
    progress.wishlist["mameshiba-neckerchief"] = { status: "wanted", tier: "must", quantity: 1 };
    useAppStore.setState({ events: { [futureEvent]: progress } });

    const router = createAppRouter();
    await router.navigate({ to: "/$eventId/overview", params: { eventId: futureEvent } });
    render(<RouterProvider router={router} />);
    await screen.findByTestId("overview-page");

    const row = screen.getByTestId("budget-tier-must");
    expect(row).toHaveTextContent(/~\d+ wk/);
  });

  it("marks a token item out of reach when too few tokens are left to earn", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
    const futureEvent = "2026-09-astronomy-first-hunt";
    const progress = emptyEventProgress();
    progress.tomestones = 500;
    progress.wishlist["uolon-horn"] = { status: "wanted", tier: "must", quantity: 1 };
    useAppStore.setState({ events: { [futureEvent]: progress } });

    const router = createAppRouter();
    await router.navigate({ to: "/$eventId/overview", params: { eventId: futureEvent } });
    render(<RouterProvider router={router} />);
    await screen.findByTestId("overview-page");

    expect(screen.getByTestId("budget-tier-must")).toHaveTextContent("Out of reach");
  });

  it("shows the tier's token cost and how many tokens are still needed", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
    const futureEvent = "2026-09-astronomy-first-hunt";
    const progress = emptyEventProgress();
    progress.tomestones = 120;
    progress.tokens = 4;
    progress.wishlist["uolon-horn"] = { status: "wanted", tier: "must", quantity: 1 };
    useAppStore.setState({ events: { [futureEvent]: progress } });

    const router = createAppRouter();
    await router.navigate({ to: "/$eventId/overview", params: { eventId: futureEvent } });
    render(<RouterProvider router={router} />);
    await screen.findByTestId("overview-page");

    expect(screen.getByTestId("budget-tokens-must")).toHaveTextContent("+ 10 tokens");
    expect(screen.getByTestId("budget-tier-must")).toHaveTextContent("6 tokens to go");
  });

  it("notes items friends are covering, which the tiers leave out", async () => {
    const progress = emptyEventProgress();
    progress.wishlist[EXCHANGE_ID] = { status: "wanted", tier: "must", quantity: 1 };
    progress.wishlist["fat-cat-parasol"] = { status: "covering", tier: "must", quantity: 1 };
    useAppStore.setState({ events: { [E]: progress } });
    await renderOverview();
    expect(screen.getByTestId("budget-covered")).toHaveTextContent("1 item a friend is covering, not counted here.");
    expect(screen.getByTestId("budget-tier-must")).toHaveTextContent(String(COST));
  });
});
