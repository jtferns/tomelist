import { RouterProvider } from "@tanstack/react-router";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
});

describe("PlannerPage", () => {
  it("renders minimog picks and weeklies from real event data with fresh progress", async () => {
    await renderPlanner();
    expect(screen.getByTestId("pick-obj-minimog-fishing")).toBeInTheDocument();
    expect(screen.getByTestId("weekly-obj-weekly-random")).toBeInTheDocument();
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
});
