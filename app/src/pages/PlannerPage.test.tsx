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

  it("clicking a pick's Did it button increments wallet and removes it from suggestions", async () => {
    await renderPlanner();
    const pick = screen.getByTestId("pick-obj-minimog-fishing");
    await userEvent.click(within(pick).getByRole("button", { name: "Did it" }));
    expect(useAppStore.getState().events[E]?.tomestones).toBe(20);
    expect(screen.queryByTestId("pick-obj-minimog-fishing")).not.toBeInTheDocument();
    expect(screen.getByText("Both picks used this week.")).toBeInTheDocument();
  });

  it("shows the no-end-date pace message for this event", async () => {
    await renderPlanner();
    expect(screen.getByTestId("pace-line")).toHaveTextContent("No end date — no weekly target.");
  });

  it("renders the exact merged no-target pace copy", async () => {
    await renderPlanner();
    expect(screen.getByTestId("pace-line")).toHaveTextContent(
      "No end date — no weekly target. Earned 0 this week."
    );
  });

  it("clicking a minimog Did-it calls recordObjective and raises the tomestone count by its points", async () => {
    useAppStore.setState({
      events: { [E]: { ...emptyEventProgress(), tomestones: 5 } },
    });
    await renderPlanner();
    const pick = screen.getByTestId("pick-obj-minimog-fishing");
    await userEvent.click(within(pick).getByRole("button", { name: "Did it" }));
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
    expect(within(claimedRow).queryByRole("button", { name: "Did it" })).not.toBeInTheDocument();

    const openRow = screen.getByTestId("weekly-obj-weekly-second");
    expect(within(openRow).getByRole("button", { name: "Did it" })).toBeInTheDocument();
    expect(within(openRow).queryByText("Claimed")).not.toBeInTheDocument();
  });
});
