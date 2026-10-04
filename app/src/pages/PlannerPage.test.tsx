import { RouterProvider } from "@tanstack/react-router";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { emptyEventProgress } from "@tomelist/schema";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/store/useAppStore";
import { createAppRouter } from "@/router";

const E = "2026-03-mogmog-collection";

async function renderPlanner() {
  const router = createAppRouter();
  // Navigate before mounting to avoid racing the index route's beforeLoad
  // redirect.
  await router.navigate({ to: "/$eventId/planner", params: { eventId: E } });
  render(<RouterProvider router={router} />);
  await screen.findByTestId("planner-page");
}

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ events: {} });
});

afterEach(() => {
  vi.useRealTimers();
  vi.doUnmock("@/lib/optimizer");
  vi.resetModules();
});

describe("PlannerPage", () => {
  it("renders minimog picks and weeklies from real event data with fresh progress", async () => {
    await renderPlanner();
    expect(screen.getByTestId("pick-obj-minimog-fishing")).toBeInTheDocument();
    expect(screen.getByTestId("weekly-obj-weekly-random")).toBeInTheDocument();
  });

  it("renders Minimog picks and Weeklies section headers as h2 landmarks", async () => {
    await renderPlanner();
    expect(screen.getByRole("heading", { level: 2, name: /Minimog picks/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /Weeklies/i })).toBeInTheDocument();
  });

  it("clicking a pick's Log clear button increments wallet and removes it from suggestions", async () => {
    await renderPlanner();
    const pick = screen.getByTestId("pick-obj-minimog-fishing");
    await userEvent.click(within(pick).getByRole("button", { name: "Log clear" }));
    expect(useAppStore.getState().events[E]?.tomestones).toBe(20);
    expect(screen.queryByTestId("pick-obj-minimog-fishing")).not.toBeInTheDocument();
    expect(screen.getByText(/Both picks used this week/)).toBeInTheDocument();
  });

  it("shows the no-target pace message for this event", async () => {
    await renderPlanner();
    expect(screen.getByTestId("pace-line")).toHaveTextContent("No weekly target yet.");
  });

  it("renders the exact no-target pace copy", async () => {
    await renderPlanner();
    expect(screen.getByTestId("pace-line")).toHaveTextContent(
      "No weekly target yet. Earned 0 this week."
    );
  });

  it("clicking a minimog Did-it calls recordObjective and raises the tomestone count by its points", async () => {
    useAppStore.setState({
      events: { [E]: { ...emptyEventProgress(), tomestones: 5 } },
    });
    await renderPlanner();
    const pick = screen.getByTestId("pick-obj-minimog-fishing");
    await userEvent.click(within(pick).getByRole("button", { name: "Log clear" }));
    expect(useAppStore.getState().events[E]?.tomestones).toBe(25);
  });

  it("shows Claimed badge (no button) for a done weekly and the action button for one not done, in the same render", async () => {
    vi.doMock("@/lib/optimizer", async () => {
      const actual = await vi.importActual<typeof import("@/lib/optimizer")>("@/lib/optimizer");
      return {
        ...actual,
        weeklyPlan: (...args: Parameters<typeof actual.weeklyPlan>) => {
          const plan = actual.weeklyPlan(...args);
          return {
            ...plan,
            weeklies: [
              { objective: plan.weeklies[0]!.objective, doneThisWeek: true },
              {
                objective: { ...plan.weeklies[0]!.objective, id: "obj-weekly-second" },
                doneThisWeek: false,
              },
            ],
          };
        },
      };
    });
    vi.resetModules();
    const { createAppRouter: freshCreateAppRouter } = await import("@/router");
    const router = freshCreateAppRouter();
    await router.navigate({ to: "/$eventId/planner", params: { eventId: E } });
    const { RouterProvider: FreshRouterProvider } = await import("@tanstack/react-router");
    render(<FreshRouterProvider router={router} />);
    await screen.findByTestId("planner-page");

    const claimedRow = screen.getByTestId("weekly-obj-weekly-random");
    expect(within(claimedRow).getByText("Claimed")).toBeInTheDocument();
    expect(within(claimedRow).queryByRole("button", { name: "Log clear" })).not.toBeInTheDocument();

    const openRow = screen.getByTestId("weekly-obj-weekly-second");
    expect(within(openRow).getByRole("button", { name: "Log clear" })).toBeInTheDocument();
    expect(within(openRow).queryByText("Claimed")).not.toBeInTheDocument();
  });

  it("names the current week and shows only that week's minimog for a week-tagged event", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
    const router = createAppRouter();
    await router.navigate({ to: "/$eventId/planner", params: { eventId: "2026-09-astronomy-first-hunt" } });
    render(<RouterProvider router={router} />);
    await screen.findByTestId("planner-page");
    expect(screen.getByRole("heading", { level: 2, name: /Week 4 of 6/ })).toBeInTheDocument();
    expect(screen.getByTestId("pick-obj-minimog-w4")).toBeInTheDocument();
    expect(screen.queryByTestId("pick-obj-minimog-w1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pick-obj-minimog-w5")).not.toBeInTheDocument();
  });

  it("says the goal is covered instead of 'need ~0' when the wallet covers the Must-haves", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-20T12:00:00Z"));
    useAppStore.setState({
      events: {
        [E]: {
          ...emptyEventProgress(),
          tomestones: 1000,
          wishlist: { "fat-cat-parasol": { status: "wanted", tier: "must", quantity: 1 } },
        },
      },
    });
    await renderPlanner();
    const line = screen.getByTestId("pace-line");
    expect(line).toHaveTextContent("You have enough for your Must-haves. Earned 0 this week.");
    expect(line).toHaveTextContent("Covered");
    expect(line).not.toHaveTextContent("need");
  });

  it("credits remaining one-time clears when they, not the wallet, cover the Must-haves", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-20T12:00:00Z"));
    useAppStore.setState({
      events: {
        [E]: {
          ...emptyEventProgress(),
          wishlist: { "fat-cat-parasol": { status: "wanted", tier: "must", quantity: 1 } },
        },
      },
    });
    await renderPlanner();
    expect(screen.getByTestId("pace-line")).toHaveTextContent(
      "The one-time clears you have left cover your Must-haves."
    );
  });

  async function renderAstronomyPlanner(progress: Partial<ReturnType<typeof emptyEventProgress>>) {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
    const A = "2026-09-astronomy-first-hunt";
    useAppStore.setState({
      events: {
        [A]: {
          ...emptyEventProgress(),
          wishlist: { "uolon-horn": { status: "wanted", tier: "must", quantity: 1 } },
          ...progress,
        },
      },
    });
    const router = createAppRouter();
    await router.navigate({ to: "/$eventId/planner", params: { eventId: A } });
    render(<RouterProvider router={router} />);
    await screen.findByTestId("planner-page");
  }

  it("shows tokens left to earn when the Must-have token goal is reachable", async () => {
    await renderAstronomyPlanner({ tomestones: 500, tokens: 4 });
    expect(screen.getByTestId("token-line")).toHaveTextContent("Tokens: 4 of 10. 8 left to earn.");
    expect(screen.getByTestId("pace-line")).toHaveTextContent("The clears you have left cover your Must-haves.");
  });

  it("warns when too few tokens are left and does not call the goal covered", async () => {
    await renderAstronomyPlanner({ tomestones: 500, tokens: 1 });
    expect(screen.getByTestId("token-line")).toHaveTextContent(
      "Tokens: 1 of 10. Only 8 left to earn, so the Must-haves can't all be reached."
    );
    expect(screen.getByTestId("pace-line")).toHaveTextContent("Tomes for your Must-haves are covered.");
    expect(screen.getByTestId("pace-line")).not.toHaveTextContent("Covered");
  });

  it("says you have enough once both tomes and tokens are in hand", async () => {
    await renderAstronomyPlanner({ tomestones: 500, tokens: 10 });
    expect(screen.getByTestId("token-line")).toHaveTextContent("Tokens: 10 of 10.");
    expect(screen.getByTestId("pace-line")).toHaveTextContent("You have enough for your Must-haves.");
  });

  it("has no token line for an event without a token", async () => {
    await renderPlanner();
    expect(screen.queryByTestId("token-line")).not.toBeInTheDocument();
  });
});
