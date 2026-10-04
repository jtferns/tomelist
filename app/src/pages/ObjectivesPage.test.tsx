import { RouterProvider } from "@tanstack/react-router";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/store/useAppStore";
import { createAppRouter } from "@/router";

const E = "2026-03-mogmog-collection";

async function renderObjectives() {
  const router = createAppRouter();
  // Navigate before mounting: mounting with the router still at its default
  // "/" location triggers the index route's beforeLoad redirect (to
  // /$eventId/overview), which races the explicit navigate() below and can
  // clobber it back to the overview route. Resolving navigation first avoids
  // the race entirely (mirrors the passing pattern in router.test.tsx).
  await router.navigate({ to: "/$eventId/objectives", params: { eventId: E } });
  render(<RouterProvider router={router} />);
  await screen.findByTestId("objectives-page");
}

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ events: {} });
});

describe("ObjectivesPage", () => {
  it("renders kind group headers", async () => {
    await renderObjectives();
    expect(screen.getByText(/Standard Objectives/i)).toBeInTheDocument();
    expect(screen.getByText(/Ultimog Challenges/i)).toBeInTheDocument();
  });

  it("renders kind group headers as h2 landmarks", async () => {
    await renderObjectives();
    expect(screen.getByRole("heading", { level: 2, name: /Standard Objectives/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /Ultimog Challenges/i })).toBeInTheDocument();
  });
  it("did-it increments count and wallet", async () => {
    await renderObjectives();
    const row = screen.getByTestId("objective-obj-moogle-dungeons");
    await userEvent.click(within(row).getByRole("button", { name: /log clear/i }));
    expect(useAppStore.getState().getProgress(E).tomestones).toBe(10);
    expect(within(row).getByTestId("objective-count")).toHaveTextContent("1");
  });
  it("one-time objective disables after completion", async () => {
    await renderObjectives();
    const row = screen.getByTestId("objective-obj-ultimog-msq");
    await userEvent.click(within(row).getByRole("button", { name: /log clear/i }));
    expect(within(row).getByRole("button", { name: /cleared/i })).toBeDisabled();
  });

  it("renders category filter chips for All + each category", async () => {
    await renderObjectives();
    const chips = screen.getByTestId("category-filters");
    expect(within(chips).getByTestId("filter-all")).toBeInTheDocument();
    for (const category of ["Dungeons", "GATEs", "Weekly", "Ocean Fishing", "Quests"]) {
      expect(within(chips).getByTestId(`filter-${category}`)).toBeInTheDocument();
    }
  });

  it("filtering by category shows only matching objectives, and All restores everything", async () => {
    await renderObjectives();
    await userEvent.click(screen.getByTestId("filter-Dungeons"));
    expect(screen.getByTestId("objective-obj-moogle-dungeons")).toBeInTheDocument();
    expect(screen.queryByTestId("objective-obj-gates")).not.toBeInTheDocument();
    expect(screen.queryByTestId("objective-obj-ultimog-msq")).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId("filter-all"));
    expect(screen.getByTestId("objective-obj-moogle-dungeons")).toBeInTheDocument();
    expect(screen.getByTestId("objective-obj-gates")).toBeInTheDocument();
    expect(screen.getByTestId("objective-obj-ultimog-msq")).toBeInTheDocument();
  });

  it("filter chips reflect aria-pressed state after a click", async () => {
    await renderObjectives();
    const allChip = screen.getByTestId("filter-all");
    const dungeonsChip = screen.getByTestId("filter-Dungeons");
    expect(allChip).toHaveAttribute("aria-pressed", "true");
    expect(dungeonsChip).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(dungeonsChip);
    expect(allChip).toHaveAttribute("aria-pressed", "false");
    expect(dungeonsChip).toHaveAttribute("aria-pressed", "true");
  });

  it("undo works after a non-repeatable objective is exhausted", async () => {
    await renderObjectives();
    const row = screen.getByTestId("objective-obj-ultimog-msq");
    await userEvent.click(within(row).getByRole("button", { name: /log clear/i }));
    const doneButton = within(row).getByRole("button", { name: /cleared/i });
    expect(doneButton).toBeDisabled();
    const undoButton = within(row).getByRole("button", { name: /undo/i });
    expect(undoButton).not.toBeDisabled();

    await userEvent.click(undoButton);
    expect(within(row).getByTestId("objective-count")).toHaveTextContent("0");
    expect(within(row).getByRole("button", { name: /undo/i })).toBeDisabled();
    expect(within(row).getByRole("button", { name: /log clear/i })).not.toBeDisabled();
  });

  it("filtering to a category with no objectives in a kind group skips that section", async () => {
    await renderObjectives();
    // Ultimog objectives only exist in the "Quests" category; filtering to
    // "Dungeons" should leave the Ultimog group empty and unrendered.
    await userEvent.click(screen.getByTestId("filter-Dungeons"));
    expect(screen.queryByText(/Ultimog Challenges/i)).not.toBeInTheDocument();
  });

  it("blocks undo and says why when the clear's tomes were spent", async () => {
    await renderObjectives();
    const row = screen.getByTestId("objective-obj-ultimog-msq");
    await userEvent.click(within(row).getByRole("button", { name: /log clear/i }));
    useAppStore.getState().addTomestones(E, -45);
    expect(await within(row).findByTestId("undo-blocked")).toHaveTextContent(
      "45 tomes from this clear already went to exchanges. Undo an exchange first."
    );
    expect(within(row).getByRole("button", { name: /undo/i })).toBeDisabled();
  });
});
